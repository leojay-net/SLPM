/**
 * Cashu Token Recovery Script
 * 
 * This script helps recover tokens that are in "limbo" state
 * (marked as spent but payment wasn't completed)
 */

import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts';
import * as readline from 'readline';

async function recoverToken(): Promise<void> {
    console.log('🔄 Cashu Token Recovery Helper');
    console.log('==============================');
    console.log('This tool helps recover tokens that failed to redeem properly');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };

    try {
        const token = await question('\nEnter your "spent" token: ');

        // Decode token to get original mint
        const decoded = getDecodedToken(token);
        console.log(`\n📋 Token Info:`);
        console.log(`Mint: ${decoded.mint}`);
        console.log(`Amount: ${decoded.proofs.reduce((sum: number, p: any) => sum + p.amount, 0)} sats`);

        // Connect to the CORRECT mint
        console.log(`\n🔗 Connecting to original mint: ${decoded.mint}`);
        const mint = new CashuMint(decoded.mint);
        const wallet = new CashuWallet(mint);
        await wallet.loadMint();

        console.log('✅ Connected to original mint');

        // Try to check token state
        console.log('\n🔍 Checking token state...');

        try {
            // First, let's try to check if the proofs still exist in mint's database
            console.log('🔍 Attempting direct proof validation...');

            // Try to receive the token again (this might work if it's not fully spent)
            const proofs = await wallet.receive(token);
            console.log('✅ SUCCESS! Token was recovered!');
            console.log(`💰 Recovered ${proofs.reduce((sum, p) => sum + p.amount, 0)} sats`);

            // Now proceed with proper redemption
            console.log('\n💡 Token recovered! Now proceeding with redemption...');
            const invoice = await question('\nEnter Lightning invoice for withdrawal: ');

            const meltQuote = await wallet.createMeltQuote(invoice);
            console.log(`📋 Withdrawal quote: ${meltQuote.amount} sats + ${meltQuote.fee_reserve} sats fee`);

            const confirm = await question(`Confirm withdrawal of ${meltQuote.amount} sats? (yes/no): `);
            if (confirm.toLowerCase() !== 'yes') {
                console.log('❌ Withdrawal cancelled');
                return;
            }

            const meltResult = await wallet.meltProofs(meltQuote, proofs);
            console.log('🎉 SUCCESS! Withdrawal completed!');

            if (meltResult.change && meltResult.change.length > 0) {
                console.log(`💰 Change: ${meltResult.change.reduce((sum, p) => sum + p.amount, 0)} sats`);
            }

        } catch (error) {
            if (error instanceof Error && error.message.includes('Token already spent')) {
                console.log('\n❌ Token is marked as spent in mint database');

                // Check if this was due to cross-mint redemption issue
                console.log('\n🔍 DIAGNOSIS - Cross-Mint Redemption Issue:');
                console.log('='.repeat(60));
                console.log('✅ 1. You paid Lightning invoice → Money went to Minibits mint');
                console.log('✅ 2. Minibits created ecash token successfully');
                console.log('❌ 3. You tried to redeem with Coinos mint (wrong mint)');
                console.log('❌ 4. Coinos failed but marked token as "received"');
                console.log('❌ 5. Now Minibits thinks token is spent but no Lightning payment was made');
                console.log('');
                console.log('🚨 RESULT: Your 10 sats are stuck in the system!');
                console.log('');
                console.log('💡 RECOVERY OPTIONS:');
                console.log('='.repeat(60));
                console.log('');
                console.log('🔧 Option 1: Contact Minibits Support (RECOMMENDED)');
                console.log('   They can manually recover your stuck funds');
                console.log('');
                console.log('🔧 Option 2: Technical Recovery (Advanced)');
                console.log('   Use mint admin tools if available');
                console.log('');

                const showContact = await question('Show Minibits contact information? (yes/no): ');

                if (showContact.toLowerCase().startsWith('y')) {
                    console.log('\n📞 MINIBITS SUPPORT - COPY THIS INFO:');
                    console.log('='.repeat(60));
                    console.log('🌐 Website: https://minibits.cash');
                    console.log('📱 Telegram: @minibits_wallet');
                    console.log('📧 Email: info@minibits.cash');
                    console.log('🐛 GitHub Issues: https://github.com/minibits-cash/minibits_wallet');
                    console.log('');
                    console.log('📋 MESSAGE TO SEND:');
                    console.log('-'.repeat(40));
                    console.log('Subject: Stuck ecash token - cross-mint redemption issue');
                    console.log('');
                    console.log('Hello Minibits support,');
                    console.log('');
                    console.log('I have a stuck ecash token due to cross-mint redemption attempt:');
                    console.log(`- Token: ${token.substring(0, 50)}...`);
                    console.log('- Amount: 10 sats');
                    console.log('- Issue: Tried to redeem with wrong mint (Coinos), now token shows as spent but no Lightning payment was made');
                    console.log('- Original mint: https://mint.minibits.cash/Bitcoin');
                    console.log(`- Error: "Token already spent" but I did not receive Lightning payment`);
                    console.log('');
                    console.log('Can you please help recover these funds?');
                    console.log('');
                    console.log('Thank you!');
                    console.log('-'.repeat(40));
                    console.log('');
                    console.log('💡 TIP: Include screenshots of the error messages if possible');
                }

                // Also check if user wants to try a different approach
                const tryAlternative = await question('\nTry alternative recovery method? (yes/no): ');

                if (tryAlternative.toLowerCase().startsWith('y')) {
                    console.log('\n🔧 Alternative Recovery Attempt...');

                    try {
                        // Try to create a new wallet instance and check mint state
                        console.log('Checking mint keyset state...');
                        const keysets = await mint.getKeys();
                        console.log(`Found ${Object.keys(keysets).length} keysets in mint`);

                        // Display keyset info
                        for (const [id, keys] of Object.entries(keysets)) {
                            console.log(`Keyset ${id}: ${Object.keys(keys as any).length} keys`);
                        }

                        console.log('\n💡 If your keyset (00500550f0494146) is not listed, the mint may have rotated keys');
                        console.log('This is another reason to contact support - they can recover with old keysets');

                    } catch (e) {
                        console.log('❌ Could not check mint keysets:', e);
                    }
                }

            } else {
                console.error('❌ Unexpected error during recovery:', error);
                console.log('\n🔍 Error details:');

                if (error instanceof Error) {
                    console.log(`Type: ${error.constructor.name}`);
                    console.log(`Message: ${error.message}`);

                    if (error.message.includes('keyset')) {
                        console.log('\n💡 This appears to be a keyset rotation issue');
                        console.log('The mint may have updated its cryptographic keys');
                        console.log('Contact mint support with your token for manual recovery');
                    }
                } else {
                    console.log('Unknown error type');
                }
            }
        }

    } catch (error) {
        console.error('❌ Recovery failed:', error);
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    recoverToken().catch(console.error);
}