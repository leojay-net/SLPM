import { OrchestratorEvent } from '@/lib/types';
import { RealCashuClient } from '@/integrations/cashu/client';

export async function stepClaimCashuProofs(
    mintQuote: any,
    cashu: RealCashuClient,
    targetSats: number,
    onEvent: (e: OrchestratorEvent) => void
) {
    console.log('🪙 SLPM ClaimCashu: Starting Cashu proof claiming');
    console.log('🪙 SLPM ClaimCashu: Parameters:', {
        quoteId: mintQuote.quote,
        amount: targetSats,
        expectedState: 'PAID'
    });

    try {
        onEvent({
            type: 'mix:progress',
            message: `Claiming Cashu proofs for ${targetSats} sats...`,
            progress: 45
        });

        // Check if the Lightning invoice has been paid by Atomiq
        console.log('🔍 SLPM ClaimCashu: Checking if mint quote was paid...');
        const quoteStatus = await cashu.checkMintQuote(mintQuote.quote);

        console.log('🔍 SLPM ClaimCashu: Quote status:', {
            quote: quoteStatus.quote,
            state: quoteStatus.state,
            amount: quoteStatus.amount.toString()
        });

        if (quoteStatus.state !== 'PAID') {
            // Wait a bit and check again
            console.log('⏳ SLPM ClaimCashu: Payment not confirmed yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const retryStatus = await cashu.checkMintQuote(mintQuote.quote);
            console.log('🔍 SLPM ClaimCashu: Retry status:', retryStatus.state);

            if (retryStatus.state !== 'PAID') {
                throw new Error(`Lightning payment not confirmed. Quote state: ${retryStatus.state}`);
            }
        }

        console.log('✅ SLPM ClaimCashu: Lightning payment confirmed by Cashu mint');

        // Mint the proofs now that payment is confirmed
        console.log('🏭 SLPM ClaimCashu: Minting Cashu proofs...');
        const proofs = await cashu.mintProofs(BigInt(targetSats), mintQuote.quote);

        console.log('🏭 SLPM ClaimCashu: Cashu proofs minted:', {
            count: proofs.length,
            totalAmount: proofs.reduce((sum, p) => sum + Number(p.amount), 0),
            proofs: proofs.map(p => ({
                amount: Number(p.amount),
                secret: p.secret?.slice(0, 10) + '...'
            }))
        });

        // Verify total amount matches expectation
        const totalAmount = proofs.reduce((sum, p) => sum + Number(p.amount), 0);
        if (Math.abs(totalAmount - targetSats) > 1) { // Allow 1 sat tolerance
            console.warn('⚠️ SLPM ClaimCashu: Amount mismatch:', {
                expected: targetSats,
                received: totalAmount,
                difference: totalAmount - targetSats
            });
        }

        onEvent({
            type: 'mix:progress',
            message: `Cashu proofs claimed: ${proofs.length} proofs for ${totalAmount} sats`,
            progress: 50
        });

        console.log('🪙 SLPM ClaimCashu: Step completed successfully');
        return proofs;

    } catch (error) {
        console.error('❌ SLPM ClaimCashu: Step failed:', error);
        console.error('🔍 SLPM ClaimCashu: Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                quoteId: mintQuote.quote,
                targetSats,
                quoteState: mintQuote.state
            }
        });

        onEvent({
            type: 'mix:error',
            message: error instanceof Error ? error.message : 'Unknown Cashu claiming error'
        });
        throw error;
    }
}
