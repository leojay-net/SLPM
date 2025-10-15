# SLPM - Starknet Lightning Privacy Mixer

A decentralized privacy solution that breaks on-chain transaction linkability on Starknet by routing funds through multiple privacy-preserving layers: **Zero-Knowledge Proofs → Lightning Network → Cashu Ecash**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Starknet](https://img.shields.io/badge/Starknet-Mainnet-purple)](https://starknet.io)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

> **⚠️ Status**: Active Development - Testnet deployment recommended for testing

## Overview

SLPM provides **military-grade financial privacy** for Starknet transactions through a sophisticated multi-layer architecture that makes it cryptographically impossible to link sender and recipient addresses on-chain.

## Overview

SLPM provides **military-grade financial privacy** for Starknet transactions through a sophisticated multi-layer architecture that makes it cryptographically impossible to link sender and recipient addresses on-chain.

### 🔒 Privacy Pipeline

```
STRK → [Privacy Mixer] → [Lightning] → [Cashu Ecash] → [Lightning] → STRK
  ↓          ↓               ↓              ↓              ↓          ↓
Sender   Commitment      Off-chain      Anonymous      Off-chain  Recipient
        + ZK Proof       Payment         Token          Payment   (Unlinkable)
```

### ✨ Key Features

- **🛡️ Zero-Knowledge Privacy**: Cryptographic commitments and nullifiers prevent on-chain linkability
- **⚡ Lightning Integration**: Instant, untraceable cross-chain routing via Bitcoin Lightning Network
- **💰 Cashu Ecash**: Bearer token privacy with offline storage and peer-to-peer transfers
- **🔄 Two Mixing Modes**: 
  - **Full Mix**: Automated end-to-end privacy (1 minute)
  - **Split Mix**: Manual custody with enhanced temporal privacy (hours to years)
- **🎯 Flexible Settlement**: Choose between STRK on-chain or Lightning off-chain at redemption
- **🔐 Self-Custody**: Complete control over your bearer tokens in Split Mix mode
- **🌐 Multi-Mint Support**: Enhanced privacy through distribution across multiple Cashu mints

## 🏗️ Architecture

### Core Components

### Core Components

#### 1. **Privacy Mixer Smart Contract** (`contract/src/privacy_mixer.cairo`)
- Cairo 2.x implementation on Starknet mainnet
- Commitment/nullifier scheme for deposit-withdrawal unlinkability
- Zero-knowledge proof verification
- Emergency withdrawal mechanisms
- Multi-account support (ArgentX, Braavos, OKX wallets)

#### 2. **Frontend Application** (`src/app/`)
- Next.js 14 with TypeScript and React
- Two mixing modes: Full Mix (automated) and Split Mix (manual custody)
- Real-time progress tracking and event monitoring
- Responsive UI with privacy-focused design
- Wallet connection management

#### 3. **Privacy Enhancement Engine** (`src/mixer/privacy.ts`)
- Temporal mixing with configurable delays
- Amount obfuscation through intelligent splitting
- Multi-mint routing for enhanced anonymity
- Anonymity set batching and optimization

#### 4. **Integration Layer** (`src/integrations/`)
- **Cashu Client** (`cashu/client.ts`): @cashu/cashu-ts v2.7.2 for ecash operations
- **Atomiq SDK** (`swaps/atomiq.ts`): @atomiqlabs/sdk v6.0.3 for Lightning↔STRK swaps
- **Lightning Network** (`lightning/`): BOLT11 invoice handling
- **Starknet Wallets** (`starknet/wallet.ts`): Multi-wallet provider support
- **Server-side Melt** (`cashu/direct.ts`): Reliable ecash redemption with retries

#### 5. **Orchestration Layer** (`src/orchestrator/`)
- Session state management and lifecycle
- Error handling and recovery strategies
- Progress event system for UI updates
- Transaction coordination across layers

## 🔒 Privacy Guarantees

### Three-Layer Privacy Architecture

1. **On-Chain Privacy (Starknet)**
   - Cryptographic commitments hide depositor identity
   - Zero-knowledge proofs enable unlinkable withdrawals
   - Nullifier scheme prevents double-spending
   - Anonymity set grows with each participant

2. **Cross-Chain Privacy (Lightning Network)**
   - Off-chain payment routing breaks transaction graph
   - No permanent blockchain record
   - Instant settlement with sub-second finality
   - Multi-hop routing obscures payment path

3. **Bearer Token Privacy (Cashu Ecash)**
   - Offline storage capability
   - Peer-to-peer transferability
   - No ledger tracking transfers
   - Blind signature scheme for anonymity

### Privacy Strength

| Feature | Full Mix | Split Mix (STRK) | Split Mix (Lightning) |
|---------|----------|------------------|----------------------|
| On-chain unlinkability | ✅ Yes | ✅ Yes | ✅ Yes |
| Bearer token privacy | ✅ Yes | ✅ Yes | ✅ Yes |
| Temporal disconnect | Minutes | Hours to Years | Hours to Years |
| User custody | No (automated) | Yes | Yes |
| Offline storage | No | Yes | Yes |
| Blockchain footprint | Starknet tx | Starknet tx | **None** |
| Wallet required | Yes | Yes (claiming) | **No** |

### Attack Resistance

- **✅ Timing Analysis**: Variable delays and batching prevent correlation
- **✅ Amount Correlation**: Splitting and standardization obfuscate values
- **✅ Graph Analysis**: Commitment scheme breaks transaction graph
- **✅ Statistical Disclosure**: Large anonymity sets (100-10,000+) provide strong privacy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Starknet wallet (ArgentX, Braavos, or OKX)
- Lightning wallet (optional, for Split Mix Lightning settlement)

### Installation

```bash
# Clone the repository
git clone https://github.com/leojay-net/SLPM.git
cd SLPM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### Environment Configuration

Create `.env.local` with the following variables:

```bash
# Network Configuration
NEXT_PUBLIC_NETWORK=MAINNET  # or TESTNET

# Starknet Configuration
NEXT_PUBLIC_STARKNET_RPC=https://starknet-mainnet.public.blastapi.io
STARKNET_RPC=https://starknet-mainnet.public.blastapi.io

# Privacy Mixer Contract (Mainnet)
NEXT_PUBLIC_MIXER_CONTRACT_ADDRESS=0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b
MIXER_CONTRACT_ADDRESS=0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b

# Shared Swap Account (for automated swaps)
NEXT_PUBLIC_SHARED_SWAP_ACCOUNT_PRIVATE_KEY=0x...
SHARED_SWAP_ACCOUNT_PRIVATE_KEY=0x...
NEXT_PUBLIC_SHARED_SWAP_ACCOUNT_ADDRESS=0x...
SHARED_SWAP_ACCOUNT_ADDRESS=0x...

# Cashu Mint Configuration
NEXT_PUBLIC_CASHU_DEFAULT_MINT=https://mint.lnserver.com
CASHU_MINT=https://mint.lnserver.com

# Atomiq Configuration
NEXT_PUBLIC_ATOMIQ_NETWORK=mainnet
ATOMIQ_NETWORK=mainnet
```

### Usage

1. **Navigate to the application**: Open http://localhost:3000
2. **Connect your wallet**: Click "Connect Wallet" and select your preferred provider
3. **Choose mixing mode**:
   - **Full Mix**: Automated privacy mixing (recommended for beginners)
   - **Split Mix**: Manual custody with enhanced privacy (advanced users)
4. **Follow the guided flow** to complete your privacy-enhanced transfer

## 💡 Use Cases

### Personal Privacy
- 💼 Receive salary without employer tracking spending patterns
- 🎁 Make anonymous donations to causes
- 🛒 Purchase goods/services without vendor profiling
- 💰 Accumulate savings without surveillance

### Business Applications
- 📦 Confidential supplier payments
- 👔 Anonymous payroll for sensitive operations
- 🏛️ Private treasury management
- 🔍 Protect competitive intelligence

### Split Mix Benefits
- 🕐 **Time flexibility**: Redeem hours, days, or years later
- 🎁 **Gift tokens**: Transfer value peer-to-peer offline
- 💾 **Backup resilience**: Store in multiple secure locations
- 🌍 **Geographic privacy**: Issue and redeem from different locations
- ⚡ **Lightning settlement**: Pay invoices directly without on-chain footprint

## 📋 Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Heroicons**: UI icons

### Blockchain & Crypto
- **Starknet.js v7.6.4**: Starknet blockchain interaction
- **@atomiqlabs/sdk v6.0.3**: Lightning↔STRK atomic swaps
- **@cashu/cashu-ts v2.7.2**: Cashu ecash protocol
- **get-starknet v4.0.3**: Multi-wallet connection

### Smart Contract
- **Cairo 2.x**: Starknet smart contract language
- **Scarb**: Cairo package manager
- **Starknet Foundry**: Testing framework

### Development Tools
- **ESLint & Prettier**: Code quality
- **TypeScript**: Static type checking
- **dotenv**: Environment management

## 📁 Project Structure

```
slpm/
├── contract/               # Cairo smart contracts
│   ├── src/
│   │   ├── privacy_mixer.cairo
│   │   └── lib.cairo
│   └── tests/
├── src/
│   ├── app/               # Next.js pages and API routes
│   │   ├── mixer/         # Full Mix UI
│   │   │   └── split/     # Split Mix UI
│   │   └── api/           # Server-side endpoints
│   │       └── cashu/     # Cashu operations
│   ├── components/        # React components
│   │   └── mixer/
│   │       └── split/     # Split Mix components
│   ├── integrations/      # External service clients
│   │   ├── cashu/         # Cashu SDK integration
│   │   ├── swaps/         # Atomiq SDK integration
│   │   ├── starknet/      # Wallet & contract
│   │   └── lightning/     # Lightning Network
│   ├── orchestrator/      # Business logic
│   │   └── steps/         # Mixing flow steps
│   ├── mixer/             # Privacy engine
│   ├── domain/            # Type definitions
│   ├── config/            # Configuration
│   ├── context/           # React contexts
│   ├── utils/             # Utilities
│   └── storage/           # Data persistence
└── docs/                  # Documentation
    └── MIXER_ARCHITECTURE.md
```

## 🔧 Development

### Smart Contract Development

```bash
cd contract

# Install dependencies
scarb build

# Run tests
snforge test

# Deploy to testnet
sncast --profile testnet deploy \
  --class-hash <hash> \
  --constructor-calldata <args>
```

### Frontend Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code
npm run format
```

### Testing

```bash
# Run Cashu integration tests
npm run test:cashu

# Test specific functionality
npm run test:mixer
npm run test:swaps
```

## 🔐 Security

### Smart Contract Security
- ✅ Emergency pause functionality
- ✅ Commitment uniqueness validation
- ✅ Nullifier double-spend prevention
- ✅ Access control for admin functions
- ✅ Reentrancy protection

### Application Security
- ✅ Environment variable validation
- ✅ Input sanitization and validation
- ✅ Secure key storage recommendations
- ✅ HTTPS enforcement
- ✅ Privacy-preserving error messages

### Cryptographic Security
- ✅ Collision-resistant hash functions
- ✅ Zero-knowledge proof verification
- ✅ Blind signature schemes (Cashu)
- ✅ Secure random number generation

### Operational Security
- 🔄 Automatic refund mechanisms
- 🔄 Timeout protection (30-60s limits)
- 🔄 Circuit breakers for service failures
- 🔄 Comprehensive error handling

## � Documentation

- **[Architecture Overview](./docs/MIXER_ARCHITECTURE.md)**: Detailed system design and privacy mechanisms
- **[Smart Contract Docs](./contract/README.md)**: Cairo contract implementation details
- **[API Reference](./docs/API.md)**: Server-side endpoint documentation
- **[Privacy Analysis](./docs/PRIVACY.md)**: Security guarantees and threat model

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Write comprehensive tests for new features
- Follow existing code style and conventions
- Update documentation for API changes
- Ensure privacy guarantees are maintained
- Add security considerations for cryptographic changes

## � License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Important Security Notice:**

This software is provided for educational and research purposes. While we implement industry-standard cryptographic primitives and privacy-enhancing technologies:

- **No Warranty**: This software is provided "as is" without warranty of any kind
- **Testnet First**: Always test on Starknet testnet before mainnet deployment
- **Regulatory Compliance**: Review applicable regulations in your jurisdiction
- **Audit Recommended**: Independent security audit recommended before production use
- **Beta Software**: Active development - features and APIs may change

**Privacy Notice:**

- Cashu mints are custodial - choose reputable mints carefully
- Atomiq swaps require sufficient liquidity
- Network fees apply to all on-chain transactions
- Backup your ecash tokens - they are bearer instruments

## 🔗 Links

- **Live Demo**: [slpm.example.com](https://slpm.example.com) (Coming soon)
- **Documentation**: [docs.slpm.example.com](https://docs.slpm.example.com)
- **GitHub**: [github.com/leojay-net/SLPM](https://github.com/leojay-net/SLPM)
- **Starknet Contract**: [Starkscan Explorer](https://starkscan.co)
- **Twitter**: [@SLPM_Privacy](https://twitter.com/SLPM_Privacy)
- **Discord**: [Join our community](https://discord.gg/slpm)

## 🙏 Acknowledgments

- **Starknet** for the scalable L2 infrastructure
- **Atomiq Labs** for Lightning↔Starknet atomic swaps
- **Cashu** for the ecash protocol implementation
- **Open-source contributors** who make privacy technology accessible

---

**Built with privacy in mind. 🔒**

*"Privacy is not about hiding, it's about freedom."*
