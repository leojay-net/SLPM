/**
 * Standalone Cashu Mainnet Test
 * 
 * This script tests the complete Cashu flow with real mainnet mints and Lightning Network:
 * 1. Generate a Lightning invoice for ecash minting
 * 2. Display invoice to user for manual payment
 * 3. Mint ecash tokens after payment confirmation
 * 4. Display and redeem ecash tokens
 * 5. Generate Lightning invoice for withdrawal
 * 6. Complete the withdrawal process
 */

import { CashuMint, CashuWallet, getDecodedToken, getEncodedTokenV4, MintQuoteState } from '@cashu/cashu-ts';
import readline from 'readline';

// Real mainnet Cashu mints (trusted)
const MAINNET_MINTS = [
    'https://mint.minibits.cash/Bitcoin',
    'https://mint.lnwallet.app',
    'https://mint.coinos.io',
    'https://mint.lnserver.com',
    'https://mint.0xchat.com',
    'https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC'
];

class CashuMainnetTest {
    private mint: CashuMint;
    private wallet: CashuWallet;
    private rl: readline.Interface;

    constructor(mintUrl: string) {
        this.mint = new CashuMint(mintUrl);
        this.wallet = new CashuWallet(this.mint);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`🪙 Initializing Cashu test with mint: ${mintUrl}`);
    }

    private async question(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    private async waitForEnter(message: string): Promise<void> {
        await this.question(`${message}\nPress Enter to continue...`);
    }

    private async displayInvoice(invoice: string, amount: number): Promise<void> {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ LIGHTNING INVOICE TO PAY ⚡');
        console.log('='.repeat(80));
        console.log(`Amount: ${amount} sats`);
        console.log('');
        console.log('Invoice (copy this):');
        console.log('-'.repeat(40));
        console.log(invoice);
        console.log('-'.repeat(40));
        console.log('');
        console.log('Instructions:');
        console.log('1. Copy the invoice above');
        console.log('2. Open your Lightning wallet');
        console.log('3. Paste and pay the invoice');
        console.log('4. Wait for payment confirmation');
        console.log('='.repeat(80));
    }

    private async displayEcashToken(token: string, amount: number): Promise<void> {
        console.log('\n' + '='.repeat(80));
        console.log('🎫 ECASH TOKEN GENERATED 🎫');
        console.log('='.repeat(80));
        console.log(`Amount: ${amount} sats`);
        console.log('');
        console.log('Token (copy this):');
        console.log('-'.repeat(40));
        console.log(token);
        console.log('-'.repeat(40));
        console.log('');
        console.log('This token represents your ecash and can be:');
        console.log('- Sent to others');
        console.log('- Redeemed for Lightning sats');
        console.log('- Stored securely offline');
        console.log('='.repeat(80));
    }

    async initialize(): Promise<void> {
        try {
            console.log('🔗 Connecting to Cashu mint...');
            await this.wallet.loadMint();
            console.log('✅ Connected successfully!');

            // Display mint info
            const mintInfo = await this.mint.getInfo();
            console.log('\n📋 Mint Information:');
            console.log(`Name: ${mintInfo.name || 'Unknown'}`);
            console.log(`Description: ${mintInfo.description || 'No description'}`);
            console.log(`Version: ${mintInfo.version || 'Unknown'}`);
            console.log(`URL: ${this.mint.mintUrl}`);

        } catch (error) {
            console.error('❌ Failed to connect to mint:', error);
            throw error;
        }
    }

    async testMintFlow(): Promise<string> {
        console.log('\n🏭 STARTING MINT FLOW');
        console.log('==================');

        // Get amount from user
        const amountStr = await this.question('Enter amount in sats to mint (e.g., 1000): ');
        const amount = parseInt(amountStr);

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid amount');
        }

        console.log(`\n📋 Creating mint quote for ${amount} sats...`);

        // Create mint quote
        const mintQuote = await this.wallet.createMintQuote(amount);
        console.log(`✅ Quote created: ${mintQuote.quote}`);

        if (!mintQuote.request) {
            throw new Error('No Lightning invoice received from mint');
        }

        // Display invoice for payment
        await this.displayInvoice(mintQuote.request, amount);
        await this.waitForEnter('Pay the invoice in your Lightning wallet, then');

        // Check payment status
        console.log('\n⏳ Checking payment status...');
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes with 10s intervals

        while (attempts < maxAttempts) {
            try {
                const quoteStatus = await this.wallet.checkMintQuote(mintQuote.quote);

                if (quoteStatus.state === MintQuoteState.PAID) {
                    console.log('✅ Payment confirmed!');
                    break;
                }

                if (quoteStatus.state === MintQuoteState.ISSUED) {
                    console.log('✅ Payment confirmed and tokens already issued!');
                    break;
                }

                console.log(`⏳ Payment pending... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                attempts++;

            } catch (error) {
                console.error('❌ Error checking quote:', error);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        if (attempts >= maxAttempts) {
            throw new Error('Payment not confirmed within timeout period');
        }

        // Mint the proofs
        console.log('\n🏭 Minting ecash proofs...');
        const proofs = await this.wallet.mintProofs(amount, mintQuote.quote);
        console.log(`✅ Minted ${proofs.length} proofs with total value: ${proofs.reduce((sum, p) => sum + p.amount, 0)} sats`);

        // Create token
        const token = getEncodedTokenV4({
            mint: this.mint.mintUrl,
            proofs: proofs
        });

        await this.displayEcashToken(token, amount);

        return token;
    }

    async testRedemptionFlow(token?: string): Promise<void> {
        console.log('\n💸 STARTING REDEMPTION FLOW');
        console.log('==========================');

        let ecashToken = token;

        if (!ecashToken) {
            ecashToken = await this.question('Enter ecash token to redeem (or press Enter to use generated token): ');
            if (!ecashToken.trim()) {
                console.log('❌ No token provided');
                return;
            }
        }

        // Decode and validate token
        let decodedToken;
        try {
            decodedToken = getDecodedToken(ecashToken);
            console.log('\n📋 Token Information:');
            console.log(`Mint: ${decodedToken.mint}`);
            console.log(`Total amount: ${decodedToken.proofs.reduce((sum, p) => sum + p.amount, 0)} sats`);
            console.log(`Number of proofs: ${decodedToken.proofs.length}`);
        } catch (error) {
            throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Get Lightning invoice from user for withdrawal
        const invoice = await this.question('Enter Lightning invoice for withdrawal (or generate one from your wallet): ');

        if (!invoice.trim()) {
            console.log('❌ No invoice provided');
            return;
        }

        try {
            console.log('\n💰 Processing withdrawal...');

            // Create melt quote
            const meltQuote = await this.wallet.createMeltQuote(invoice);
            console.log(`📋 Melt quote created:`);
            console.log(`Amount: ${meltQuote.amount} sats`);
            console.log(`Fee reserve: ${meltQuote.fee_reserve} sats`);
            console.log(`Total needed: ${meltQuote.amount + meltQuote.fee_reserve} sats`);

            // Receive the token first to get proofs
            const receivedProofs = await this.wallet.receive(ecashToken);
            const totalReceived = receivedProofs.reduce((sum, p) => sum + p.amount, 0);
            console.log(`✅ Received proofs worth ${totalReceived} sats`);

            // Check if we have enough
            const requiredAmount = meltQuote.amount + meltQuote.fee_reserve;
            if (totalReceived < requiredAmount) {
                throw new Error(`Insufficient funds: have ${totalReceived} sats, need ${requiredAmount} sats`);
            }

            // Melt the proofs
            const meltResult = await this.wallet.meltProofs(meltQuote, receivedProofs);

            console.log('✅ Withdrawal completed!');
            if (meltResult.change && meltResult.change.length > 0) {
                const changeAmount = meltResult.change.reduce((sum, p) => sum + p.amount, 0);
                console.log(`💰 Change received: ${changeAmount} sats`);

                // Create token for change
                const changeToken = getEncodedTokenV4({
                    mint: this.mint.mintUrl,
                    proofs: meltResult.change
                });

                console.log('\n🎫 Change token:');
                console.log('-'.repeat(40));
                console.log(changeToken);
                console.log('-'.repeat(40));
            }

        } catch (error) {
            console.error('❌ Withdrawal failed:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    async runFullTest(): Promise<void> {
        try {
            await this.initialize();

            console.log('\n🚀 STARTING CASHU MAINNET TEST');
            console.log('==============================');

            const testChoice = await this.question(`
Choose test option:
1. Full flow (mint + redeem)
2. Mint only
3. Redeem only
Enter choice (1-3): `);

            switch (testChoice.trim()) {
                case '1':
                    console.log('\n🔄 Running full flow test...');
                    const token = await this.testMintFlow();
                    await this.waitForEnter('\n✅ Mint flow completed. Ready to test redemption?');
                    await this.testRedemptionFlow(token);
                    break;

                case '2':
                    console.log('\n🏭 Running mint-only test...');
                    await this.testMintFlow();
                    break;

                case '3':
                    console.log('\n💸 Running redemption-only test...');
                    await this.testRedemptionFlow();
                    break;

                default:
                    console.log('❌ Invalid choice');
                    return;
            }

            console.log('\n🎉 Test completed successfully!');

        } catch (error) {
            console.error('\n❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
        } finally {
            this.rl.close();
        }
    }

    async testTokenValidation(): Promise<void> {
        console.log('\n🔍 TESTING TOKEN VALIDATION');
        console.log('===========================');

        const token = await this.question('Enter token to validate: ');

        try {
            const decoded = getDecodedToken(token);
            console.log('\n✅ Token is valid!');
            console.log(`Mint: ${decoded.mint}`);
            console.log(`Unit: ${decoded.unit}`);
            console.log(`Proofs: ${decoded.proofs.length}`);
            console.log(`Total amount: ${decoded.proofs.reduce((sum, p) => sum + p.amount, 0)} sats`);

            // Check if mint is trusted
            const isTrusted = MAINNET_MINTS.includes(decoded.mint);
            console.log(`Trusted mint: ${isTrusted ? '✅ Yes' : '⚠️ No'}`);

        } catch (error) {
            console.error('❌ Invalid token:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
}

// Main execution
async function main() {
    console.log('🪙 Cashu Mainnet Standalone Test');
    console.log('================================');

    // Display available mints
    console.log('\n📋 Available Mainnet Mints:');
    MAINNET_MINTS.forEach((mint, index) => {
        console.log(`${index + 1}. ${mint}`);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const mintChoice = await new Promise < string > ((resolve) => {
            rl.question(`\nSelect mint (1-${MAINNET_MINTS.length}) or enter custom URL: `, resolve);
        });

        let selectedMint: string;
        const mintIndex = parseInt(mintChoice) - 1;

        if (!isNaN(mintIndex) && mintIndex >= 0 && mintIndex < MAINNET_MINTS.length) {
            selectedMint = MAINNET_MINTS[mintIndex];
        } else if (mintChoice.startsWith('http')) {
            selectedMint = mintChoice;
        } else {
            throw new Error('Invalid mint selection');
        }

        rl.close();

        const tester = new CashuMainnetTest(selectedMint);
        await tester.runFullTest();

    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        rl.close();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { CashuMainnetTest, MAINNET_MINTS };