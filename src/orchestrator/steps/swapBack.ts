import { OrchestratorEvent } from '@/lib/types';
import { RealAtomiqSwapClient } from '@/integrations/swaps/atomiq';
import { RealCashuClient } from '@/integrations/cashu/client';
import { EcashProof } from '@/domain';
import { ENV } from '@/config/env';
import { serverSideCashuMelt, getEncodedTokenFromStorage, calculateMaxInvoiceAmount } from '@/integrations/cashu/direct';
import { type Proof } from '@cashu/cashu-ts';

export async function stepSwapBack(
    cashuProofs: EcashProof[],
    destinations: string[],
    cashu: RealCashuClient,
    onEvent: (e: OrchestratorEvent) => void,
    mintQuoteId?: string // Add optional quote ID for token retrieval
) {
    console.log('🔄 SLPM SwapBack: Starting SIMPLIFIED Cashu redemption (no mixing/splitting/delays)');

    const totalSats = cashuProofs.reduce((sum, p) => sum + Number(p.amount), 0);
    const singleDestination = destinations[0]; // Use only the first destination

    console.log('🔄 SLPM SwapBack: SIMPLIFIED Parameters:', {
        proofsCount: cashuProofs.length,
        totalSats,
        singleDestination: singleDestination?.slice(0, 10) + '...',
        network: ENV.NETWORK,
        mintUrl: ENV.CASHU_DEFAULT_MINT
    });

    try {
        onEvent({ type: 'mix:progress', message: 'Converting ALL ecash to Lightning and STRK (single transaction)...', progress: 80 });

        // Initialize Atomiq client for Lightning → STRK swaps
        const atomiq = new RealAtomiqSwapClient(ENV.NETWORK);

        onEvent({ type: 'mix:progress', message: 'Calculating optimal invoice amount and melting ALL ecash proofs...', progress: 85 });

        // Step 1: Calculate safe amount FIRST, then create properly sized Atomiq swap
        const { finalInvoice, finalSwapId, meltResult } = await redeemAllCashuToInvoice(
            cashuProofs,
            totalSats,
            singleDestination,
            atomiq,
            onEvent,
            mintQuoteId
        );

        console.log('✅ SLPM SwapBack: ALL Cashu proofs melted:', {
            invoiceAmount: finalInvoice.slice(0, 30) + '...',
            changeProofs: meltResult.change?.length || 0,
            totalRedeemed: meltResult.usedAmount
        });

        onEvent({ type: 'mix:progress', message: 'Waiting for Lightning payment to complete...', progress: 90 });

        // Step 3: Wait for Lightning payment and claim STRK to single destination
        console.log('🔄 SLPM SwapBack: Waiting for Lightning payment...');
        const completed = await atomiq.waitLightningToStrkCompletion(finalSwapId, 300000);

        let finalStatus = 'FAILED';
        if (completed) {
            console.log('⚡ SLPM SwapBack: Lightning payment confirmed, claiming STRK...');
            try {
                await atomiq.claimLightningToStrkSwap(finalSwapId);
                finalStatus = 'CLAIMED';
                console.log('✅ SLPM SwapBack: STRK claimed to single destination');
            } catch (claimError) {
                console.error('❌ SLPM SwapBack: Claim failed:', claimError);
                finalStatus = 'PAYMENT_CONFIRMED_CLAIM_FAILED';
            }
        } else {
            console.warn('⚠️ SLPM SwapBack: Lightning payment did not complete in time');
        }

        const results = [{
            destination: singleDestination,
            satsRedeemed: Number(meltResult.usedAmount || totalSats),
            strkSent: Number(meltResult.usedAmount || totalSats),
            txId: finalSwapId,
            status: finalStatus
        }];

        console.log('📊 SLPM SwapBack: SIMPLIFIED Final result:', {
            destination: singleDestination,
            totalSatsRedeemed: results[0].satsRedeemed,
            totalStrkSent: results[0].strkSent,
            status: finalStatus
        });

        onEvent({ type: 'mix:progress', message: 'Simplified swap completed', progress: 95 });

        return results;

    } catch (error) {
        console.error('❌ SLPM SwapBack: SIMPLIFIED Critical error:', error);
        throw error;
    }
}

