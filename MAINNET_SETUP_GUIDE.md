# SLPM Mainnet Setup Guide

Complete guide for setting up Starknet Lightning Privacy Mixer on mainnet with real Bitcoin operations.

## ⚠️ CRITICAL SECURITY WARNING

**This setup uses REAL Bitcoin mainnet operations. Please:**
- Test with small amounts first (minimum 1000-2000 sats)
- Backup all private keys securely
- Understand the risks of using real money
- Monitor all transactions carefully
- Keep Lightning node properly funded and connected

## Prerequisites

### 1. Starknet Mainnet Wallet
- Deploy account on Starknet mainnet
- Fund with real STRK tokens
- Export private key securely

### 2. Lightning Network Node
- Running Lightning node on Bitcoin mainnet
- Properly funded channels with good liquidity
- API access (recommended: Alby Hub, Voltage.cloud)

### 3. Understanding of Technologies
- Cashu ecash protocol
- Lightning Network operations  
- Starknet transactions
- Privacy implications

## Step 1: Environment Configuration

### Copy Mainnet Template
```bash
cp .env.mainnet .env.local
```

### Configure Starknet Mainnet
```bash
# Essential settings
NEXT_PUBLIC_NETWORK=MAINNET
NEXT_PUBLIC_STARKNET_RPC=https://starknet-mainnet.public.blastapi.io/rpc/v0_7
STARKNET_PRIVATE_KEY=your_actual_private_key_here
```

**Security Note:** Never commit real private keys to version control!

### Configure Lightning Node
```bash
# For Alby Hub (recommended)
NEXT_PUBLIC_LND_URL=https://your-node.getalby.com
NEXT_PUBLIC_LND_MACAROON=your_access_token

# For Voltage.cloud
NEXT_PUBLIC_LND_URL=https://your-node.voltage.cloud:8080
NEXT_PUBLIC_LND_MACAROON=your_admin_macaroon_hex
NEXT_PUBLIC_LND_TLS=your_tls_cert_base64
```

### Configure Cashu Mainnet Mints
```bash
# Primary mint (required)
NEXT_PUBLIC_CASHU_DEFAULT_MINT=https://mint.minibits.cash/Bitcoin

# Multiple mints for privacy (optional)
NEXT_PUBLIC_CASHU_MINTS=https://mint.minibits.cash/Bitcoin,https://mint.lnwallet.app,https://mint.coinos.io,https://mint.lnserver.com
```

## Step 2: Test Mainnet Configuration

### Run Integration Test
```bash
npm run test:mainnet
```

This validates:
- ✅ Network configuration
- ✅ Starknet RPC connectivity  
- ✅ Cashu mainnet mint access
- ✅ Atomiq SDK configuration
- ✅ Environment variables

### Expected Output
```
🚀 SLPM Mainnet Integration Test
==================================================

🔍 Testing network configuration...
✅ Network configuration valid for mainnet

🔍 Validating mainnet environment variables...
✅ NEXT_PUBLIC_NETWORK: MAINNET
✅ STARKNET_RPC: https://starknet-mainnet.public.blastapi.io/rpc/v0_7
✅ CASHU_DEFAULT_MINT: https://mint.minibits.cash/Bitcoin

🔍 Testing Cashu mainnet mint connectivity...
✅ Connected to Minibits mint
✅ Successfully connected to 3/3 mainnet mints

🔍 Testing Atomiq SDK mainnet configuration...
✅ Atomiq SDK configured for mainnet

🎯 Overall: 5/5 tests passed
🎉 All tests passed! SLPM is ready for mainnet operations.
```

## Step 3: Test Cashu Flow with Real Bitcoin

### Test Cashu Integration
```bash
npm run test:cashu
```

**Start Small:** Test with 1000-2000 sats first!

### Expected Flow
1. **Choose mainnet mint** (e.g., Minibits)
2. **Pay Lightning invoice** with real Bitcoin
3. **Receive ecash token** representing your Bitcoin
4. **Redeem ecash token** back to Lightning payment
5. **Verify funds received** in your wallet

