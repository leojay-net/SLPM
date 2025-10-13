/**
 * Cashu Token Redemption Helper
 * 
 * This script helps you redeem Cashu tokens by automatically detecting
 * the correct mint and handling the redemption process.
 */

import { CashuMainnetTest, MAINNET_MINTS } from './test-cashu-mainnet-standalone';
import { getDecodedToken } from '@cashu/cashu-ts';
import * as readline from 'readline';

async function redeemToken(): Promise<void> {
    console.log('🎫 Cashu Token Redemption Helper');
    console.log('================================');

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
        // Get token from user
        const token = await question('\n📋 Enter your ecash token to redeem:\n');

        if (!token.trim()) {
            console.log('❌ No token provided');
            return;
        }

        // Detect mint from token
        let mintUrl: string;
        try {
            const decoded = getDecodedToken(token);
            mintUrl = decoded.mint;
            const totalAmount = decoded.proofs.reduce((sum: number, p: any) => sum + p.amount, 0);

            console.log('\n✅ Token validated successfully!');
            console.log(`🏭 Mint: ${mintUrl}`);
            console.log(`💰 Amount: ${totalAmount} sats`);
            console.log(`🎫 Proofs: ${decoded.proofs.length}`);

            // Check if mint is in our trusted list
            const isTrusted = MAINNET_MINTS.includes(mintUrl as any);
            console.log(`🔒 Trusted mint: ${isTrusted ? '✅ Yes' : '⚠️ No (proceed with caution)'}`);

        } catch (error) {
            console.error('❌ Invalid token:', error instanceof Error ? error.message : 'Unknown error');
            return;
        }

        // Ask for Lightning invoice
        console.log('\n💰 Prepare your Lightning invoice for withdrawal:');
        console.log('1. Open your Lightning wallet (Phoenix, Wallet of Satoshi, etc.)');
        console.log('2. Generate an invoice for the amount you want to withdraw');
        console.log('3. Copy the invoice');
        console.log('');

        const invoice = await question('📋 Enter Lightning invoice for withdrawal:\n');

        if (!invoice.trim()) {
            console.log('❌ No Lightning invoice provided');
            return;
        }

        // Initialize test with correct mint
        console.log(`\n🔗 Connecting to mint: ${mintUrl}`);
        const tester = new CashuMainnetTest(mintUrl);

        // Initialize the connection
        const initResult = await tester.initialize();
        if (!initResult.success) {
            console.error('❌ Failed to connect to mint:', initResult.message);
            return;
        }

        // Process redemption
        console.log('\n💸 Processing redemption...');

        try {
            // Create a minimal redemption flow
            const decoded = getDecodedToken(token);

            // Create melt quote
            const meltQuote = await tester['wallet'].createMeltQuote(invoice);
            console.log(`📋 Melt quote created:`);
            console.log(`Amount: ${meltQuote.amount} sats`);
            console.log(`Fee reserve: ${meltQuote.fee_reserve} sats`);
            console.log(`Total needed: ${meltQuote.amount + meltQuote.fee_reserve} sats`);

            // Receive the token to get proofs
            const receivedProofs = await tester['wallet'].receive(token);
            const totalReceived = receivedProofs.reduce((sum, p) => sum + p.amount, 0);
            console.log(`✅ Token received: ${totalReceived} sats`);

            // Check if we have enough
            const requiredAmount = meltQuote.amount + meltQuote.fee_reserve;
            if (totalReceived < requiredAmount) {
                console.error(`❌ Insufficient funds: have ${totalReceived} sats, need ${requiredAmount} sats`);
                console.log('\n💡 Solutions:');
                console.log('1. Generate a smaller Lightning invoice');
                console.log('2. Add more ecash tokens to cover fees');
                return;
            }

            // Confirm redemption
            const confirm = await question(`\n⚠️  Confirm redemption of ${totalReceived} sats? (yes/no): `);
            if (confirm.toLowerCase() !== 'yes') {
                console.log('❌ Redemption cancelled');
                return;
            }

            // Melt the proofs
            const meltResult = await tester['wallet'].meltProofs(meltQuote, receivedProofs);

            console.log('\n🎉 SUCCESS! Token redeemed successfully!');
            console.log(`💰 Amount sent: ${meltQuote.amount} sats`);
            console.log(`⚡ Lightning payment completed!`);

            if (meltResult.change && meltResult.change.length > 0) {
                const changeAmount = meltResult.change.reduce((sum, p) => sum + p.amount, 0);
                console.log(`\n💰 Change received: ${changeAmount} sats`);

                // Create token for change
                const { getEncodedTokenV4 } = await import('@cashu/cashu-ts');
                const changeToken = getEncodedTokenV4({
                    mint: mintUrl,
                    proofs: meltResult.change
                });

                console.log('\n🎫 Your change token (save this):');
                console.log('='.repeat(80));
                console.log(changeToken);
                console.log('='.repeat(80));
            }

            console.log('\n✅ Check your Lightning wallet - you should receive the payment shortly!');

        } catch (error) {
            console.error('\n❌ Redemption failed:', error instanceof Error ? error.message : 'Unknown error');

            if (error instanceof Error) {
                if (error.message.includes('Token already spent')) {
                    console.log('\n💡 This token was already spent/redeemed.');
                    console.log('Each ecash token can only be spent once.');
                } else if (error.message.includes('keyset')) {
                    console.log('\n💡 Keyset error - the mint may have updated its keys.');
                    console.log('Try again or contact the mint operator.');
                } else if (error.message.includes('Insufficient')) {
                    console.log('\n💡 Not enough funds to cover Lightning network fees.');
                    console.log('Try with a smaller withdrawal amount.');
                }
            }
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
        rl.close();
    }
}

// Run the redemption helper
if (require.main === module) {
    redeemToken().catch(console.error);
}