// SIMPLIFIED redemption function - calculate safe amount first, then create optimized swap and melt
async function redeemAllCashuToInvoice(
    allProofs: EcashProof[],
    totalAmount: number,
    destination: string,
    atomiq: RealAtomiqSwapClient,
    onEvent: (e: OrchestratorEvent) => void,
    mintQuoteId?: string
): Promise<{ finalInvoice: string; finalSwapId: string; meltResult: any }> {

    console.log('🪙 SLPM SwapBack: Starting SIMPLIFIED Cashu redemption (using encoded token like standalone)');

    const totalAvailable = allProofs.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log('💰 SLPM SwapBack: ALL Available proofs:', {
        count: allProofs.length,
        totalAmount: totalAvailable,
        mintUrl: ENV.CASHU_DEFAULT_MINT
    });

    try {
        console.log('⚡ SLPM SwapBack: Retrieving encoded token for standalone pattern...');

        let encodedToken: string | null = null;

        if (mintQuoteId) {
            console.log('🔍 SLPM SwapBack: Looking for token with quote ID:', mintQuoteId);
            encodedToken = await getEncodedTokenFromStorage(mintQuoteId);
        }

        if (!encodedToken) {
            console.warn('⚠️ No encoded token found for quote ID, trying localStorage scan...');
            // Fallback: scan localStorage for any cashu tokens
            if (typeof window !== 'undefined') {
                const keys = Object.keys(localStorage).filter(key => key.startsWith('slpm:cashu-token:'));
                if (keys.length > 0) {
                    const latestKey = keys[keys.length - 1]; // Get the most recent token
                    encodedToken = localStorage.getItem(latestKey);
                    console.log('✅ Found encoded token in localStorage:', latestKey);
                }
            }
        }

        if (!encodedToken) {
            console.warn('⚠️ No encoded token found anywhere, this may cause issues');
            throw new Error('No encoded token available - cannot use standalone script pattern');
        }

        console.log('✅ Successfully retrieved encoded token for direct melt');

        // PRE-CALCULATE MAX INVOICE: Use fee formula to determine optimal invoice size
        console.log('🧮 SLPM SwapBack: Calculating maximum invoice amount from token balance...');
        const maxCalcResult = await calculateMaxInvoiceAmount(encodedToken);

        if (!maxCalcResult.success) {
            throw new Error(`Failed to calculate max invoice amount: ${maxCalcResult.error}`);
        }

        console.log('💰 SLPM SwapBack: Token balance analysis:', {
            availableBalance: maxCalcResult.availableBalance,
            maxInvoiceAmount: maxCalcResult.maxAmount,
            originalInvoiceAmount: totalAmount
        });

        // ALWAYS get Atomiq quote for the maximum safe amount (prevents any size issues)
        console.log('🔄 SLPM SwapBack: Getting optimized Atomiq quote for max safe amount...');
        console.log(`   Using calculated safe amount: ${maxCalcResult.maxAmount} sats (original was ${totalAmount} sats)`);

        // Get new Atomiq swap with max safe amount that will definitely fit
        const optimizedSwap = await atomiq.beginLightningToStrkSwap(maxCalcResult.maxAmount, destination);

        console.log('✅ SLPM SwapBack: Got optimized Atomiq quote:', {
            swapId: optimizedSwap.id.slice(0, 20) + '...',
            safeAmount: maxCalcResult.maxAmount,
            invoicePrefix: optimizedSwap.invoice.slice(0, 30) + '...'
        });

        const finalInvoice = optimizedSwap.invoice;
        const finalSwapId = optimizedSwap.id;

        // SERVER-SIDE MELT: Receive token once and melt (with built-in retry capability)
        console.log('🔍 SLPM SwapBack: Running server-side melt with built-in retry...');
        onEvent({
            type: 'mix:progress',
            message: 'Melting ecash to Lightning (with retry capability)...',
            progress: 88
        });

        const serverMeltResult = await serverSideCashuMelt(encodedToken, finalInvoice, mintQuoteId);

        if (!serverMeltResult.success) {
            // Handle insufficient balance case - this means we need a smaller invoice
            if (serverMeltResult.details?.shortfall) {
                console.log('⚠️ SLPM SwapBack: Invoice too large for available proofs');
                console.log(`   Required: ${serverMeltResult.details.required} sats, Available: ${serverMeltResult.details.available} sats`);
                throw new Error(`Invoice too large for available balance. Required: ${serverMeltResult.details.required}, Available: ${serverMeltResult.details.available}`);
            }

            throw new Error(`Server-side melt failed: ${serverMeltResult.error}`);
        }

        console.log('✅ SLPM SwapBack: Server-side melt completed successfully');

        console.log('✅ SLPM SwapBack: Server-side melt completed successfully!', {
            invoiceAmount: serverMeltResult.result.invoiceAmount,
            changeAmount: serverMeltResult.result.changeAmount,
            changeCount: serverMeltResult.result.change?.length || 0
        });

        // Convert server result change proofs to EcashProof format for compatibility
        const changeProofs: EcashProof[] = (serverMeltResult.result.change || []).map((proof: any) => ({
            secret: proof.secret,
            signature: proof.C,
            amount: BigInt(proof.amount),
            currency: 'SAT' as const,
            keysetId: proof.id
        }));

        return {
            finalInvoice: finalInvoice,
            finalSwapId: finalSwapId,
            meltResult: {
                change: changeProofs,
                usedAmount: serverMeltResult.result.invoiceAmount
            }
        };

    } catch (error) {
        console.error('❌ SLPM SwapBack: SIMPLIFIED melt failed:', error);
        throw new Error(`Failed to melt ALL proofs: ${error}`);
    }
}