### If Successful
✅ Cashu integration working with real Bitcoin
✅ Lightning payments processed correctly
✅ Ecash tokens created and redeemed
✅ Ready for full SLPM integration

## Step 4: Privacy Mixer Setup

### Deploy Privacy Mixer Contract
```bash
# Deploy to Starknet mainnet (if not already deployed)
npm run deploy:mixer
```

### Configure Mixer Address
```bash
# Add deployed contract address to .env.local
NEXT_PUBLIC_MIXER_CONTRACT_ADDRESS=0x_your_deployed_mixer_address
MIXER_CONTRACT_ADDRESS=0x_your_deployed_mixer_address
```

## Step 5: Full Integration Test

### Test Complete Flow
```bash
npm run test:mixer
```

This tests the complete privacy flow:
1. **Deposit STRK** → Privacy Mixer
2. **Swap STRK** → Lightning (via Atomiq)
3. **Lightning** → Cashu ecash tokens
4. **Enhanced privacy** mixing with multiple mints
5. **Cashu tokens** → Lightning payment
6. **Lightning** → STRK (via Atomiq)  
7. **Withdraw STRK** from Privacy Mixer

## Step 6: Production Deployment

### Build for Production
```bash
npm run build
```

### Deploy Application
```bash
npm start
```

### Security Checklist
- [ ] Private keys secured and backed up
- [ ] Lightning node properly funded
- [ ] Channels have sufficient liquidity
- [ ] All transactions monitored
- [ ] Small amount testing completed
- [ ] Emergency procedures documented

## Trusted Mainnet Mints

### Primary Mints (Battle-tested)
- **Minibits**: `https://mint.minibits.cash/Bitcoin`
  - Well-established, active development
  - Good uptime and reliability
  
- **LN Wallet**: `https://mint.lnwallet.app`
  - Part of established Lightning wallet
  - Good reputation in community

- **Coinos**: `https://mint.coinos.io`
  - Long-running service
  - Multiple payment methods

### Additional Mints
- **LN Server**: `https://mint.lnserver.com`
- **0xchat**: `https://mint.0xchat.com`
- **LNbits Legend**: `https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC`

**Warning:** Only use well-known, trusted mints for mainnet operations!

## Monitoring and Maintenance

### Transaction Monitoring
- Monitor Starknet transactions via StarkScan
- Track Lightning payments in node dashboard
- Keep records of all ecash tokens
- Monitor channel liquidity

### Regular Maintenance
- Update to latest SLPM versions
- Monitor mint status and reputation
- Backup ecash tokens securely
- Update Lightning node software
- Review security practices

## Troubleshooting

### Configuration Issues
```bash
# Check configuration status
npm run test:mainnet
```

### Cashu Token Issues
```bash
# Recover stuck tokens
npm run recover:cashu
```

### Lightning Issues
- Check node connectivity
- Verify channel liquidity
- Test with smaller amounts
- Check routing paths

### Starknet Issues
- Verify RPC connectivity
- Check account balance
- Confirm network selection
- Validate contract addresses

## Emergency Procedures

### If Funds Get Stuck
1. **Don't panic** - most issues are recoverable
2. **Document everything** - transaction IDs, error messages
3. **Check component status** individually
4. **Contact support** for respective services
5. **Use recovery tools** provided

### Support Contacts
- **Minibits**: @minibits_wallet (Telegram)
- **Atomiq**: @atomiq_support (Telegram)  
- **Starknet**: Community forums
- **SLPM**: GitHub issues

## Best Practices

### Security
- Use hardware wallets for large amounts
- Regular security audits
- Principle of least privilege
- Air-gapped key management

### Privacy
- Use multiple mints for enhanced privacy
- Vary transaction amounts and timing
- Don't reuse addresses
- Understand privacy implications

### Operations
- Start with small amounts
- Test regularly
- Monitor continuously
- Keep good records
- Have recovery plans

---

**Remember: This involves real Bitcoin mainnet operations. Always test thoroughly with small amounts and understand the risks before proceeding with larger values.**