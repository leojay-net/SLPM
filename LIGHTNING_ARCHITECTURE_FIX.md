# Lightning Architecture Issues & Solutions

## Current Problem
The system has a critical flaw in Lightning fund custody and invoice coordination:

1. **Fund Custody Gap**: Atomiq swaps STRK → Lightning, but where do Lightning funds go?
2. **Mock Invoice Issue**: System generates fake invoices without real Lightning wallet
3. **No Fund Access**: Even if Atomiq pays, orchestrator can't access Lightning funds

## Problem Analysis

### Current Broken Flow:
```
User Deposit STRK → Privacy Contract
       ↓
Orchestrator Withdraws STRK  
       ↓
Atomiq: STRK → Lightning BTC (pays to ???)
       ↓
Mock Invoice Generated (doesn't receive actual funds)
       ↓
Cashu Mint (with what Lightning funds?)
```

## Solution Options

### Option A: Orchestrator Lightning Wallet (Recommended)
```
User Deposit STRK → Privacy Contract
       ↓
Orchestrator Withdraws STRK
       ↓
Orchestrator Creates Lightning Invoice (own LND node)
       ↓
Atomiq: STRK → Lightning BTC (pays orchestrator's invoice)
       ↓  
Orchestrator Receives Lightning BTC
       ↓
Use Lightning BTC for Cashu Minting
```

**Requirements:**
- Orchestrator runs LND node (testnet)
- Real invoice generation from own wallet
- Actual Lightning fund custody

### Option B: Direct Cashu Integration
```
User Deposit STRK → Privacy Contract
       ↓
Orchestrator Withdraws STRK
       ↓
Get Invoice from Cashu Mint
       ↓
Atomiq: STRK → Lightning BTC (pays Cashu mint directly)
       ↓
Cashu Mint Issues Proofs
       ↓
Orchestrator Claims Proofs
```

**Benefits:**
- No intermediate Lightning wallet needed
- Direct atomic swap to privacy
- Simpler architecture

### Option C: Lightning Service Provider
```
Use hosted Lightning service (Voltage, Alby Hub, etc.)
       ↓
Orchestrator controls Lightning wallet via API
       ↓
Same flow as Option A but hosted
```

## Recommended Implementation: Option A

### Why Option A:
1. **Full Control**: Orchestrator owns Lightning funds
2. **Real Testing**: Uses actual Lightning Network
3. **Privacy**: No third-party fund custody
4. **Flexibility**: Can route to any Cashu mint

### Implementation Steps:
1. Setup LND testnet node for orchestrator
2. Update invoice generation to use real LND
3. Verify Atomiq can pay real invoices
4. Connect Lightning wallet to Cashu minting

## Code Changes Needed

### 1. Real Lightning Client Configuration
```typescript
// Use real LND endpoint instead of mock
const ln = new RealLightningClient(
    process.env.ORCHESTRATOR_LND_URL,
    process.env.ORCHESTRATOR_LND_MACAROON,
    process.env.ORCHESTRATOR_LND_TLS
);
```

### 2. Real Invoice Generation
```typescript
// Replace mock invoice with real one
const invoice = await ln.createInvoice(targetSats, 'SLPM Privacy Mixing');
```

### 3. Payment Verification
```typescript
// Wait for actual Lightning payment
const payment = await ln.trackPayment(invoice.paymentHash);
```

### 4. Fund Access for Cashu
```typescript
// Use received Lightning funds for Cashu minting
const cashuInvoice = await cashu.requestMint(lightningFunds);
await ln.payInvoice(cashuInvoice.pr);
```
