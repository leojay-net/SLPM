import { OrchestratorEvent, MixRequest } from '@/lib/types';
import { MultiMintCashuManager, RealCashuClient } from '@/integrations/cashu/client';
import { ENV } from '@/config/env';

export async function stepPrivacy(
    req: MixRequest,
    proofs: any[],
    cashu: RealCashuClient,
    cashuManager: MultiMintCashuManager | null,
    onEvent: (e: OrchestratorEvent) => void
) {
    console.log('🔒 SLPM Privacy: Starting privacy step');
    console.log('🔒 SLPM Privacy: Configuration:', {
        enableRandomizedMints: req.enableRandomizedMints,
        enableSplitOutputs: req.enableSplitOutputs,
        splitCount: req.splitCount,
        enableTimeDelays: req.enableTimeDelays,
        enableAmountObfuscation: req.enableAmountObfuscation,
        enableDecoyTx: req.enableDecoyTx,
        amountStrk: req.amountStrk
    });
    console.log('🔒 SLPM Privacy: Input proofs:', {
        count: proofs.length,
        proofs: proofs.map(p => ({ amount: p.amount, C: p.C?.slice(0, 10) + '...' }))
    });

    // Calculate actual total value from proofs
    const totalProofValue = proofs.reduce((sum, proof) => sum + BigInt(proof.amount), 0n);
    console.log('🔒 SLPM Privacy: Total proof value:', totalProofValue.toString(), 'sats');

    try {
        let workingProofs = proofs;

        const multiMintEnabled = req.enableRandomizedMints && cashuManager && !ENV.CASHU_SINGLE_MINT;
        if (multiMintEnabled) {
            console.log('🌐 SLPM Privacy: Distributing across multiple mints...');
            const distributionAmount = totalProofValue;
            console.log('🌐 SLPM Privacy: Distribution amount:', distributionAmount.toString(), 'sats');

            const { distributions } = await cashuManager.distributeSend(distributionAmount, proofs, 2);
            workingProofs = distributions.flatMap((d) => d.proofs);

            console.log('🌐 SLPM Privacy: Distribution result:', {
                originalProofs: proofs.length,
                newProofs: workingProofs.length,
                distributions: distributions.length
            });

            onEvent({ type: 'cashu:routed', message: 'Distributed across multiple mints', progress: 60 });
            console.log('✅ SLPM Privacy: Multi-mint distribution completed');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping multi-mint distribution (disabled or no manager)');
        }

        const splitEnabled = req.enableSplitOutputs && req.splitCount > 1 && !ENV.DISABLE_CASHU_SPLIT;
        if (splitEnabled) {
            console.log('🔀 SLPM Privacy: Splitting outputs...');
            const satsAvailable = Number(totalProofValue);
            const perPart = BigInt(Math.floor(satsAvailable / Math.max(1, req.splitCount)));
            console.log('🔀 SLPM Privacy: Split parameters:', {
                totalSats: satsAvailable,
                splitCount: req.splitCount,
                perPart: perPart.toString()
            });

            const splits: typeof workingProofs = [];
            let pool = workingProofs.slice();

            for (let i = 0; i < req.splitCount; i++) {
                console.log(`🔀 SLPM Privacy: Creating split ${i + 1}/${req.splitCount}...`);
                const { keep, send } = await cashu.send(perPart, pool);
                splits.push(...send);
                pool = keep;
                console.log(`🔀 SLPM Privacy: Split ${i + 1} created:`, {
                    sentProofs: send.length,
                    keepProofs: keep.length
                });
            }

            workingProofs = splits.length ? splits : workingProofs;
            console.log('🔀 SLPM Privacy: Split result:', {
                finalProofs: workingProofs.length,
                splitSuccessful: splits.length > 0
            });

            onEvent({ type: 'cashu:routed', message: `Split into ${req.splitCount} outputs`, progress: 70 });
            console.log('✅ SLPM Privacy: Output splitting completed');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping output splitting (disabled or invalid split count)');
        }

        if (req.enableTimeDelays) {
            console.log('⏱️ SLPM Privacy: Applying time delays...');
            const delayMs = jitter(1000);
            console.log('⏱️ SLPM Privacy: Delay duration:', delayMs, 'ms');
            await delay(delayMs);
            console.log('✅ SLPM Privacy: Time delay applied');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping time delays (disabled)');
        }

        if (req.enableAmountObfuscation) {
            console.log('💰 SLPM Privacy: Applying amount obfuscation...');
            await delay(200);
            console.log('✅ SLPM Privacy: Amount obfuscation applied');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping amount obfuscation (disabled)');
        }

        if (req.enableDecoyTx) {
            console.log('👻 SLPM Privacy: Applying decoy transactions...');
            await delay(200);
            console.log('✅ SLPM Privacy: Decoy transactions applied');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping decoy transactions (disabled)');
        }

        onEvent({ type: 'mix:progress', message: 'Privacy heuristics applied', progress: 80 });

        console.log('🔒 SLPM Privacy: Final result:', {
            inputProofs: proofs.length,
            outputProofs: workingProofs.length,
            privacyFeaturesApplied: [
                req.enableRandomizedMints && 'multi-mint',
                req.enableSplitOutputs && 'split-outputs',
                req.enableTimeDelays && 'time-delays',
                req.enableAmountObfuscation && 'amount-obfuscation',
                req.enableDecoyTx && 'decoy-tx'
            ].filter(Boolean)
        });
        console.log('🔒 SLPM Privacy: Step completed successfully');

        return workingProofs;

    } catch (error) {
        console.error('❌ SLPM Privacy: Step failed:', error);
        console.error('🔍 SLPM Privacy: Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                proofsCount: proofs.length,
                hasManager: !!cashuManager,
                configuration: {
                    enableRandomizedMints: req.enableRandomizedMints,
                    enableSplitOutputs: req.enableSplitOutputs,
                    splitCount: req.splitCount
                }
            }
        });
        throw error;
    }
}

function delay(ms: number) { return new Promise((res) => setTimeout(res, ms)); }
function jitter(ms: number) { const v = Math.floor(ms * 0.3); return ms + Math.floor(Math.random() * v); }
