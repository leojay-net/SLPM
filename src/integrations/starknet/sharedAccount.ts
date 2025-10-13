import { Account, RpcProvider, ec } from 'starknet';
import { StarknetSigner } from '@atomiqlabs/chain-starknet';
import { SHARED_SWAP_ACCOUNT_ADDRESS } from '@/config/constants';
import { ENV, getStarknetRpc } from '@/config/env';

// Lazy singleton for shared swap account (prototype only)
let sharedAccount: Account | null = null;
let sharedSigner: StarknetSigner | null = null;
let sharedProvider: RpcProvider | null = null;

export function getSharedSwapAccount(): StarknetSigner | null {
    if (sharedSigner) return sharedSigner;
    if (!ENV.SHARED_SWAP_ACCOUNT_PRIVATE_KEY) {
        return null; // Not configured
    }

    const address = (ENV.SHARED_SWAP_ACCOUNT_ADDRESS || SHARED_SWAP_ACCOUNT_ADDRESS).toLowerCase();
    const provider = new RpcProvider({ nodeUrl: getStarknetRpc() });
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

        sharedAccount = new Account(provider, address, pk);
        sharedSigner = new StarknetSigner(sharedAccount);
        return sharedSigner;
    } catch (e) {
        console.error('Failed to instantiate shared swap account:', e);
        return null;
    }
}

export function getSharedSwapProvider(): RpcProvider | null {
    return sharedProvider;
}

export function getSharedSwapAccountRaw(): Account | null {
    // Get the raw Account for contracts that need it
    if (!sharedSigner) {
        // Try to initialize if not already done
        getSharedSwapAccount();
    }
    return sharedAccount;
}
