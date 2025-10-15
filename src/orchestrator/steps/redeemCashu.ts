/**
 * Redeem Cashu Token Orchestrator
 * Converts ecash token → Lightning → STRK via Atomiq
 */

import { RealAtomiqSwapClient } from '@/integrations/swaps/atomiq';
import { serverSideCashuMelt, calculateMaxInvoiceAmount } from '@/integrations/cashu/direct';
import { getSharedSwapAddress, transferStrkFromShared } from '@/integrations/starknet/sharedAccount';
import type { OrchestratorEvent } from '@/lib/types';

export async function redeemCashuToken(
    encodedToken: string,
    recipientAddress: string,
    onEvent: (event: OrchestratorEvent & { txHash?: string; changeToken?: string }) => void
): Promise<void> {
    try {
        onEvent({ type: 'redeem:validating', message: 'Validating ecash token' });

        // Calculate safe amount for invoice
        const maxCalc = await calculateMaxInvoiceAmount(encodedToken);
        if (!maxCalc.success) {
            throw new Error(maxCalc.error);
        }

        const safeAmount = maxCalc.maxAmount;
        console.log('Safe invoice amount:', safeAmount, 'sats');

        onEvent({ type: 'redeem:creating_swap', message: 'Creating Lightning to STRK swap' });

        // Determine destination (shared or direct)
        const sharedDest = getSharedSwapAddress();
        const swapDestination = sharedDest || recipientAddress;

        // Create Atomiq LN → STRK swap
        const atomiq = new RealAtomiqSwapClient();
        const swap = await atomiq.beginLightningToStrkSwap(safeAmount, swapDestination);

        console.log('Atomiq swap created:', { id: swap.id, invoice: swap.invoice.slice(0, 50) + '...' });

        onEvent({ type: 'redeem:melting', message: 'Melting ecash to Lightning payment' });

        // Melt ecash to pay the Atomiq invoice
        const meltResult = await serverSideCashuMelt(encodedToken, swap.invoice);

        if (!meltResult.success) {
            throw new Error(meltResult.error);
        }

        console.log('Ecash melted successfully');

        // Wait for Lightning payment to settle
        onEvent({ type: 'redeem:claiming', message: 'Waiting for payment confirmation' });

        const completed = await atomiq.waitLightningToStrkCompletion(swap.id, 300000);
        if (!completed) {
            throw new Error('Swap timed out waiting for payment');
        }

        // Claim the swap on Starknet
        await atomiq.claimLightningToStrkSwap(swap.id);

        console.log('Swap claimed on Starknet');

        let finalTxHash: string | undefined;

        // If using shared destination, forward to final recipient
        if (sharedDest && sharedDest.toLowerCase() !== recipientAddress.toLowerCase()) {
            onEvent({ type: 'redeem:forwarding', message: 'Forwarding STRK to recipient' });

            // Get claimed amount
            const status = await atomiq.getStatus(swap.id);
            const amountWei = status.amountOut ?? 0n;

            console.log('Forwarding STRK:', { from: sharedDest, to: recipientAddress, amount: amountWei.toString() });

            finalTxHash = await transferStrkFromShared(recipientAddress, amountWei);
        }

        // Handle change if any
        let changeTokenStr: string | undefined;
        if (meltResult.result.change && meltResult.result.change.length > 0) {
            const { getEncodedTokenV4 } = await import('@cashu/cashu-ts');
            changeTokenStr = getEncodedTokenV4({
                mint: meltResult.result.mintUrl,
                proofs: meltResult.result.change
            });
            console.log('Change token available:', meltResult.result.changeAmount, 'sats');
        }

        onEvent({
            type: 'redeem:complete',
            message: 'Redemption complete',
            txHash: finalTxHash || swap.id,
            changeToken: changeTokenStr
        });

    } catch (error) {
        console.error('Redeem error:', error);
        onEvent({
            type: 'redeem:error',
            message: error instanceof Error ? error.message : 'Redemption failed'
        });
        throw error;
    }
}

/**
 * Redeem Cashu Token Directly to Lightning Invoice
 * Melts ecash token to pay a Lightning invoice (no Atomiq swap, no STRK)
 */
export async function redeemToLightning(
    encodedToken: string,
    lightningInvoice: string,
    onEvent: (event: OrchestratorEvent & { changeToken?: string }) => void
): Promise<void> {
    try {
        onEvent({ type: 'redeem:validating', message: 'Validating ecash token and invoice' });

        console.log('🔄 Direct Lightning redemption starting');
        console.log('Invoice:', lightningInvoice.slice(0, 50) + '...');

        onEvent({ type: 'redeem:melting', message: 'Melting ecash to Lightning payment' });

        // Melt ecash directly to pay the provided Lightning invoice
        const meltResult = await serverSideCashuMelt(encodedToken, lightningInvoice);

        if (!meltResult.success) {
            throw new Error(meltResult.error);
        }

        console.log('✅ Lightning invoice paid successfully');

        // Handle change if any
        let changeTokenStr: string | undefined;
        if (meltResult.result.change && meltResult.result.change.length > 0) {
            const { getEncodedTokenV4 } = await import('@cashu/cashu-ts');
            changeTokenStr = getEncodedTokenV4({
                mint: meltResult.result.mintUrl,
                proofs: meltResult.result.change
            });
            console.log('💰 Change token available:', meltResult.result.changeAmount, 'sats');
        }

        onEvent({
            type: 'redeem:complete',
            message: 'Lightning invoice paid successfully',
            changeToken: changeTokenStr
        });

    } catch (error) {
        console.error('❌ Lightning redemption error:', error);
        onEvent({
            type: 'redeem:error',
            message: error instanceof Error ? error.message : 'Payment failed'
        });
        throw error;
    }
}
