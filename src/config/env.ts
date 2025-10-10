// Centralized environment parsing and defaults

export const ENV = {
    NETWORK: (process.env.NEXT_PUBLIC_NETWORK || 'TESTNET') as 'MAINNET' | 'TESTNET',

    // Starknet RPC Configuration
    STARKNET_RPC: process.env.NEXT_PUBLIC_STARKNET_RPC || process.env.STARKNET_RPC || '',
    STARKNET_PRIVATE_KEY: process.env.STARKNET_PRIVATE_KEY || '',
    SHARED_SWAP_ACCOUNT_PRIVATE_KEY: process.env.SHARED_SWAP_ACCOUNT_PRIVATE_KEY || process.env.NEXT_PUBLIC_SHARED_SWAP_ACCOUNT_PRIVATE_KEY || '',
    // Optional: allow overriding address via env (falls back to constant)
    SHARED_SWAP_ACCOUNT_ADDRESS: process.env.SHARED_SWAP_ACCOUNT_ADDRESS || '',

    // Privacy Mixer Contract
    MIXER_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_MIXER_CONTRACT_ADDRESS || process.env.MIXER_CONTRACT_ADDRESS || '',

    // Lightning Network Configuration
    LND_URL: process.env.NEXT_PUBLIC_LND_URL || process.env.LND_URL || '',
    LND_MACAROON: process.env.NEXT_PUBLIC_LND_MACAROON || process.env.LND_MACAROON || '',
    LND_TLS: process.env.NEXT_PUBLIC_LND_TLS || process.env.LND_TLS || '',

    // Cashu Configuration
    CASHU_MINTS: (process.env.NEXT_PUBLIC_CASHU_MINTS || process.env.CASHU_MINTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    CASHU_DEFAULT_MINT:
        process.env.NEXT_PUBLIC_CASHU_MINT || process.env.CASHU_MINT || 'https://mint.minibits.cash',

    // Rate / Pricing Overrides
    // If STRK_BTC_RATE provided (BTC per STRK), convert to sats; else use explicit STRK_SATS_RATE; else default 125
    STRK_BTC_RATE: Number(process.env.NEXT_PUBLIC_STRK_BTC_RATE || process.env.STRK_BTC_RATE || '0'),
    STRK_SATS_RATE: (() => {
        const explicit = process.env.NEXT_PUBLIC_STRK_SATS_RATE || process.env.STRK_SATS_RATE;
        if (explicit) return Number(explicit);
        const btcPerStrk = Number(process.env.NEXT_PUBLIC_STRK_BTC_RATE || process.env.STRK_BTC_RATE || '0');
        if (btcPerStrk && !isNaN(btcPerStrk) && btcPerStrk > 0) {
            return Math.floor(btcPerStrk * 100_000_000); // sats
        }
        return 125; // updated conservative default
    })(),
    DISABLE_ATOMIQ_PRICE_FETCH: (process.env.NEXT_PUBLIC_DISABLE_ATOMIQ_PRICE_FETCH || process.env.DISABLE_ATOMIQ_PRICE_FETCH || 'false') === 'true',
    ALLOW_SWAP_PRICE_FALLBACK: process.env.ALLOW_SWAP_PRICE_FALLBACK === 'true' || false // Real swaps only
};

export type Network = typeof ENV.NETWORK;

// Get default RPC based on network if not configured
export function getStarknetRpc(): string {
    if (ENV.STARKNET_RPC) {
        return ENV.STARKNET_RPC;
    }

    // Fallback to public RPCs based on network
    return ENV.NETWORK === 'MAINNET'
        ? "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"
        : "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP";
}

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical validations
    if (!ENV.NETWORK || !['MAINNET', 'TESTNET'].includes(ENV.NETWORK)) {
        errors.push('Invalid network configuration');
    }

    if (!ENV.CASHU_DEFAULT_MINT) {
        errors.push('No Cashu mint configured');
    }

    // Testnet readiness warnings
    if (!ENV.STARKNET_RPC) {
        warnings.push(`Using default ${ENV.NETWORK} Starknet RPC - configure STARKNET_RPC for better reliability`);
    }

    if (!ENV.LND_URL) {
        warnings.push('Lightning node URL not configured - using fallback mode');
    }

    if (ENV.CASHU_MINTS.length === 0) {
        warnings.push('No multi-mint configuration - using single mint mode');
    }

    if (!ENV.STARKNET_PRIVATE_KEY && typeof window === 'undefined') {
        warnings.push('No Starknet private key configured for server-side operations');
    }

    // Shared swap account checks (prototype central account approach)
    if (!ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY) {
        warnings.push('Shared swap account private key not set (SHARED_SWAP_ACCOUNT_PRIVATE_KEY) - STRK -> Lightning swaps may fail to sign');
    }

    // Log warnings
    warnings.forEach(warning => console.warn(warning));

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

// Check if configuration is ready for testnet testing
export function isTestnetReady(): boolean {
    const starknetRpc = getStarknetRpc();
    return !!(
        ENV.NETWORK === 'TESTNET' &&
        starknetRpc &&
        ENV.CASHU_DEFAULT_MINT
    );
}

// Get testnet configuration summary
export function getTestnetStatus(): {
    ready: boolean;
    starknetRpc: string;
    lightningConfigured: boolean;
    cashuConfigured: boolean;
    recommendations: string[];
} {
    const recommendations: string[] = [];

    if (!ENV.LND_URL) {
        recommendations.push('Configure Lightning node for full Lightning Network integration');
    }

    if (ENV.CASHU_MINTS.length < 2) {
        recommendations.push('Configure multiple Cashu mints for enhanced privacy');
    }

    if (!ENV.STARKNET_PRIVATE_KEY) {
        recommendations.push('Configure Starknet private key for server-side operations');
    }

    return {
        ready: isTestnetReady(),
        starknetRpc: getStarknetRpc(),
        lightningConfigured: !!ENV.LND_URL,
        cashuConfigured: !!ENV.CASHU_DEFAULT_MINT,
        recommendations
    };
}

// Initialize configuration validation
export const CONFIG_STATUS = validateConfig();