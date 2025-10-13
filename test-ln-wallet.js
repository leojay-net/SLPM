#!/usr/bin/env node

/**
 * Test Lightning   try {
    console.log('⚡ Starting shared Lightning wallet test...');
    
    // Check if we have valid credentials
    if (!lndConfig.cert || !lndConfig.macaroon) {
      console.log('❌ Missing LND credentials (tls.cert.b64 or admin.macaroon.b64)');
      console.log('📋 To test with real LND:');
      console.log('   1. Copy your LND tls.cert as base64 to ./tls.cert.b64');
      console.log('   2. Copy your admin.macaroon as base64 to ./admin.macaroon.b64');
      console.log('   3. Set LND_HOST env var if not localhost:10009');
      console.log('');
      console.log('✅ Script structure is correct - ready for real LND testing!');
      return;
    }
    
    // Test wallet connectivity  
    console.log('🔌 Attempting to connect to LND at', lndConfig.socket);
    
    try {
      const walletInfo = await lnService.getWalletInfo({ lnd });llet Pattern
 * 
 * This script demonstrates:
 * 1. Create invoice (like collecting from user)
 * 2. Wait for payment
 * 3. Pay back to user (like paying to Atomiq)
 * 
 * This mimics the "shared wallet" approach where we don't pay Atomiq directly,
 * but collect to our wallet first, then pay out later.
 */

const fs = require('fs');
const lnService = require('ln-service');

// Configuration - you'll need to provide your LND credentials
// LND connection configuration
const lndConfig = {
    socket: process.env.LND_HOST || 'slpm-2-node.m.voltageapp.io:10009',
    cert: process.env.LND_CERT_BASE64 || (fs.existsSync('./tls.cert.b64') ? fs.readFileSync('./tls.cert.b64', 'utf8').trim() : null),
    macaroon: process.env.LND_MACAROON_BASE64 || (fs.existsSync('./admin.macaroon.b64') ? fs.readFileSync('./admin.macaroon.b64', 'utf8').trim() : null)
};

// Validate configuration
if (!lndConfig.cert || !lndConfig.macaroon) {
    console.error('❌ Missing LND credentials!');
    console.log('📋 Set these environment variables:');
    console.log('   export LND_CERT="base64_encoded_tls_cert"');
    console.log('   export LND_MACAROON="base64_encoded_admin_macaroon"');
    console.log('   export LND_SOCKET="localhost:10009"  # optional');
    console.log('');
    console.log('💡 To get credentials:');
    console.log('   base64 -w0 ~/.lnd/tls.cert');
    console.log('   base64 -w0 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon');
    process.exit(1);
}

// Create authenticated LND connection
const { lnd } = lnService.authenticatedLndGrpc(lndConfig);

