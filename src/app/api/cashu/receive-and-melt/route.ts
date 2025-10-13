import { NextResponse } from 'next/server';
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { encodedToken, invoice } = await req.json();

        console.log('🔍 [RECEIVE-AND-MELT API] Client should have calculated invoice using fee formula');
        console.log('📋 [RECEIVE-AND-MELT API] Expected: invoice_amount = balance - max(2, 0.01*amount) - 1');

        if (!encodedToken || !invoice) {
            return NextResponse.json({
                error: 'Missing required fields: encodedToken and invoice'
            }, { status: 400 });
        }

        // Step 1: Decode token to get mint URL
        let decoded;
        let mintUrl;

        try {
            decoded = getDecodedToken(encodedToken);
            mintUrl = decoded.mint;
            const tokenAmount = decoded.proofs.reduce((sum: number, p: any) => sum + p.amount, 0);

            console.log('💰 [RECEIVE-AND-MELT API] Token details:', {
                mint: mintUrl,
                proofCount: decoded.proofs.length,
                tokenAmount
            });
        } catch (decodeError) {
            console.error('❌ [RECEIVE-AND-MELT API] Failed to decode token:', decodeError);
            return NextResponse.json({
                error: 'Invalid encoded token'
            }, { status: 400 });
        }

        // Step 2: Connect to mint and create wallet
        console.log('🏭 [RECEIVE-AND-MELT API] Connecting to mint:', mintUrl);
        const mint = new CashuMint(mintUrl);
        const wallet = new CashuWallet(mint);
        await wallet.loadMint();

        // Step 3: Receive token immediately (trust client calculated correct amount)
        console.log('📥 [RECEIVE-AND-MELT API] Receiving token (trusting client calculation)...');
        const receivedProofs = await wallet.receive(encodedToken);
        const actualAvailable = receivedProofs.reduce((sum: number, p: any) => sum + p.amount, 0);

        console.log('💰 [RECEIVE-AND-MELT API] Token received:', {
            proofCount: receivedProofs.length,
            totalAmount: actualAvailable
        });

        // Step 4: Extended delay + proof state verification
        console.log('⏳ [RECEIVE-AND-MELT API] Waiting for mint to fully process received proofs...');
        console.log('   Checking proof states before attempting melt (preventing "proofs are pending")');

        // Progressive proof state checking with increasing delays
        let proofsReady = false;
        const maxStateChecks = 6;

        for (let check = 1; check <= maxStateChecks; check++) {
            const delay = Math.min(5000 * check, 20000); // 5s, 10s, 15s, 20s, 20s, 20s
            console.log(`🔍 [RECEIVE-AND-MELT API] Proof state check ${check}/${maxStateChecks} (waiting ${delay}ms first)...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            try {
                // Check if proofs are ready by checking their state
                const proofStates = await wallet.checkProofsStates(receivedProofs);
                const pendingCount = proofStates.filter(state => state.state !== 'UNSPENT').length;

                console.log(`📊 [RECEIVE-AND-MELT API] Proof states check ${check}:`, {
                    totalProofs: receivedProofs.length,
                    unspentProofs: receivedProofs.length - pendingCount,
                    pendingProofs: pendingCount
                });

                if (pendingCount === 0) {
                    console.log('✅ [RECEIVE-AND-MELT API] All proofs are ready (UNSPENT state)!');
                    proofsReady = true;
                    break;
                } else {
                    console.log(`⏳ [RECEIVE-AND-MELT API] ${pendingCount} proofs still pending...`);
                }
            } catch (stateError) {
                console.log(`⚠️ [RECEIVE-AND-MELT API] Could not check proof states (attempt ${check}):`,
                    stateError instanceof Error ? stateError.message : String(stateError));
            }
        }

        if (!proofsReady) {
            console.log('⚠️ [RECEIVE-AND-MELT API] Proofs may still be pending, but proceeding with melt attempts...');
        }

        // Step 5: Create initial melt quote
        console.log('⚡ [RECEIVE-AND-MELT API] Creating melt quote and executing...');
        const meltQuote = await wallet.createMeltQuote(invoice);

        console.log('📊 [RECEIVE-AND-MELT API] Melt quote details:', {
            invoiceAmount: meltQuote.amount,
            feeReserve: meltQuote.fee_reserve,
            totalRequired: meltQuote.amount + meltQuote.fee_reserve,
            available: actualAvailable
        });

        // Step 6: Execute melt with retry logic and special pending handling
        console.log('⚡ [RECEIVE-AND-MELT API] Executing melt with retry capability...');

        const maxRetries = 8; // Further increased for persistent pending proof issues
        let meltResult: any = null;
        let lastError = '';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [RECEIVE-AND-MELT API] Melt attempt ${attempt}/${maxRetries}...`);

                // Create fresh melt quote for each attempt (in case quote expires)
                const freshMeltQuote = await wallet.createMeltQuote(invoice);
                const amountToMelt = freshMeltQuote.amount + freshMeltQuote.fee_reserve;

                console.log(`📊 [RECEIVE-AND-MELT API] Melt quote details:`, {
                    invoiceAmount: freshMeltQuote.amount,
                    feeReserve: freshMeltQuote.fee_reserve,
                    totalNeeded: amountToMelt,
                    availableProofs: actualAvailable
                });

                // IMPORTANT: Use wallet.send() to prepare correct proofs (following official guide)
                console.log(`🔄 [RECEIVE-AND-MELT API] Preparing proofs for melt using wallet.send()...`);
                const { keep, send } = await wallet.send(amountToMelt, receivedProofs, { includeFees: true });

                console.log(`💰 [RECEIVE-AND-MELT API] Proofs prepared:`, {
                    sendProofs: send.length,
                    sendAmount: send.reduce((sum, p) => sum + p.amount, 0),
                    keepProofs: keep.length,
                    keepAmount: keep.reduce((sum, p) => sum + p.amount, 0)
                });

                // Add timeout to prevent hanging on slow mints
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Melt operation timed out')), 60000)
                );

                // Use the prepared proofs (not original receivedProofs)
                console.log('⚡ [RECEIVE-AND-MELT API] Executing melt with prepared proofs...');
                const meltPromise = wallet.meltProofs(freshMeltQuote, send);
                const tempMeltResult: any = await Promise.race([meltPromise, timeoutPromise]);

                // FOLLOW GUIDE PATTERN: Verify melt completion with checkMeltQuote
                console.log('🔍 [RECEIVE-AND-MELT API] Verifying melt completion (following guide pattern)...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s like in guide

                const quoteCheck = await wallet.checkMeltQuote(freshMeltQuote.quote);
                console.log('📊 [RECEIVE-AND-MELT API] Melt quote verification:', {
                    state: quoteCheck.state,
                    quoteId: freshMeltQuote.quote.slice(0, 10) + '...',
                    hasPreimage: !!quoteCheck.payment_preimage
                });

                // Verify melt was actually successful according to the mint
                if (quoteCheck.state !== 'PAID') {
                    throw new Error(`Melt executed but quote state is: ${quoteCheck.state}. Expected: PAID`);
                }

                console.log('✅ [RECEIVE-AND-MELT API] Melt confirmed successful by mint!');
                if (quoteCheck.payment_preimage) {
                    console.log('🔐 [RECEIVE-AND-MELT API] Payment preimage received');
                }

                // Combine any change with kept proofs
                const allChangeProofs = [...(tempMeltResult.change || []), ...keep];
                meltResult = {
                    change: allChangeProofs,
                    changeAmount: allChangeProofs.reduce((sum: number, p: any) => sum + p.amount, 0),
                    invoiceAmount: freshMeltQuote.amount,
                    feeAmount: freshMeltQuote.fee_reserve,
                    paymentPreimage: quoteCheck.payment_preimage
                };

                console.log(`✅ [RECEIVE-AND-MELT API] Melt succeeded on attempt ${attempt}!`);
                break; // Success! Exit retry loop

            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                console.log(`⚠️ [RECEIVE-AND-MELT API] Melt attempt ${attempt} failed: ${lastError}`);

                // Check if the error happened during meltProofs() or during quote verification
                const isPendingError = lastError.toLowerCase().includes('pending');
                const isQuoteStateError = lastError.includes('quote state is:');

                if (attempt < maxRetries) {
                    let delay;

                    if (isPendingError) {
                        // "Proofs are pending" means mint is still syncing the received proofs
                        delay = Math.min(10000 * attempt, 45000); // 10s, 20s, 30s, 40s, 45s, 45s, 45s, 45s for pending
                        console.log(`⏳ [RECEIVE-AND-MELT API] 🔄 Proofs pending - very extended mint sync delay: ${delay}ms...`);
                        console.log(`   Coinos mint appears to need extra time - this is attempt ${attempt}/${maxRetries}`);
                        console.log(`   Total wait time so far: ~${(attempt * 10000) / 1000}+ seconds`);
                    } else if (isQuoteStateError) {
                        // Melt was initiated but quote verification failed - check again after delay
                        delay = 3000; // Fixed 3s for quote state checks
                        console.log(`⏳ [RECEIVE-AND-MELT API] 📋 Quote state check failed - waiting ${delay}ms for mint processing...`);
                    } else {
                        // Standard delays for other errors (timeouts, network issues)
                        delay = Math.min(2000 * attempt, 10000); // 2s, 4s, 6s, 8s, 10s for others
                        console.log(`⏳ [RECEIVE-AND-MELT API] Standard retry delay: ${delay}ms...`);
                    }

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Check if all attempts failed
        if (!meltResult) {
            throw new Error(`Melt failed after ${maxRetries} attempts. Last error: ${lastError}`);
        }

        const changeAmount = meltResult.change?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

        console.log('✅ [RECEIVE-AND-MELT API] Melt completed successfully:', {
            invoiceAmount: meltQuote.amount,
            changeAmount,
            changeProofs: meltResult.change?.length || 0
        });

        return NextResponse.json({
            success: true,
            result: {
                invoiceAmount: meltQuote.amount,
                change: meltResult.change || [],
                changeAmount,
                mintUrl
            }
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);

        console.error('❌ [RECEIVE-AND-MELT API] Error:', {
            message: msg,
            errorType: error instanceof Error ? error.constructor.name : typeof error
        });

        // Handle specific Cashu errors
        if (msg.includes('Token already spent') || msg.includes('bad response')) {
            return NextResponse.json({
                error: 'Token already spent or invalid'
            }, { status: 400 });
        }

        if (msg.includes('timed out')) {
            return NextResponse.json({
                error: 'Mint operation timed out'
            }, { status: 408 });
        }

        return NextResponse.json({
            error: `Receive and melt failed: ${msg}`
        }, { status: 500 });
    }
}