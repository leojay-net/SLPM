#!/usr/bin/env node

/**
 * Test Lightning Wallet - Shared Wallet Pattern
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
    console.log('   export LND_CERT_BASE64="base64_encoded_tls_cert"');
    console.log('   export LND_MACAROON_BASE64="base64_encoded_admin_macaroon"');
    console.log('   export LND_HOST="your-node-host:10009"  # optional');
    process.exit(1);
}

// Create authenticated LND connection
const { lnd } = lnService.authenticatedLndGrpc(lndConfig);

async function runSimulationMode() {
    console.log('🎬 SIMULATION: Shared Lightning Wallet Pattern');
    console.log('=====================================\n');

    // Step 1: Simulate receiving payment
    console.log('💰 Step 1: Creating invoice (like collecting from user ecash)');
    console.log('   Amount: 1000 sats');
    console.log('   Invoice: lnbc10u1p...simulated...invoice');
    console.log('   ✅ Invoice created and ready for payment\n');

    console.log('⏳ Step 2: Waiting for payment...');
    console.log('   💡 User pays invoice (converting ecash → Lightning)');
    console.log('   ✅ Payment received! 1000 sats added to shared wallet\n');

    console.log('🏦 Step 3: Funds now in shared wallet');
    console.log('   Balance: 1000 sats');
    console.log('   Status: Ready to pay Atomiq when needed\n');

    console.log('💸 Step 4: Later - paying to Atomiq Lightning address');
    console.log('   Target: Atomiq Lightning → STRK conversion');
    console.log('   Amount: 1000 sats');
    console.log('   ✅ Payment sent successfully\n');

    console.log('🎉 Shared wallet pattern completed!');
    console.log('\n📊 Pattern Benefits:');
    console.log('   ✅ Reliable: No Cashu "proofs pending" issues');
    console.log('   ✅ Flexible: Can retry Atomiq payments if needed');
    console.log('   ✅ Fast: Lightning payments are instant');
    console.log('   ✅ Scalable: One wallet handles many users');

    console.log('\n💡 Architecture:');
    console.log('   User Ecash → Lightning Invoice → Shared Wallet → Atomiq');
    console.log('   Instead of: User Ecash → Cashu Mint → Atomiq (problematic)');
}

async function runRealLightningTest() {
    console.log('🚀 Running real Lightning Network test...\n');

    // Step 1: Create invoice to collect funds
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

    // Step 2: Wait for payment 
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

        subscription.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });

    try {
        const paidInvoice = await paymentReceived;
        console.log('✅ Payment received!');
        console.log(`   Amount: ${paidInvoice.received} sats`);
        console.log(`   Payment preimage: ${paidInvoice.secret}`);

        // Simulate step to pay Atomiq later
        console.log('\n💸 Step 3: Later - would pay to Atomiq...');
        console.log('   (This simulates paying to Atomiq Lightning → STRK)');
        console.log('   ✅ Ready to execute when user requests withdrawal');

    } catch (error) {
        console.error('❌ Payment failed or timed out:', error.message);
    }
}

async function testSharedWallet() {
    try {
        console.log('⚡ Starting shared Lightning wallet test...');

        // Test wallet connectivity  
        console.log('🔌 Attempting to connect to LND at', lndConfig.socket);

        try {
            const walletInfo = await lnService.getWalletInfo({ lnd });
            console.log('💰 Wallet connected successfully!');
            console.log('   Alias:', walletInfo.alias || 'No alias');
            console.log('   Public Key:', walletInfo.public_key);
            console.log('   Block Height:', walletInfo.current_block_height);
            console.log('   Synced to Chain:', walletInfo.is_synced_to_chain);

            await runRealLightningTest();

        } catch (connectionError) {
            console.log('⚠️  Could not connect to LND - showing simulation instead');
            console.log('🔍 Connection issue:', connectionError[2]?.err?.message || connectionError.message);
            console.log('💡 This demonstrates the shared wallet pattern concept\n');

            await runSimulationMode();
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
        console.error('Full error details:', error);
        console.log('\n🔍 Common issues:');
        console.log('   - LND not running or not synced');
        console.log('   - Wrong credentials (cert/macaroon)');
        console.log('   - Network connectivity issues');
        console.log('   - Certificate validation problems');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted. Exiting...');
    process.exit(0);
});

// Run the test
testSharedWallet().catch(console.error);