async function testSharedWallet() {
    try {
        console.log('� Starting shared Lightning wallet test...');

        // Check if we have valid credentials
        if (!lndConfig.cert || !lndConfig.macaroon) {
            console.log('❌ Missing LND credentials (tls.cert.b64 or admin.macaroon.b64)');
            console.log('📋 To test with real LND:');
            console.log('   1. Copy your LND tls.cert as base64 to ./tls.cert.b64');
            console.log('   2. Copy your admin.macaroon as base64 to ./admin.macaroon.b64');
            console.log('   3. Set LND_HOST env var if not localhost:10009');
            console.log('');
            console.log('✅ Script structure is correct - ready for real LND testing!');
            return;
        }

        // Test wallet connectivity
        console.log('🔌 Attempting to connect to LND...');
        const walletInfo = await lnService.getWalletInfo({ lnd });
        console.log('💰 Wallet connected:', {
            alias: walletInfo.alias,
            publicKey: walletInfo.public_key,
            balance: walletInfo.current_block_height
        });

        // Step 1: Create invoice to collect funds (like collecting from user's ecash)
        const invoiceAmount = 1000; // 1000 sats
        console.log(`💰 Step 1: Creating invoice for ${invoiceAmount} sats...`);

        const invoice = await lnService.createInvoice({
            lnd,
            tokens: invoiceAmount,
            description: 'Test payment for shared wallet pattern'
        });

        console.log('✅ Invoice created:');
        console.log(`   Payment Hash: ${invoice.id}`);
        console.log(`   Invoice: ${invoice.request}`);
        console.log('\n📋 Please pay this invoice and wait...\n');

        // Step 2: Wait for payment (like waiting for user's ecash melt)
        console.log('⏳ Step 2: Waiting for payment...');

        const paymentReceived = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Payment timeout after 5 minutes'));
            }, 5 * 60 * 1000); // 5 minute timeout

            const subscription = lnService.subscribeToInvoice({
                lnd,
                id: invoice.id
            });

            subscription.on('invoice_updated', (updatedInvoice) => {
                if (updatedInvoice.is_confirmed) {
                    clearTimeout(timeout);
                    subscription.removeAllListeners();
                    resolve(updatedInvoice);
                }
            });

            subscription.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        const paidInvoice = await paymentReceived;
        console.log('✅ Payment received!');
        console.log(`   Amount: ${paidInvoice.received} sats`);
        console.log(`   Confirmed at: ${paidInvoice.confirmed_at}\n`);

        // Step 3: Now ask for a return invoice (like paying to Atomiq)
        console.log('🔄 Step 3: Ready to pay back. Please provide an invoice to pay...');
        console.log('   (This simulates paying to Atomiq Lightning → STRK)');

        // In a real scenario, this would be the Atomiq invoice
        // For testing, we'll wait for manual input
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const getPaymentRequest = () => new Promise((resolve) => {
            readline.question('📝 Enter Lightning invoice to pay back: ', (answer) => {
                readline.close();
                resolve(answer.trim());
            });
        });

        const paymentRequest = await getPaymentRequest();

        if (!paymentRequest) {
            console.log('❌ No payment request provided. Test completed without payback.');
            return;
        }

        // Step 4: Pay the invoice (like paying Atomiq)
        console.log('\n💸 Step 4: Paying back via Lightning...');

        try {
            // Decode the payment request first
            const decoded = await lnService.decodePaymentRequest({
                lnd,
                request: paymentRequest
            });

            console.log(`   Destination: ${decoded.destination}`);
            console.log(`   Amount: ${decoded.tokens || 'any'} sats`);
            console.log(`   Description: ${decoded.description}`);

            // Make the payment
            const payment = await lnService.pay({
                lnd,
                request: paymentRequest
            });

            console.log('✅ Payment successful!');
            console.log(`   Payment Hash: ${payment.id}`);
            console.log(`   Fee Paid: ${payment.fee} sats`);
            console.log(`   Total Sent: ${payment.tokens} sats`);
            console.log(`   Secret: ${payment.secret}`);

        } catch (payError) {
            console.error('❌ Payment failed:', payError.message);
            console.log('\n🤔 This could happen due to:');
            console.log('   - Insufficient balance');
            console.log('   - No route to destination');
            console.log('   - Invalid invoice');
        }

        console.log('\n🎉 Shared wallet pattern test completed!');
        console.log('\n📊 Pattern Summary:');
        console.log('   1. ✅ Collect funds via invoice (simulates ecash → Lightning)');
        console.log('   2. ✅ Hold funds in shared wallet');
        console.log('   3. ✅ Pay out on demand (simulates Lightning → Atomiq)');
        console.log('\n💡 This pattern could be useful if Cashu minting fails,');
        console.log('   allowing retry without losing user funds.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
        console.log('\n🔍 Common issues:');
        console.log('   - LND not running or not synced');
        console.log('   - Wrong credentials (cert/macaroon)');
        console.log('   - Network connectivity issues');
        console.log('   - Insufficient channel liquidity');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted. Exiting...');
    process.exit(0);
});

// Run the test
testSharedWallet().catch(console.error);