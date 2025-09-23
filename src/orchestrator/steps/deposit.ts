import { OrchestratorEvent } from '@/lib/types';

export async function stepDeposit(amountStrk: number, onEvent: (e: OrchestratorEvent) => void) {
    onEvent({ type: 'deposit:initiated', message: 'Preparing STRK deposit...' });
    // TODO: call Starknet wallet approve/transfer if needed
    onEvent({ type: 'deposit:confirmed', message: 'Deposit acknowledged', progress: 10 });
}
