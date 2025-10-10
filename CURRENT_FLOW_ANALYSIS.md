# Current User Flow Analysis: Wallet Connect + STRK Input

## 🔄 What Happens Now When User Connects Wallet & Inputs STRK Amount

Based on the current codebase, here's the complete flow that occurs when a user connects their wallet and inputs a STRK amount:

## 1. **Wallet Connection Flow** 🔗

### When user clicks "Connect Wallet":
1. **Wallet Modal Opens** - User selects wallet type (ArgentX, Braavos, OKX)
2. **Wallet Manager Initiated** - `StarknetWalletManager` handles connection
3. **Browser Extension Call** - Connects to user's Starknet wallet extension
4. **Connection Success** - UI updates showing connected state
5. **Notification Displayed** - "Wallet Connected" success message

### Code Path:
```typescript
// src/app/mixer/page.tsx
handleWalletConnect() -> walletManager.connectWallet() -> setIsConnected(true)
```

## 2. **Amount Input & Validation** 💰

### When user enters STRK amount:
1. **Real-time Validation** - Checks for valid decimal format
2. **UI Updates** - Amount stored in session state
3. **Min/Max Display** - Shows limits (1-10,000 STRK in UI, 1-1000 ETH in contract)
4. **Form Validation** - Enables "Start Mixing" button when valid

### Code Path:
```typescript
// src/components/mixer/SetupForm.tsx
handleAmountChange() -> setSession({amount: value}) -> validation checks
```

## 3. **Privacy Level Selection** 🔒

User can choose:
- **Standard**: 10+ participants, 5min, 0.1% fee
- **Enhanced**: 50+ participants, 15min, 0.2% fee  
- **Maximum**: 100+ participants, 30min, 0.3% fee

## 4. **"Start Mixing" Button Clicked** 🚀

### Current Implementation Does:

#### Phase 1: Initial Setup
1. **Wallet Validation** - Ensures wallet is still connected
2. **Amount Validation** - Checks amount > 0 and has destinations
3. **Session Update** - Changes step to 'deposit', progress to 0
4. **Notification** - Shows "Starting Mix" info message

#### Phase 2: Contract Integration (THE MISSING PIECE!)
Currently calls `runMix()` which goes through these steps:

**Step 1: Deposit to Privacy Mixer Contract** 💰
- Connects to Starknet wallet via `RealStarknetWalletClient`
- **PROBLEM**: Uses placeholder contract address `0x1234567890abcdef...`
- **SOLUTION NEEDED**: Should use deployed contract `0x05f478e8fc05b3eb438dbab92ceebfa34ed26543caf69905e8c26cf480930300`
- Generates privacy commitment (secret + nullifier)
- Approves STRK spending by mixer contract
- Calls `depositToMixer(commitment, amount)`

**Step 2: Swap to Lightning** ⚡
- Converts STRK to Lightning BTC via Atomiq DEX
- **STATUS**: Implementation exists but may need testnet setup

**Step 3: Cashu E-Cash Minting** 🔒
- Converts Lightning BTC to Cashu tokens for privacy
- **STATUS**: Implementation exists

**Step 4: Privacy Features** 🎭
- Applies mixing, delays, splitting based on privacy level
- **STATUS**: Implementation exists

**Step 5: Convert Back & Withdraw** 💸
- Melts Cashu back to Lightning BTC
- Swaps back to STRK
- Withdraws to destination addresses

## 🚨 **CRITICAL ISSUE IDENTIFIED**

### The Main Problem:
The deposit step currently uses a **placeholder contract address** instead of your deployed contract!

**Current Code (WRONG):**
```typescript
// src/orchestrator/steps/deposit.ts line 9
const MIXER_CONTRACT_ADDRESS = ENV.MIXER_CONTRACT_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678'; // Placeholder
```

**Should Be:**
```typescript
const MIXER_CONTRACT_ADDRESS = ENV.MIXER_CONTRACT_ADDRESS || '0x05f478e8fc05b3eb438dbab92ceebfa34ed26543caf69905e8c26cf480930300'; // Your deployed contract
```

### Additional Issues:
1. **STRK Token Address** - May need verification for Sepolia testnet
2. **Wallet Integration** - `RealStarknetWalletClient` needs to use your deployed contract ABI
3. **Amount Conversion** - Converting STRK amount to Wei needs proper decimals

## 🔧 **IMMEDIATE FIXES NEEDED**

### 1. Update Contract Address
```typescript
// In src/orchestrator/steps/deposit.ts
const MIXER_CONTRACT_ADDRESS = '0x05f478e8fc05b3eb438dbab92ceebfa34ed26543caf69905e8c26cf480930300';
```

### 2. Update Environment Variable
```bash
# In .env.local
MIXER_CONTRACT_ADDRESS=0x05f478e8fc05b3eb438dbab92ceebfa34ed26543caf69905e8c26cf480930300
```

### 3. Integrate Deployed Contract ABI
The `RealStarknetWalletClient` needs to use your extracted ABI from `src/config/privacy-mixer-abi.json`

### 4. Verify STRK Token Address
Need to confirm the STRK token contract address on Sepolia testnet.

## 🎯 **EXPECTED FLOW AFTER FIXES**

When user clicks "Start Mixing" with fixes:

1. ✅ **Wallet connects** to your deployed privacy mixer contract
2. ✅ **Balance check** ensures sufficient STRK
3. ✅ **Privacy commitment** generated (secret + nullifier)  
4. ✅ **STRK approval** for spending by mixer contract
5. ✅ **Contract deposit** calls your deployed `deposit(commitment, amount)` function
6. ✅ **Transaction confirmed** on Starknet Sepolia
7. ✅ **Privacy mixing** continues through Lightning/Cashu steps
8. ✅ **Final withdrawal** to user's destination addresses

## 🔨 **NEXT STEPS TO FIX**

1. Update deposit step with correct contract address
2. Integrate your deployed contract ABI  
3. Verify STRK token address on Sepolia
4. Test the complete deposit flow
5. Add proper error handling for contract interactions

The core architecture is solid - you just need to connect it to your deployed contract!
