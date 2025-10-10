export const MIXING_DELAY_MS = 200; // legacy placeholder
export const MIX_MIN_DELAY_MS = 1_000; // 1s minimal jitter window
export const MIX_MAX_DELAY_MS = 15_000; // 15s upper bound (tunable)
export const SPLIT_MAX_PARTS = 8;
export const SPLIT_MIN_DENOM = 1n; // smallest sat denomination for splitting
export const VERSION = '0.0.1-mvp';

// Privacy Mixer Contract Constants (deployed on Sepolia Testnet)
export const PRIVACY_MIXER = {
    CONTRACT_ADDRESS: '0x02831b172735dc7cc00c89524129e919e2f14035c4d16a91c4828d2dacc91991',
    CLASS_HASH: '0x018d5c178e04d4457a8a56517c3c9e0087139baba410649264173dc228853780',
    STRK_TOKEN: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    DEPLOYMENT_PARAMS: {
        OWNER: '0x4e01d9ec9df257a629a9b70e67d092ed24385c6e68f0381674bee116cf39a7a',
        MIN_DEPOSIT: 1000000000000000000n, // 1 STRK
        MAX_DEPOSIT: 1000000000000000000000n, // 1000 STRK
        MIN_DELAY: 0n, // 0 seconds for testing
        MIN_ANONYMITY: 0n, // 0 for testing
        FEE_RATE: 100n // 1% (10000 = 100%)
    }
} as const;

// Shared swap account (temporary central account for prototype phase)
// WARNING: Centralizing withdrawals reduces privacy and introduces custodial risk.
// Private key provided externally; do NOT commit secrets into repo in production.
export const SHARED_SWAP_ACCOUNT_ADDRESS = '0x047bc9ab67cf0203341c13bc97dcb13e7fa790ae8fc405b19f5004b4089fb6c8';
