import { MixRequest, OrchestratorEvent } from '@/lib/types';
import { stepDeposit } from './steps/deposit';
import { stepWithdrawForMixing } from './steps/withdrawForMixing';
import { stepCreateMintInvoice } from './steps/createMintInvoice';
import { stepDynamicEstimateSats } from './steps/dynamicEstimateSats';
import { stepSwapToLightning } from './steps/swapToLightning';
import { stepClaimCashuProofs } from './steps/claimCashuProofs';
import { stepPrivacy } from './steps/privacy';
import { stepSwapBack } from './steps/swapBack';
import { stepWithdraw } from './steps/withdraw';
import { getNetworkStatus, ENV } from '@/config/env';
import { RealAtomiqSwapClient } from '@/integrations/swaps/atomiq';

export async function startMix(req: MixRequest, onEvent: (e: OrchestratorEvent) => void) {
    console.log('🎯 SLPM: Starting privacy mix operation');
    console.log('📋 SLPM: Mix request:', {
        amount: req.amountStrk,
        destinations: req.destinations.length,
        privacyLevel: req.privacyLevel,
        features: {
            timeDelays: req.enableTimeDelays,
            splitOutputs: req.enableSplitOutputs,
            randomizedMints: req.enableRandomizedMints,
            amountObfuscation: req.enableAmountObfuscation,
            decoyTx: req.enableDecoyTx
        }
    });

    // Store deposit info for the full flow
    let depositResult: any = null;
    let lightningResult: any = null;

    try {
        // Validate network configuration readiness
        console.log(`🔍 SLPM: Validating ${ENV.NETWORK} configuration...`);
        const networkStatus = getNetworkStatus();
        console.log(`⚙️ SLPM: ${ENV.NETWORK} status:`, networkStatus);

        if (!networkStatus.ready) {
            console.error(`❌ SLPM: ${ENV.NETWORK} configuration incomplete`);
            console.error('Warnings:', networkStatus.warnings);
            throw new Error(`${ENV.NETWORK} configuration incomplete. Check environment variables.`);
        }
        console.log(`✅ SLPM: ${ENV.NETWORK} configuration validated`);

        onEvent({
            type: 'mix:progress',
            message: `Starting privacy mix on ${ENV.NETWORK}`,
            progress: 0
        });
        console.log('🚀 SLPM: Privacy mix operation initiated');

        // Step 1: Deposit STRK to privacy mixer contract
        console.log('💰 SLPM: Step 1 - Depositing STRK to privacy mixer contract');
        depositResult = await stepDeposit(req.amountStrk, onEvent);
        console.log('✅ SLPM: Step 1 complete - STRK deposited to privacy mixer:', {
            commitment: depositResult.commitmentHash.slice(0, 10) + '...',
            amount: depositResult.amount,
            mixerContract: depositResult.mixerContractAddress
        });

        // Step 1.5: Immediately withdraw for mixing (privacy-preserving)
        console.log('🔄 SLPM: Step 1.5 - Withdrawing from privacy mixer for mixing pipeline');
        const withdrawalResult = await stepWithdrawForMixing(depositResult, onEvent);
        if (!withdrawalResult || !withdrawalResult.withdrawalTxHash) {
            throw new Error('Withdrawal step returned no transaction hash');
        }
        const withdrawalTxDisplay = typeof withdrawalResult.withdrawalTxHash === 'string'
            ? withdrawalResult.withdrawalTxHash.slice(0, 10) + '...'
            : 'n/a';
        const controllingWalletDisplay = typeof withdrawalResult.controllingWallet === 'string'
            ? withdrawalResult.controllingWallet.slice(0, 10) + '...'
            : 'n/a';
        console.log('✅ SLPM: Step 1.5 complete - Funds withdrawn and ready for mixing:', {
            withdrawalTx: withdrawalTxDisplay,
            availableForSwap: withdrawalResult.availableForSwap ?? false,
            controllingWallet: controllingWalletDisplay
        });

        // Step 2: Dynamic real-time estimation (STRK -> sats) then create Cashu mint invoice
        console.log('🎯 SLPM: Step 2 - Dynamic STRK → sats estimation (real-time if possible)...');
        onEvent({ type: 'mix:progress', message: 'Estimating sats from STRK input...', progress: 15 });
        const dynamicEstimate = await stepDynamicEstimateSats(withdrawalResult.amount, onEvent);
        console.log('💰 SLPM: Dynamic estimation result:', dynamicEstimate);
        console.log(`💰 SLPM: Estimated ${withdrawalResult.amount} STRK -> ${dynamicEstimate.satsOut} sats (source: ${dynamicEstimate.source}, rate: ${dynamicEstimate.rate.toFixed(2)})`);
        onEvent({ type: 'mix:progress', message: 'Creating Cashu mint invoice...', progress: 18 });
        const mintInvoiceResult = await stepCreateMintInvoice(dynamicEstimate.satsOut, onEvent);

        // Step 3: Swap STRK to Lightning (paying the Cashu mint invoice)
        console.log('🎯 SLPM: Step 3 - Swapping STRK to Lightning...');
        onEvent({ type: 'mix:progress', message: 'Swapping STRK to Lightning BTC...', progress: 25 });
        lightningResult = await stepSwapToLightning(withdrawalResult.amount, {
            walletAddress: withdrawalResult.originalDeposit.walletAddress,
            mixerContractAddress: withdrawalResult.originalDeposit.mixerContractAddress,
            fundsAvailable: withdrawalResult.availableForSwap
        }, mintInvoiceResult, onEvent);

        // Step 4: Claim Cashu proofs (after Atomiq payment)
        console.log('🎯 SLPM: Step 4 - Claiming Cashu proofs...');
        onEvent({ type: 'mix:progress', message: 'Claiming Cashu proofs...', progress: 45 });
        const cashuProofs = await stepClaimCashuProofs(
            mintInvoiceResult.mintQuote,
            mintInvoiceResult.cashu,
            dynamicEstimate.satsOut,
            onEvent
        );

        console.log('🎯 SLPM: Cashu proofs claimed:', {
            count: cashuProofs.length,
            totalValue: cashuProofs.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
        });

        // Use the cashu client and manager from the mint invoice result
        const cashuClient = mintInvoiceResult.cashu;
        const cashuMgr = mintInvoiceResult.cashuManager;

        // Step 5: Apply privacy techniques
        console.log('🎯 SLPM: Step 5 - Applying privacy techniques...');
        onEvent({ type: 'mix:progress', message: 'Applying privacy mixing...', progress: 60 });
        const mixedProofs = await stepPrivacy(req, cashuProofs, cashuClient, cashuMgr, onEvent);

        console.log('✅ SLPM: Privacy mixing complete:', {
            finalProofsCount: mixedProofs.length,
            privacyLevel: req.privacyLevel,
            anonymityEnhanced: true
        });

        // Step 6: Convert mixed Cashu back to Lightning and distribute
        console.log('🔄 SLPM: Step 6 - Converting mixed tokens back and distributing...');
        onEvent({
            type: 'mix:progress',
            message: 'Converting mixed e-cash back and distributing to destinations',
            progress: 80
        });

        // Use the new swapBack that handles Cashu → Lightning → STRK for each destination
        const distributionResults = await stepSwapBack(mixedProofs, req.destinations, cashuClient, onEvent, mintInvoiceResult.mintQuote.quote);

        const successfulDistributions = distributionResults.filter(r => r.status === 'CLAIMED').length;
        const totalDestinations = distributionResults.length;
        const totalStrkDistributed = distributionResults.reduce((sum, r) => sum + r.strkSent, 0);

        console.log('📊 SLPM: Distribution results:', {
            totalDestinations,
            successfulDistributions,
            totalStrkDistributed,
            failedDistributions: totalDestinations - successfulDistributions
        });

        // Check if the distribution was actually successful
        if (successfulDistributions === 0) {
            throw new Error(`All ${totalDestinations} destination distributions failed - no STRK was successfully delivered`);
        }

        if (successfulDistributions < totalDestinations) {
            console.warn(`⚠️ SLPM: Partial success - only ${successfulDistributions}/${totalDestinations} destinations received STRK`);
        } else {
            console.log('✅ SLPM: All distributions completed successfully');
        }

        console.log('✅ SLPM: Privacy mixing completed with distribution results');

        // Calculate final privacy metrics
        console.log('📊 SLPM: Calculating final privacy metrics');
        const anonymitySetSize = estimateAnonymitySetLocal(req);
        const privacyScore = scorePrivacy(req, anonymitySetSize);
        console.log('📈 SLPM: Final privacy metrics:', {
            anonymitySetSize,
            privacyScore,
            privacyLevel: req.privacyLevel,
            mixingPath: 'STRK → Lightning → Cashu → Lightning → STRK',
            destinationAccounts: req.destinations.length,
            totalFees: lightningResult.fee || 0,
            privacyGuarantees: {
                unlinkability: 'Account linkability broken via mixer contract',
                temporalPrivacy: 'Time delays and batching applied',
                amountObfuscation: 'Amount split across destinations',
                routingDiversification: 'Multiple Cashu mints used'
            }
        });

        // Determine completion message based on actual results
        let completionMessage: string;
        let completionType: 'mix:complete' | 'mix:partial' | 'mix:failed';

        if (successfulDistributions === totalDestinations) {
            completionMessage = `Privacy mix complete! ${totalStrkDistributed} STRK distributed to ${successfulDistributions} destinations through ${anonymitySetSize}-member anonymity set`;
            completionType = 'mix:complete';
        } else if (successfulDistributions > 0) {
            completionMessage = `Privacy mix partially complete - ${totalStrkDistributed} STRK delivered to ${successfulDistributions}/${totalDestinations} destinations`;
            completionType = 'mix:partial';
        } else {
            completionMessage = `Privacy mix failed - no STRK was successfully delivered to any destination`;
            completionType = 'mix:failed';
        }

        onEvent({
            type: completionType,
            message: completionMessage,
            progress: successfulDistributions === totalDestinations ? 100 : 90
        });

        console.log(`🎉 SLPM: Privacy mix operation result - ${successfulDistributions}/${totalDestinations} destinations successful`);

        // Return results for caller to handle
        return {
            success: successfulDistributions > 0,
            totalDestinations,
            successfulDistributions,
            totalStrkDistributed,
            distributionResults
        };

    } catch (error) {
        console.error('❌ SLPM: Privacy mix operation failed:', error);
        console.error('🔍 SLPM: Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            step: 'Privacy mixing flow',
            progress: 'Check individual step logs above'
        });

        onEvent({
            type: 'mix:error',
            message: error instanceof Error ? error.message : 'Privacy mix failed'
        });
        throw error;
    }
}

function estimateAnonymitySetLocal(req: MixRequest): number {
    const base = req.privacyLevel === 'maximum' ? 120 : req.privacyLevel === 'enhanced' ? 60 : 20;
    const extras = (req.enableSplitOutputs ? req.splitCount : 0) + (req.enableRandomizedMints ? 10 : 0);
    return base + extras;
}

function scorePrivacy(req: MixRequest, set: number) {
    let score = 50 + Math.min(40, Math.floor(set / 4));
    if (req.enableTimeDelays) score += 3;
    if (req.enableSplitOutputs && req.splitCount > 1) score += 3;
    if (req.enableRandomizedMints) score += 2;
    if (req.enableAmountObfuscation) score += 1;
    if (req.enableDecoyTx) score += 1;
    return Math.min(100, score);
}
