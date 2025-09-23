import { OrchestratorEvent } from '@/lib/types';
import { RealAtomiqSwapClient } from '@/integrations/swaps/atomiq';
import { ENV } from '@/config/env';

export async function stepSwapBack(sats: number, onEvent: (e: OrchestratorEvent) => void) {
    const atomiq = new RealAtomiqSwapClient(ENV.NETWORK);
    const quoteBack = await atomiq.getQuote('BTC_LN', 'STRK', BigInt(sats));
    await atomiq.execute(quoteBack.id);
    onEvent({ type: 'mix:progress', message: 'Swapped back to STRK', progress: 90 });
}
