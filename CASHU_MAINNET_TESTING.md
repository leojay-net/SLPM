# Cashu Mainnet Testing Guide

This guide explains how to use the standalone Cashu mainnet test scripts to verify Cashu ecash functionality with real Lightning Network payments before integrating with the main SLPM application.

## Overview

The standalone test allows you to:
- Generate Lightning invoices and pay them manually
- Mint ecash tokens using real Bitcoin mainnet mints
- Display and validate ecash tokens
- Redeem ecash tokens back to Lightning payments
- Test the complete flow without relying on testnet limitations

## Files

- `test-cashu-mainnet-standalone.ts` - TypeScript version (recommended)
- `test-cashu-mainnet-standalone.js` - JavaScript version
- Both files provide identical functionality

## Prerequisites

1. **Lightning Wallet**: Have a Lightning wallet ready (Phoenix, Wallet of Satoshi, etc.)
2. **Bitcoin**: Small amount of Bitcoin for testing (minimum 1000 sats recommended)
3. **Dependencies**: All required packages are already installed in package.json

## Running the Tests

### Option 1: TypeScript Version (Recommended)
```bash
npm run test:cashu
```

### Option 2: JavaScript Version
```bash
npm run test:cashu:js
```

### Option 3: Direct Execution
```bash
# TypeScript
npx tsx test-cashu-mainnet-standalone.ts

# JavaScript  
node test-cashu-mainnet-standalone.js
```

## Test Flow Options

When you run the test, you'll be presented with these options:

### 1. Full Flow Test (Mint + Redeem)
- **Step 1**: Choose amount to mint (e.g., 1000 sats)
- **Step 2**: Pay Lightning invoice displayed in terminal
- **Step 3**: Wait for payment confirmation and token minting
- **Step 4**: Get ecash token (save it!)
- **Step 5**: Generate Lightning invoice for withdrawal
- **Step 6**: Redeem ecash token to Lightning payment

### 2. Mint Only Test
- Generate Lightning invoice
- Pay invoice manually
- Receive ecash token
- Save token for later use

### 3. Redeem Only Test  
- Enter existing ecash token
- Generate Lightning invoice for withdrawal
- Complete redemption process

### 4. Token Validation Only
- Enter ecash token to validate
- Check mint trustworthiness
- Display token information

## Trusted Mainnet Mints

The test includes these verified mainnet mints:
- `https://mint.minibits.cash/Bitcoin`
- `https://mint.lnwallet.app`
- `https://mint.coinos.io`
- `https://mint.lnserver.com`  
- `https://mint.0xchat.com`
- `https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC`

## Example Test Session

```bash
$ npm run test:cashu

🪙 Cashu Mainnet Standalone Test
================================

📋 Available Mainnet Mints:
1. https://mint.minibits.cash/Bitcoin
2. https://mint.lnwallet.app
3. https://mint.coinos.io
4. https://mint.lnserver.com
5. https://mint.0xchat.com
6. https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC

Select mint (1-6) or enter custom URL: 1

🪙 Initializing Cashu test with mint: https://mint.minibits.cash/Bitcoin
🔗 Connecting to Cashu mint...
✅ Connected successfully!

📋 Mint Information:
Name: Minibits
Description: Bitcoin ecash mint
Version: 1.0.0
URL: https://mint.minibits.cash/Bitcoin

🚀 STARTING CASHU MAINNET TEST
==============================

Choose test option:
1. Full flow (mint + redeem)
2. Mint only
3. Redeem only
4. Token validation only
Enter choice (1-4): 1

🔄 Running full flow test...

🏭 STARTING MINT FLOW
==================
Enter amount in sats to mint (e.g., 1000): 1000

📋 Creating mint quote for 1000 sats...
✅ Quote created: q_abc123...

================================================================================
⚡ LIGHTNING INVOICE TO PAY ⚡
================================================================================
Amount: 1000 sats

Invoice (copy this):
----------------------------------------
lnbc10u1p3x... [Lightning invoice]
----------------------------------------

Instructions:
1. Copy the invoice above
2. Open your Lightning wallet (Phoenix, Wallet of Satoshi, etc.)
3. Paste and pay the invoice
4. Wait for payment confirmation
================================================================================
Pay the invoice in your Lightning wallet, then
Press Enter to continue...

⏳ Checking payment status...
✅ Payment confirmed!

🏭 Minting ecash proofs...
✅ Minted 4 proofs with total value: 1000 sats

================================================================================
🎫 ECASH TOKEN GENERATED 🎫
================================================================================
Amount: 1000 sats

Token (copy this for future redemption):
----------------------------------------
cashuAeyJ0... [Ecash token]
----------------------------------------

This token represents your ecash and can be:
- Sent to others (peer-to-peer payments)
- Redeemed for Lightning sats
- Stored securely offline
- Split into smaller denominations
================================================================================

✅ Mint flow completed. Ready to test redemption?
Press Enter to continue...

💸 STARTING REDEMPTION FLOW
==========================

✅ Token is valid!
Mint: https://mint.minibits.cash/Bitcoin
Unit: sat
Proofs: 4
Total amount: 1000 sats
Trusted mint: ✅ Yes

💰 Prepare Lightning invoice for withdrawal...
Generate an invoice in your Lightning wallet for the amount you want to withdraw.
Enter Lightning invoice for withdrawal: lnbc9u1p3y... [Your withdrawal invoice]

💰 Processing withdrawal...
📋 Melt quote created:
Amount: 900 sats
Fee reserve: 10 sats
Total needed: 910 sats
✅ Received proofs worth 1000 sats
✅ Withdrawal completed successfully!
💰 Change received: 90 sats

🎫 Change token (save this):
----------------------------------------
cashuBfyJ1... [Change token]
----------------------------------------

🎉 Test completed successfully!
✅ Full flow test completed successfully
```

## Security Notes

1. **Real Money**: This test uses real Bitcoin on mainnet - use small amounts
2. **Trusted Mints**: Only use well-known, trusted mints
3. **Token Storage**: Save ecash tokens securely - they represent real value
4. **Network Fees**: Lightning fees apply to all transactions
5. **Mint Availability**: Mints may be temporarily unavailable

## Troubleshooting

### Payment Not Confirmed
- Wait longer (up to 5 minutes)
- Check Lightning wallet for payment status
- Verify invoice was copied correctly
- Try again with smaller amount

### Withdrawal Fails
- Check Lightning invoice validity
- Ensure sufficient token balance for fees
- Verify mint connectivity
- Try different mint if persistent issues

### Token Invalid
- Check token was copied completely
- Verify mint URL is accessible
- Ensure token hasn't been spent already

## Integration Notes

After successful testing:
1. ✅ Cashu integration works with real mints
2. ✅ Lightning payments flow correctly  
3. ✅ Token generation and redemption functional
4. Ready to integrate with main SLPM application
5. Consider implementing multi-mint routing for privacy
6. Add error handling and retry logic for production

## Next Steps

Once testing is successful:
1. Update main application to use mainnet mints
2. Implement proper error handling
3. Add user-friendly interface
4. Consider privacy enhancements (multi-mint)
5. Add token persistence and management
6. Implement Starknet integration with Cashu

## Support

For issues with:
- **Cashu protocol**: Check @cashu/cashu-ts documentation
- **Lightning payments**: Verify wallet and network connectivity  
- **Mint issues**: Try alternative mints from the list
- **SLPM integration**: Check main application logs and configuration