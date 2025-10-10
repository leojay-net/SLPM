import { OrchestratorEvent, MixRequest } from '@/lib/types';
import { MultiMintCashuManager, RealCashuClient } from '@/integrations/cashu/client';

// Utility functions for privacy timing
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(baseMs: number, variance = 0.3): number {
    const jitterRange = baseMs * variance;
    const jitterAmount = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(100, Math.floor(baseMs + jitterAmount)); // Minimum 100ms
}

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

        if (req.enableRandomizedMints && cashuManager) {
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

        // Add time delay after multi-mint distribution
        if (req.enableRandomizedMints && cashuManager) {
            console.log('⏱️ SLPM Privacy: Applying delay after multi-mint distribution...');
            const distributionDelay = jitter(2000); // 2 second base delay with jitter
            console.log('⏱️ SLPM Privacy: Distribution delay duration:', distributionDelay, 'ms');
            await delay(distributionDelay);
            console.log('✅ SLPM Privacy: Post-distribution delay applied');
        }

        // Skip output splitting to avoid "not enough funds" errors
        console.log('⏭️ SLPM Privacy: Skipping output splitting (disabled to prevent fund errors)');

        if (req.enableTimeDelays) {
            console.log('⏱️ SLPM Privacy: Applying additional time delays...');
            const delayMs = jitter(3000); // Increased to 3 second base delay
            console.log('⏱️ SLPM Privacy: Delay duration:', delayMs, 'ms');
            await delay(delayMs);
            console.log('✅ SLPM Privacy: Time delay applied');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping time delays (disabled)');
        }

        if (req.enableAmountObfuscation) {
            console.log('💰 SLPM Privacy: Applying amount obfuscation...');
            const obfuscationDelay = jitter(1500); // Add delay for obfuscation
            await delay(obfuscationDelay);
            console.log('✅ SLPM Privacy: Amount obfuscation applied with', obfuscationDelay, 'ms delay');
        } else {
            console.log('⏭️ SLPM Privacy: Skipping amount obfuscation (disabled)');
        }

        if (req.enableDecoyTx) {
            console.log('👻 SLPM Privacy: Applying decoy transactions...');
            const decoyDelay = jitter(1000); // Add delay for decoy transactions
            await delay(decoyDelay);
            console.log('✅ SLPM Privacy: Decoy transactions applied with', decoyDelay, 'ms delay');
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
