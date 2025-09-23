// Centralized environment parsing and defaults

export const ENV = {
    NETWORK: (process.env.NEXT_PUBLIC_NETWORK || 'TESTNET') as 'MAINNET' | 'TESTNET',
    LND_URL: process.env.NEXT_PUBLIC_LND_URL || process.env.LND_URL || '',
    LND_MACAROON: process.env.NEXT_PUBLIC_LND_MACAROON || process.env.LND_MACAROON || '',
    LND_TLS: process.env.NEXT_PUBLIC_LND_TLS || process.env.LND_TLS || '',
    CASHU_MINTS: (process.env.NEXT_PUBLIC_CASHU_MINTS || process.env.CASHU_MINTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    CASHU_DEFAULT_MINT:
        process.env.NEXT_PUBLIC_CASHU_MINT || process.env.CASHU_MINT || 'https://mint.minibits.cash',
};

export type Network = typeof ENV.NETWORK;

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ENV.NETWORK || !['MAINNET', 'TESTNET'].includes(ENV.NETWORK)) {
        errors.push('Invalid network configuration');
    }

    if (!ENV.CASHU_DEFAULT_MINT) {
        errors.push('No Cashu mint configured');
    }

    // Warn about missing optional configs
    if (!ENV.LND_URL) {
        console.warn('Lightning node URL not configured - using fallback mode');
    }

    if (ENV.CASHU_MINTS.length === 0) {
        console.warn('No multi-mint configuration - using single mint mode');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Initialize configuration validation
export const CONFIG_STATUS = validateConfig();