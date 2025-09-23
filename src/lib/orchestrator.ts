import { MixRequest, OrchestratorEvent } from './types';
import { startMix } from '@/orchestrator';

export async function runMix(req: MixRequest, onEvent: (e: OrchestratorEvent) => void) {
    try {
        await startMix(req, onEvent);
    } catch (e: any) {
        onEvent({ type: 'mix:error', message: e?.message || 'Unknown error' });
        throw e;
    }
}
