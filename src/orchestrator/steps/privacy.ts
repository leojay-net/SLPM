import { OrchestratorEvent, MixRequest } from '@/lib/types';
import { MultiMintCashuManager, RealCashuClient } from '@/integrations/cashu/client';

export async function stepPrivacy(
    req: MixRequest,
    proofs: any[],
    cashu: RealCashuClient,
    cashuManager: MultiMintCashuManager | null,
    onEvent: (e: OrchestratorEvent) => void
) {
    let workingProofs = proofs;

    if (req.enableRandomizedMints && cashuManager) {
        const { distributions } = await cashuManager.distributeSend(BigInt(Math.max(1, Math.floor(req.amountStrk * 1000))), proofs, 2);
        workingProofs = distributions.flatMap((d) => d.proofs);
        onEvent({ type: 'cashu:routed', message: 'Distributed across multiple mints', progress: 60 });
    }

    if (req.enableSplitOutputs && req.splitCount > 1) {
        const sats = Math.max(1, Math.floor(req.amountStrk * 1000));
        const perPart = BigInt(Math.floor(sats / Math.max(1, req.splitCount)));
        const splits: typeof workingProofs = [];
        let pool = workingProofs.slice();
        for (let i = 0; i < req.splitCount; i++) {
            const { keep, send } = await cashu.send(perPart, pool);
            splits.push(...send);
            pool = keep;
        }
        workingProofs = splits.length ? splits : workingProofs;
        onEvent({ type: 'cashu:routed', message: `Split into ${req.splitCount} outputs`, progress: 70 });
    }

    if (req.enableTimeDelays) await delay(jitter(1000));
    if (req.enableAmountObfuscation) await delay(200);
    if (req.enableDecoyTx) await delay(200);
    onEvent({ type: 'mix:progress', message: 'Privacy heuristics applied', progress: 80 });

    return workingProofs;
}

function delay(ms: number) { return new Promise((res) => setTimeout(res, ms)); }
function jitter(ms: number) { const v = Math.floor(ms * 0.3); return ms + Math.floor(Math.random() * v); }
