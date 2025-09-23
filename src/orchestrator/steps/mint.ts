import { OrchestratorEvent } from '@/lib/types';
import { RealLightningClient } from '@/integrations/lightning/client';
import { MultiMintCashuManager, RealCashuClient } from '@/integrations/cashu/client';
import { ENV } from '@/config/env';

export async function stepMint(
    sats: number,
    onEvent: (e: OrchestratorEvent) => void
) {
    const ln = new RealLightningClient(ENV.LND_URL, ENV.LND_MACAROON, ENV.LND_TLS);
    const cashuManager = ENV.CASHU_MINTS.length ? new MultiMintCashuManager(ENV.CASHU_MINTS) : null;
    const cashu = cashuManager ? cashuManager.selectMint() : new RealCashuClient(ENV.CASHU_DEFAULT_MINT);

    const invoiceInfo = await ln.createInvoice(sats, 'SLPM mint funding');
    onEvent({ type: 'lightning:invoice_created', message: 'LN invoice created', details: { hash: invoiceInfo.paymentHash }, progress: 20 });

    const payResult = await ln.payInvoice(invoiceInfo.invoice);
    if (payResult.status !== 'SUCCEEDED') throw new Error('Lightning payment failed');
    onEvent({ type: 'lightning:paid', message: 'Lightning payment settled', progress: 35 });

    const mintQuote = await cashu.createMintQuote(BigInt(sats));
    const proofs = await cashu.mintProofs(mintQuote.amount, mintQuote.quote);
    onEvent({ type: 'cashu:minted', message: 'Ecash minted', progress: 45 });

    return { proofs, cashu, cashuManager } as const;
}
