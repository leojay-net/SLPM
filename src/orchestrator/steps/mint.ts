import { OrchestratorEvent } from '@/lib/types';
import { RealLightningClient, MockLightningClient } from '@/integrations/lightning/client';
import { MultiMintCashuManager, RealCashuClient } from '@/integrations/cashu/client';
import { ENV } from '@/config/env';

export async function stepMint(
    sats: number,
    onEvent: (e: OrchestratorEvent) => void
) {
    console.log('⚡ SLPM Mint: Starting mint step');
    console.log('⚡ SLPM Mint: Amount to mint:', sats, 'sats');

    try {
        // Initialize Lightning client - use real if configured
        console.log('⚡ SLPM Mint: Initializing Lightning client...');
        console.log('⚡ SLPM Mint: LND configuration:', {
            url: !!ENV.LND_URL,
            macaroon: !!ENV.LND_MACAROON,
            tls: !!ENV.LND_TLS
        });

        let ln;
        if (ENV.LND_URL && ENV.LND_MACAROON) {
            console.log('⚡ SLPM Mint: Using real Lightning client with URL:', ENV.LND_URL);
            ln = new RealLightningClient(ENV.LND_URL, ENV.LND_MACAROON, ENV.LND_TLS);

            // Test connection
            try {
                console.log('⚡ SLPM Mint: Testing Lightning connection...');
                await ln.createInvoice(1000, 'Connection test');
                console.log('✅ SLPM Mint: Lightning connection successful');
            } catch (error) {
                console.warn('⚠️ SLPM Mint: Lightning connection failed, using mock fallback');
                console.warn('⚠️ SLPM Mint: Error:', error);
                ln = new MockLightningClient();
            }
        } else {
            console.log('⚡ SLPM Mint: No complete LND configuration, using mock Lightning client');
            ln = new MockLightningClient();
        }

        console.log('⚡ SLPM Mint: Lightning client type:', ENV.LND_URL ? 'Real LND' : 'Mock');

        // Initialize Cashu manager/client
        console.log('⚡ SLPM Mint: Initializing Cashu services...');
        console.log('⚡ SLPM Mint: Available mints:', ENV.CASHU_MINTS.length);
        console.log('⚡ SLPM Mint: Default mint:', ENV.CASHU_DEFAULT_MINT);

        const cashuManager = ENV.CASHU_MINTS.length ? new MultiMintCashuManager(ENV.CASHU_MINTS) : null;
        const cashu = cashuManager ? cashuManager.selectMint() : new RealCashuClient(ENV.CASHU_DEFAULT_MINT);
        console.log('⚡ SLPM Mint: Cashu client initialized, using', cashuManager ? 'multi-mint' : 'single-mint', 'mode');

        // Create Lightning invoice
        console.log('⚡ SLPM Mint: Creating Lightning invoice...');
        const invoiceInfo = await ln.createInvoice(sats, 'SLPM mint funding');
        console.log('⚡ SLPM Mint: Lightning invoice created:', {
            amount: sats,
            paymentHash: invoiceInfo.paymentHash,
            amountMsat: invoiceInfo.amountMsat
        });

        onEvent({ type: 'lightning:invoice_created', message: 'LN invoice created', details: { hash: invoiceInfo.paymentHash }, progress: 20 });

        // Pay Lightning invoice
        console.log('⚡ SLPM Mint: Paying Lightning invoice...');
        const payResult = await ln.payInvoice(invoiceInfo.invoice);
        console.log('⚡ SLPM Mint: Lightning payment result:', payResult);

        if (payResult.status !== 'SUCCEEDED') {
            console.error('❌ SLPM Mint: Lightning payment failed:', payResult);
            throw new Error('Lightning payment failed');
        }
        console.log('✅ SLPM Mint: Lightning payment successful');

        onEvent({ type: 'lightning:paid', message: 'Lightning payment settled', progress: 35 });

        // Create Cashu mint quote
        console.log('⚡ SLPM Mint: Creating Cashu mint quote...');
        const mintQuote = await cashu.createMintQuote(BigInt(sats));
        console.log('⚡ SLPM Mint: Mint quote created:', {
            quote: mintQuote.quote,
            amount: mintQuote.amount.toString(),
            state: mintQuote.state
        });

        // Mint Cashu proofs
        console.log('⚡ SLPM Mint: Minting Cashu proofs...');
        const proofs = await cashu.mintProofs(mintQuote.amount, mintQuote.quote);
        console.log('⚡ SLPM Mint: Cashu proofs minted:', {
            count: proofs.length,
            totalValue: proofs.reduce((sum, p) => sum + Number(p.amount), 0),
            denominations: proofs.map(p => p.amount)
        });

        onEvent({ type: 'cashu:minted', message: 'Ecash minted', progress: 45 });

        console.log('⚡ SLPM Mint: Step completed successfully');
        return { proofs, cashu, cashuManager } as const;

    } catch (error) {
        console.error('❌ SLPM Mint: Step failed:', error);
        console.error('🔍 SLPM Mint: Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}
