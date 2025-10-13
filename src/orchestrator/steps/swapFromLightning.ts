import { OrchestratorEvent } from '@/lib/types';
import { RealAtomiqSwapClient } from '@/integrations/swaps/atomiq';
import { ENV } from '@/config/env';

export async function stepSwapFromLightning(
    lightningAmount: number,
    targetStrkAmount: number,
    destinationWallet: string,
    onEvent: (e: OrchestratorEvent) => void
) {
    console.log('⚡ SLPM SwapFromLN: Starting Lightning BTC → STRK swap');
    console.log('⚡ SLPM SwapFromLN: Parameters:', {
        lightningAmount,
        targetStrkAmount,
        destination: destinationWallet.slice(0, 10) + '...',
        network: ENV.NETWORK
    });

    try {
        onEvent({
            type: 'mix:progress',
            message: `Converting ${lightningAmount} sats Lightning BTC back to STRK...`,
            progress: 75
        });

        console.log('🏗️ SLPM SwapFromLN: Initializing Atomiq client...');
        const atomiq = new RealAtomiqSwapClient(ENV.NETWORK);

        // Get swap quote from Lightning BTC to STRK
        console.log('💰 SLPM SwapFromLN: Getting Atomiq reverse swap quote...');
        const quote = await atomiq.getQuote('BTC_LN', 'STRK', BigInt(lightningAmount), true); // exactIn

        console.log('💰 SLPM SwapFromLN: Atomiq quote received:', {
            quoteId: quote.id,
            inputAmount: quote.amountIn.toString(),
            outputAmount: quote.amountOut.toString(),
            fee: quote.fee.toString(),
            swapPrice: quote.swapPrice,
            marketPrice: quote.marketPrice,
            expiry: new Date(quote.expiry).toISOString()
        });

        // Validate quote is reasonable
        const expectedStrkOut = Number(quote.amountOut);
        const priceDifference = Math.abs(expectedStrkOut - targetStrkAmount) / targetStrkAmount;

        console.log('📊 SLPM SwapFromLN: Quote analysis:', {
            expectedStrkOut,
            targetStrkAmount,
            priceDifference: (priceDifference * 100).toFixed(2) + '%'
        });

        if (priceDifference > 0.1) { // 10% difference limit
            console.warn('⚠️ SLPM SwapFromLN: Significant price difference from expected amount');
        }

        onEvent({
            type: 'mix:progress',
            message: `Quote received: ${lightningAmount} sats → ${expectedStrkOut.toFixed(4)} STRK`,
            progress: 78
        });

        // For Lightning → STRK swaps, Atomiq generates a Lightning invoice we need to pay
        console.log('⚡ SLPM SwapFromLN: Getting Lightning invoice from Atomiq...');
        const lightningInvoice = await atomiq.getInvoice(quote.id);

        console.log('⚡ SLPM SwapFromLN: Lightning invoice received:', {
            invoice: lightningInvoice.slice(0, 50) + '...',
            quoteId: quote.id
        });

        // Execute the swap - this will:
        // 1. Create the swap contract on Starknet
        // 2. Wait for Lightning payment to the generated invoice
        // 3. Release STRK to the destination address
        console.log('⚡ SLPM SwapFromLN: Executing reverse swap...');
        onEvent({
            type: 'mix:progress',
            message: 'Executing Lightning → STRK swap...',
            progress: 80
        });

        const execution = await atomiq.execute(quote.id);

        console.log('⚡ SLPM SwapFromLN: Swap execution result:', {
            executionId: execution.id,
            status: execution.status,
            txId: execution.txId,
            amountOut: execution.amountOut?.toString()
        });

        // For Lightning → STRK, we need to pay the invoice to complete the swap
        console.log('💸 SLPM SwapFromLN: Simulating Lightning payment...');
        onEvent({
            type: 'mix:progress',
            message: 'Paying Lightning invoice to complete swap...',
            progress: 82
        });

        // In a real implementation, this would use a Lightning wallet to pay the invoice
        // For testing, we simulate the payment
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for completion
        console.log('⏳ SLPM SwapFromLN: Waiting for swap completion...');
        const finalStatus = await atomiq.waitForCompletion(execution.id, 30000); // 30 second timeout

        if (!finalStatus) {
            throw new Error('Swap did not complete within timeout period');
        }

        // Get final execution status
        const finalExecution = await atomiq.getStatus(execution.id);
        console.log('✅ SLPM SwapFromLN: Final swap status:', {
            status: finalExecution.status,
            txId: finalExecution.txId,
            amountOut: finalExecution.amountOut?.toString()
        });

        if (finalExecution.status !== 'CLAIMED') {
            throw new Error(`Swap failed with final status: ${finalExecution.status}. ${finalExecution.errorMessage || ''}`);
        }

        console.log('✅ SLPM SwapFromLN: Lightning BTC successfully swapped back to STRK!');
        onEvent({
            type: 'mix:progress',
            message: 'Lightning BTC successfully converted back to STRK',
            progress: 85
        });

        return {
            executionId: finalExecution.id,
            starknetTxId: finalExecution.txId,
            amountIn: lightningAmount,
            amountOut: Number(finalExecution.amountOut || quote.amountOut),
            fee: Number(quote.fee),
            destination: destinationWallet,
            lightningInvoice: lightningInvoice
        };

    } catch (error) {
        console.error('❌ SLPM SwapFromLN: Step failed:', error);
        console.error('🔍 SLPM SwapFromLN: Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                lightningAmount,
                targetStrkAmount,
                destination: destinationWallet.slice(0, 10) + '...',
                network: ENV.NETWORK
            }
        });

        onEvent({
            type: 'mix:error',
            message: error instanceof Error ? error.message : 'Unknown reverse swap error'
        });
        throw error;
    }
}