/* 
// COMMENTED OUT - All the old complex logic with mixing/splitting/delays
async function redeemCashuToInvoice(
    availableProofs: EcashProof[],
    initialInvoice: string,
    initialSwapId: string,
    targetAmount: number,
    destination: string,
    atomiq: RealAtomiqSwapClient
): Promise<{ finalInvoice: string; finalSwapId: string; meltResult: any }> {
    
    console.log('🪙 SLPM SwapBack: Starting Cashu redemption (server-side pattern)');
    
    const totalAvailable = availableProofs.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log('💰 SLPM SwapBack: Available proofs:', {
        count: availableProofs.length,
        totalAmount: totalAvailable
    });

    // Fee-aware invoice sizing using our existing server infrastructure
    let currentInvoice = initialInvoice;
    let currentSwapId = initialSwapId;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            console.log(`🔄 SLPM SwapBack: Attempt ${attempts + 1} - creating melt quote via server...`);
            
            // Use server-side melt-quote API (avoids CORS)
            const quoteResponse = await fetch('/api/cashu/melt-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    invoice: currentInvoice, 
                    mintUrl: ENV.CASHU_DEFAULT_MINT 
                })
            });
            
            if (!quoteResponse.ok) {
                throw new Error(`Melt quote failed: ${await quoteResponse.text()}`);
            }
            
            const meltQuote = await quoteResponse.json();
            const required = meltQuote.amount + meltQuote.fee_reserve;
            
            console.log('📋 SLPM SwapBack: Melt quote details:', {
                invoiceAmount: meltQuote.amount,
                feeReserve: meltQuote.fee_reserve,
                totalRequired: required,
                available: totalAvailable
            });

            if (required <= totalAvailable) {
                // Invoice fits! Execute the melt via server
                console.log('✅ SLPM SwapBack: Invoice fits, executing melt via server...');
                
                // Select proofs for payment (convert to Cashu format for server)
                const selectedEcashProofs = selectEcashProofsForAmount(availableProofs, required);
                const selectedCashuProofs = selectedEcashProofs.map((proof: EcashProof) => ({
                    secret: proof.secret,
                    C: proof.signature,
                    amount: Number(proof.amount),
                    id: proof.keysetId
                }));

                // Add proof validation before melt attempt
                console.log('🔍 SLPM SwapBack: Validating proof availability...');
                try {
                    const validationResponse = await fetch('/api/cashu/proof-states', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            proofs: selectedCashuProofs,
                            mintUrl: ENV.CASHU_DEFAULT_MINT
                        })
                    });

                    if (validationResponse.ok) {
                        const validation = await validationResponse.json();
                        const spentProofs = validation.states?.filter((s: any) => s.state !== 'UNSPENT') || [];
                        
                        if (spentProofs.length > 0) {
                            console.error('⚠️ SLPM SwapBack: Found spent/pending proofs, skipping to avoid "proofs pending" error');
                            throw new Error(`${spentProofs.length} proofs are not available (${spentProofs.map((p: any) => p.state).join(', ')})`);
                        }
                        console.log('✅ SLPM SwapBack: All selected proofs are available');
                    } else {
                        console.warn('⚠️ SLPM SwapBack: Could not validate proof states, proceeding anyway');
                    }
                } catch (validationError) {
                    console.warn('⚠️ SLPM SwapBack: Proof validation failed:', validationError instanceof Error ? validationError.message : String(validationError));
                    // Continue with melt attempt anyway
                }
                
                console.log('🎯 SLPM SwapBack: Selected proofs:', {
                    count: selectedCashuProofs.length,
                    totalValue: selectedCashuProofs.reduce((sum: number, p: any) => sum + p.amount, 0)
                });

                // Execute melt via server API (avoids CORS)
                const meltResponse = await fetch('/api/cashu/melt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quote: {
                            quote: meltQuote.quote,
                            amount: meltQuote.amount.toString(),
                            fee_reserve: meltQuote.fee_reserve.toString(),
                            unit: meltQuote.unit,
                            expiry: meltQuote.expiry,
                            request: meltQuote.request
                        },
                        proofs: selectedCashuProofs,
                        mintUrl: ENV.CASHU_DEFAULT_MINT
                    })
                });
                
                if (!meltResponse.ok) {
                    const errorText = await meltResponse.text();
                    
                    // Special handling for "proofs pending" error
                    if (errorText.includes('proofs are pending') || errorText.includes('proofs pending')) {
                        console.error('💔 SLPM SwapBack: Proofs are pending/used - this attempt failed');
                        throw new Error(`Proofs are already being used or spent: ${errorText}`);
                    }
                    
                    throw new Error(`Melt execution failed: ${errorText}`);
                }
                
                const meltResult = await meltResponse.json();
                
                console.log('⚡ SLPM SwapBack: Melt executed successfully!', {
                    changeCount: meltResult.change?.length || 0
                });

                // Convert change back to our EcashProof format
                const changeProofs: EcashProof[] = (meltResult.change || []).map((proof: any) => ({
                    secret: proof.secret,
                    signature: proof.C,
                    amount: BigInt(proof.amount),
                    currency: 'SAT' as const,
                    keysetId: proof.id
                }));

                return {
                    finalInvoice: currentInvoice,
                    finalSwapId: currentSwapId,
                    meltResult: {
                        change: changeProofs,
                        usedAmount: required
                    }
                };
            }

            // Invoice too large, resize it
            const buffer = 1;
            const recommended = Math.max(10, totalAvailable - meltQuote.fee_reserve - buffer);
            console.log(`⚠️ SLPM SwapBack: Invoice too large, resizing to ${recommended} sats`);
            
            // Create new swap with smaller amount
            const newSwap = await atomiq.beginLightningToStrkSwap(recommended, destination);
            currentInvoice = newSwap.invoice;
            currentSwapId = newSwap.id;
            
            attempts++;

        } catch (error) {
            console.error(`❌ SLPM SwapBack: Attempt ${attempts + 1} failed:`, error);
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new Error(`Failed to redeem Cashu after ${maxAttempts} attempts: ${error}`);
            }
            
            // Wait before retry to avoid hammering the mint
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }

    throw new Error('Failed to size invoice within available proof amount');
}

// Helper to select EcashProofs for payment
function selectEcashProofsForAmount(proofs: EcashProof[], targetAmount: number): EcashProof[] {
    const selected = [];
    let currentTotal = 0;

    // Sort by amount (smallest first for better change)
    const sortedProofs = [...proofs].sort((a, b) => Number(a.amount) - Number(b.amount));

    for (const proof of sortedProofs) {
        if (currentTotal >= targetAmount) break;
        selected.push(proof);
        currentTotal += Number(proof.amount);
    }

    if (currentTotal < targetAmount) {
        throw new Error(`Insufficient proofs: need ${targetAmount}, have ${currentTotal}`);
    }

    return selected;
}

// Helper to select proofs for payment (from standalone script) - kept for compatibility
function selectProofsForAmount(proofs: Proof[], targetAmount: number): Proof[] {
    const selected = [];
    let currentTotal = 0;

    // Sort by amount (smallest first for better change)
    const sortedProofs = [...proofs].sort((a, b) => a.amount - b.amount);

    for (const proof of sortedProofs) {
        if (currentTotal >= targetAmount) break;
        selected.push(proof);
        currentTotal += proof.amount;
    }

    if (currentTotal < targetAmount) {
        throw new Error(`Insufficient proofs: need ${targetAmount}, have ${currentTotal}`);
    }

    return selected;
}

// Helper to remove used proofs from available set
function removeUsedProofs(proofs: EcashProof[], usedAmount: number): EcashProof[] {
    const sorted = [...proofs].sort((a, b) => Number(a.amount) - Number(b.amount));
    const remaining = [];
    let removedAmount = 0;

    for (const proof of sorted) {
        if (removedAmount < usedAmount) {
            removedAmount += Number(proof.amount);
        } else {
            remaining.push(proof);
        }
    }

    return remaining;
}
*/
