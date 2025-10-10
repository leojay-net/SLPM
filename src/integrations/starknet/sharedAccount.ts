import { Account, RpcProvider, ec } from 'starknet';
import { RpcProviderWithRetries, StarknetSigner } from '@atomiqlabs/chain-starknet';
import { SHARED_SWAP_ACCOUNT_ADDRESS } from '@/config/constants';
import { ENV, getStarknetRpc } from '@/config/env';

// Lazy singleton for shared swap account (prototype only)
let sharedAccount: Account | null = null;
let sharedProvider: RpcProviderWithRetries | null = null;
let sharedSigner: StarknetSigner | null = null;

export function getSharedSwapAccount(): Account | null {
    if (sharedAccount) return sharedAccount;
    if (!ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY) {
        return null; // Not configured
    }

    const address = (ENV.SHARED_SWAP_ACCOUNT_ADDRESS || SHARED_SWAP_ACCOUNT_ADDRESS).toLowerCase();
    // Use RpcProviderWithRetries like the SDK example
    const provider = new RpcProviderWithRetries({ nodeUrl: getStarknetRpc() });
    sharedProvider = provider;

    try {
        // Validate private key (basic length/hex check)
        const pk = ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY.startsWith('0x')
            ? ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY
            : '0x' + ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY;

        if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
            console.warn('Shared swap account private key format unexpected');
        }

        // Derive public key just for logging (not strictly needed)
        try {
            const pub = ec.starkCurve.getStarkKey(pk);
            console.log('🔐 Shared swap account loaded (pubkey prefix):', pub.slice(0, 10) + '...');
        } catch (e) {
            console.warn('Could not derive public key for shared swap account:', e);
        }

        // Create account with RpcProviderWithRetries like the SDK example
        sharedAccount = new Account(provider as any, address, pk);
        return sharedAccount;
    } catch (e) {
        console.error('Failed to instantiate shared swap account:', e);
        return null;
    }
}

export function getSharedSwapProvider(): RpcProviderWithRetries | null {
    return sharedProvider;
}

// Create StarknetSigner exactly like the SDK example
export function getSharedSwapSigner(): StarknetSigner | null {
    if (sharedSigner) return sharedSigner;
    const account = getSharedSwapAccount();
    if (!account) return null;

    try {
        // Follow the SDK example pattern exactly: new StarknetSigner(account)
        sharedSigner = new StarknetSigner(account);
        console.log('✅ Created StarknetSigner with address:', sharedSigner.getAddress());
        return sharedSigner;
    } catch (e) {
        console.error('Failed to create StarknetSigner:', e);
        return null;
    }
}
