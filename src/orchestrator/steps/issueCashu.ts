import { OrchestratorEvent } from '@/lib/types';
import { stepDeposit } from './deposit';
import { stepWithdrawForMixing } from './withdrawForMixing';
import { stepDynamicEstimateSats } from './dynamicEstimateSats';
import { stepCreateMintInvoice } from './createMintInvoice';
import { stepSwapToLightning } from './swapToLightning';
import { stepClaimCashuProofs } from './claimCashuProofs';

export interface IssueCashuResult {
    token: string; // Serialized Cashu token
    amount: number; // STRK amount
    satsValue: number; // sats value of the token
    mintUrl: string;
    depositInfo: {
        commitmentHash: string;
        secret: string;
        nullifier: string;
        mixerContractAddress: string;
    };
}

/**
 * Issue Token Flow:
 * 1. Deposit STRK to privacy mixer contract
 * 2. Withdraw from mixer for mixing pipeline  
 * 3. Estimate STRK→sats conversion rate
 * 4. Create Cashu mint invoice
 * 5. Swap STRK→Lightning via Atomiq (paying mint invoice)
 * 6. Claim Cashu proofs from mint
 * 7. Serialize proofs as bearer token
 */
export async function issueCashuToken(
    amountStrk: number,
    onEvent: (e: OrchestratorEvent) => void
): Promise<IssueCashuResult> {
    console.log('🎫 SLPM Issue Token: Starting issue flow for', amountStrk, 'STRK');

    try {
        // Step 1: Deposit STRK to privacy mixer contract
        console.log('💰 SLPM Issue Token: Step 1 - Depositing STRK to privacy mixer...');
        onEvent({
            type: 'issue:progress',
            message: 'Depositing STRK to privacy mixer...',
            progress: 10
        });

        const depositResult = await stepDeposit(amountStrk, (e) => {
            // Map deposit events to issue events
            if (e.type === 'deposit:initiated') {
                onEvent({ type: 'issue:progress', message: e.message, progress: 12 });
            } else if (e.type === 'deposit:wallet_connected') {
                onEvent({ type: 'issue:progress', message: e.message, progress: 15 });
            } else if (e.type === 'deposit:balance_checked') {
                onEvent({ type: 'issue:progress', message: e.message, progress: 18 });
            } else if (e.type === 'deposit:confirmed') {
                onEvent({ type: 'issue:progress', message: 'Deposit complete', progress: 20 });
            }
        });

        console.log('✅ SLPM Issue Token: Deposit complete:', {
            commitment: depositResult.commitmentHash.slice(0, 10) + '...',
            amount: depositResult.amount
        });

        // Step 2: Withdraw from mixer for mixing pipeline
        console.log('🔄 SLPM Issue Token: Step 2 - Withdrawing from mixer...');
        onEvent({
            type: 'issue:progress',
            message: 'Withdrawing from mixer for swap...',
            progress: 25
        });

        const withdrawalResult = await stepWithdrawForMixing(depositResult, (e) => {
            if (e.type === 'deposit:preparing_withdrawal') {
                onEvent({ type: 'issue:progress', message: e.message, progress: 28 });
            }
        });

        console.log('✅ SLPM Issue Token: Withdrawal complete:', {
            availableForSwap: withdrawalResult.availableForSwap,
            amount: withdrawalResult.amount
        });

        // Step 3: Estimate STRK→sats conversion
        console.log('💱 SLPM Issue Token: Step 3 - Estimating STRK→sats...');
        onEvent({
            type: 'issue:progress',
            message: 'Estimating conversion rate...',
            progress: 35
        });

        const dynamicEstimate = await stepDynamicEstimateSats(withdrawalResult.amount, onEvent);
        console.log('💰 SLPM Issue Token: Estimated', withdrawalResult.amount, 'STRK →', dynamicEstimate.satsOut, 'sats');

        // Step 4: Create Cashu mint invoice
        console.log('🎟️ SLPM Issue Token: Step 4 - Creating Cashu mint invoice...');
        onEvent({
            type: 'issue:progress',
            message: 'Creating Cashu mint invoice...',
            progress: 40
        });

        const mintInvoiceResult = await stepCreateMintInvoice(dynamicEstimate.satsOut, onEvent);
        const invoicePreview = mintInvoiceResult.mintQuote.request
            ? mintInvoiceResult.mintQuote.request.slice(0, 30) + '...'
            : 'n/a';
        console.log('✅ SLPM Issue Token: Mint invoice created:', {
            quoteId: mintInvoiceResult.mintQuote.quote,
            amount: dynamicEstimate.satsOut,
            invoice: invoicePreview
        });

        // Step 5: Swap STRK→Lightning via Atomiq (pays the invoice)
        console.log('⚡ SLPM Issue Token: Step 5 - Swapping STRK→Lightning...');
        onEvent({
            type: 'issue:progress',
            message: 'Swapping STRK to Lightning...',
            progress: 50
        });

        const lightningResult = await stepSwapToLightning(
            withdrawalResult.amount,
            {
                walletAddress: withdrawalResult.originalDeposit.walletAddress,
                mixerContractAddress: withdrawalResult.originalDeposit.mixerContractAddress,
                fundsAvailable: withdrawalResult.availableForSwap
            },
            mintInvoiceResult,
            onEvent
        );

        console.log('✅ SLPM Issue Token: Lightning swap complete:', {
            executionId: lightningResult.executionId,
            paymentHash: lightningResult.lightningPaymentHash?.slice(0, 10) + '...'
        });

        // Step 6: Claim Cashu proofs from mint
        console.log('🎫 SLPM Issue Token: Step 6 - Claiming Cashu proofs...');
        onEvent({
            type: 'issue:progress',
            message: 'Claiming Cashu token...',
            progress: 75
        });

        const cashuProofs = await stepClaimCashuProofs(
            mintInvoiceResult.mintQuote,
            mintInvoiceResult.cashu,
            dynamicEstimate.satsOut,
            onEvent
        );

        console.log('✅ SLPM Issue Token: Cashu proofs claimed:', {
            proofsCount: cashuProofs.length,
            totalValue: cashuProofs.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
        });

        // Step 7: Serialize proofs as bearer token
        console.log('📦 SLPM Issue Token: Step 7 - Serializing token...');
        onEvent({
            type: 'issue:progress',
            message: 'Creating bearer token...',
            progress: 90
        });

        const serializedToken = mintInvoiceResult.cashu.createToken(cashuProofs);
        console.log('✅ SLPM Issue Token: Token serialized:', {
            tokenLength: serializedToken.length,
            tokenPreview: serializedToken.slice(0, 50) + '...'
        });

        onEvent({
            type: 'issue:complete',
            message: 'Token issued successfully!',
            progress: 100
        });

        return {
            token: serializedToken,
            amount: amountStrk,
            satsValue: dynamicEstimate.satsOut,
            mintUrl: mintInvoiceResult.mintQuote.request || 'unknown',
            depositInfo: {
                commitmentHash: depositResult.commitmentHash,
                secret: depositResult.secret,
                nullifier: depositResult.nullifier,
                mixerContractAddress: depositResult.mixerContractAddress
            }
        };

    } catch (error: any) {
        console.error('❌ SLPM Issue Token: Error:', error);
        onEvent({
            type: 'issue:error',
            message: error.message || 'Failed to issue token'
        });
        throw error;
    }
}
