import { MixRequest, OrchestratorEvent } from '@/lib/types';
import { stepDeposit } from './steps/deposit';
import { stepMint } from './steps/mint';
import { stepPrivacy } from './steps/privacy';
import { stepSwapBack } from './steps/swapBack';

export async function startMix(req: MixRequest, onEvent: (e: OrchestratorEvent) => void) {
    try {
        // Step 1: Handle STRK deposit
        await stepDeposit(req.amountStrk, onEvent);

        // Step 2: Convert to Lightning and mint Cashu
        const sats = Math.max(1, Math.floor(req.amountStrk * 1000));
        const { proofs, cashu, cashuManager } = await stepMint(sats, onEvent);

        // Step 3: Apply privacy features
        const finalProofs = await stepPrivacy(req, proofs, cashu, cashuManager, onEvent);

        // Step 4: Swap back to STRK via Atomiq
        await stepSwapBack(sats, onEvent);

        // Step 5: Complete with privacy metrics
        const anonymitySetSize = estimateAnonymitySetLocal(req);
        const privacyScore = scorePrivacy(req, anonymitySetSize);
        onEvent({
            type: 'mix:complete',
            message: 'Mix complete',
            progress: 100,
            anonymitySetSize,
            privacyScore
        });
    } catch (error) {
        onEvent({
            type: 'mix:error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            progress: 0
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
