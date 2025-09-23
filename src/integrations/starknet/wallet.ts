// Starknet wallet integration for ArgentX and Braavos
import { connect, disconnect } from '@starknet-io/get-starknet';
import { Account, Provider, Contract, CallData, cairo, RpcProvider, num } from 'starknet';
import { PrivacyMixerContract, createPrivacyMixerContract } from './privacy-mixer-contract';

export type WalletType = 'argentX' | 'braavos' | 'bitkeep' | 'okx';

export interface StarknetAccount {
    address: string;
    publicKey: string;
    walletType: WalletType;
    chainId: string;
}

export interface WalletConnection {
    account: Account;
    provider: Provider;
    isConnected: boolean;
    walletType: WalletType;
}

export interface TransactionResult {
    transactionHash: string;
    status: 'PENDING' | 'ACCEPTED_ON_L2' | 'ACCEPTED_ON_L1' | 'REJECTED';
    blockNumber?: number;
    actualFee?: string;
}

export interface TokenBalance {
    symbol: string;
    address: string;
    balance: bigint;
    decimals: number;
}

export interface StarknetWalletClient {
    // Connection management
    connect(preferredWallet?: WalletType): Promise<WalletConnection>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // Account operations
    getAccount(): StarknetAccount | null;
    getBalance(tokenAddress?: string): Promise<TokenBalance>;

    // Transaction operations
    sendTransaction(calls: Array<{
        contractAddress: string;
        entrypoint: string;
        calldata: any[];
    }>): Promise<TransactionResult>;

    waitForTransaction(txHash: string, retryInterval?: number): Promise<TransactionResult>;

    // Token operations
    transfer(tokenAddress: string, recipient: string, amount: bigint): Promise<TransactionResult>;
    approve(tokenAddress: string, spender: string, amount: bigint): Promise<TransactionResult>;

    // Multi-account support for privacy
    switchAccount(accountIndex: number): Promise<StarknetAccount>;
    listAccounts(): Promise<StarknetAccount[]>;

    // Contract interactions
    callContract(contractAddress: string, entrypoint: string, calldata: any[]): Promise<any>;

    // Privacy mixer integration methods
    initMixerContract(contractAddress: string): Promise<void>;
    depositToMixer(commitment: string, amount: bigint): Promise<string>;
    withdrawFromMixer(nullifier: string, commitment: string, recipient: string, amount: bigint, proof: string[]): Promise<string>;
    getMixerStats(): Promise<any>;
    getPrivacyMetrics(): Promise<any>;
}

export class RealStarknetWalletClient implements StarknetWalletClient {
    private connection: WalletConnection | null = null;
    private rpcProvider: RpcProvider;
    private mixerContract: PrivacyMixerContract | null = null;

    constructor(rpcUrl?: string) {
        this.rpcProvider = new RpcProvider({
            nodeUrl: rpcUrl || 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7'
        });
    }

    async connect(preferredWallet?: WalletType): Promise<WalletConnection> {
        try {
            if (typeof window === 'undefined') {
                throw new Error('Wallet connection is only available in the browser');
            }

            // Try to connect to a specific injected wallet first
            const w = window as any;
            let injected: any | null = null;
            const want = (preferredWallet || 'argentX').toLowerCase();
            if (want === 'argentx') injected = w.starknet_argentX || null;
            if (want === 'braavos') injected = w.starknet_braavos || injected;
            if (want === 'okx') injected = w.starknet_okxwallet || injected;

            // Fallback: open wallet selection modal if available
            let provider: any = injected;
            if (!provider) {
                try {
                    provider = await connect({ modalMode: 'always' } as any);
                } catch {
                    // ignore and handle below
                }
            }

            if (!provider) {
                throw new Error('No compatible Starknet wallet found');
            }

            // Ask for permissions/enable
            if (typeof provider.enable === 'function') {
                await provider.enable({ showModal: false }).catch(() => { });
            }

            const walletType = this.detectWalletType(provider);
            const account = (provider.account || provider) as unknown as Account;

            this.connection = {
                account,
                provider: this.rpcProvider,
                isConnected: true,
                walletType,
            };
            return this.connection;
        } catch (error) {
            throw new Error(`Failed to connect to Starknet wallet: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            await disconnect();
            this.connection = null;
        }
    }

    isConnected(): boolean {
        return this.connection?.isConnected || false;
    }

    getAccount(): StarknetAccount | null {
        if (!this.connection) return null;

        return {
            address: this.connection.account.address,
            publicKey: '', // Public key extraction varies by wallet
            walletType: this.connection.walletType,
            chainId: 'SN_MAIN' // Default to mainnet
        };
    }

    async getBalance(tokenAddress?: string): Promise<TokenBalance> {
        if (!this.connection) {
            throw new Error('Wallet not connected');
        }

        // Default to ETH if no token specified
        const ethAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
        const contractAddress = tokenAddress || ethAddress;

        try {
            // Call balanceOf function
            const result = await this.connection.provider.callContract({
                contractAddress,
                entrypoint: 'balanceOf',
                calldata: [this.connection.account.address]
            });

            const balance = BigInt(result[0]);

            // Get token info
            const decimalsResult = await this.connection.provider.callContract({
                contractAddress,
                entrypoint: 'decimals',
                calldata: []
            });

            const symbolResult = await this.connection.provider.callContract({
                contractAddress,
                entrypoint: 'symbol',
                calldata: []
            });

            return {
                symbol: num.toHex(symbolResult[0]), // Convert felt to string
                address: contractAddress,
                balance,
                decimals: Number(decimalsResult[0])
            };
        } catch (error) {
            throw new Error(`Failed to get balance: ${error}`);
        }
    }

    async sendTransaction(calls: Array<{
        contractAddress: string;
        entrypoint: string;
        calldata: any[];
    }>): Promise<TransactionResult> {
        if (!this.connection) {
            throw new Error('Wallet not connected');
        }

        try {
            const result = await this.connection.account.execute(calls);

            return {
                transactionHash: result.transaction_hash,
                status: 'PENDING'
            };
        } catch (error) {
            throw new Error(`Transaction failed: ${error}`);
        }
    }

    async waitForTransaction(
        txHash: string,
        retryInterval: number = 5000
    ): Promise<TransactionResult> {
        if (!this.connection) {
            throw new Error('Wallet not connected');
        }

        try {
            const receipt = await this.connection.provider.waitForTransaction(txHash);

            return {
                transactionHash: txHash,
                status: receipt.isSuccess() ? 'ACCEPTED_ON_L2' : 'REJECTED',
                blockNumber: (receipt as any).block_number || undefined,
                actualFee: (receipt as any).actual_fee?.toString() || undefined
            };
        } catch (error) {
            throw new Error(`Failed to wait for transaction: ${error}`);
        }
    } async transfer(
        tokenAddress: string,
        recipient: string,
        amount: bigint
    ): Promise<TransactionResult> {
        const calls = [{
            contractAddress: tokenAddress,
            entrypoint: 'transfer',
            calldata: CallData.compile([recipient, cairo.uint256(amount)])
        }];

        return this.sendTransaction(calls);
    }

    async approve(
        tokenAddress: string,
        spender: string,
        amount: bigint
    ): Promise<TransactionResult> {
        const calls = [{
            contractAddress: tokenAddress,
            entrypoint: 'approve',
            calldata: CallData.compile([spender, cairo.uint256(amount)])
        }];

        return this.sendTransaction(calls);
    }

    async switchAccount(accountIndex: number): Promise<StarknetAccount> {
        // This would depend on wallet's multi-account support
        // For now, return current account
        const account = this.getAccount();
        if (!account) {
            throw new Error('No account connected');
        }
        return account;
    }

    async listAccounts(): Promise<StarknetAccount[]> {
        // This would query the wallet for all available accounts
        // For now, return current account
        const account = this.getAccount();
        return account ? [account] : [];
    }

    async callContract(
        contractAddress: string,
        entrypoint: string,
        calldata: any[]
    ): Promise<any> {
        if (!this.connection) {
            throw new Error('Wallet not connected');
        }

        return this.connection.provider.callContract({
            contractAddress,
            entrypoint,
            calldata
        });
    }

    // Privacy mixer contract integration
    async initMixerContract(contractAddress: string): Promise<void> {
        if (!this.connection) {
            throw new Error('No wallet connected');
        }

        try {
            this.mixerContract = await createPrivacyMixerContract(
                contractAddress,
                '', // We'll use the connected account instead
                this.rpcProvider.channel.nodeUrl || 'https://alpha4.starknet.io'
            );
        } catch (error) {
            console.error('Failed to initialize mixer contract:', error);
            throw error;
        }
    }

    async depositToMixer(commitment: string, amount: bigint): Promise<string> {
        if (!this.mixerContract) {
            throw new Error('Mixer contract not initialized. Call initMixerContract first.');
        }
        if (!this.connection) {
            throw new Error('No wallet connected');
        }

        try {
            const result = await this.mixerContract.deposit(commitment, amount);
            return result.transaction_hash;
        } catch (error) {
            console.error('Failed to deposit to mixer:', error);
            throw error;
        }
    }

    async withdrawFromMixer(
        nullifier: string,
        commitment: string,
        recipient: string,
        amount: bigint,
        proof: string[]
    ): Promise<string> {
        if (!this.mixerContract) {
            throw new Error('Mixer contract not initialized. Call initMixerContract first.');
        }
        if (!this.connection) {
            throw new Error('No wallet connected');
        }

        try {
            const result = await this.mixerContract.withdraw(
                nullifier,
                commitment,
                recipient,
                amount,
                proof
            );
            return result.transaction_hash;
        } catch (error) {
            console.error('Failed to withdraw from mixer:', error);
            throw error;
        }
    }

    async getMixerStats(): Promise<any> {
        if (!this.mixerContract) {
            throw new Error('Mixer contract not initialized. Call initMixerContract first.');
        }

        return await this.mixerContract.get_mixing_stats();
    }

    async getPrivacyMetrics(): Promise<any> {
        if (!this.mixerContract) {
            throw new Error('Mixer contract not initialized. Call initMixerContract first.');
        }

        return await this.mixerContract.verify_privacy_guarantees();
    }

    private detectWalletType(starknet: any): WalletType {
        // Detect wallet type based on provider details
        if (starknet.id?.includes('argentX')) return 'argentX';
        if (starknet.id?.includes('braavos')) return 'braavos';
        if (starknet.id?.includes('bitkeep')) return 'bitkeep';
        if (starknet.id?.includes('okx')) return 'okx';

        // Default fallback
        return 'argentX';
    }
}

// Mock implementation for testing
export class MockStarknetWalletClient implements StarknetWalletClient {
    private connected = false;
    private mockAccount: StarknetAccount = {
        address: '0x123...mock',
        publicKey: '0xabc...mock',
        walletType: 'argentX',
        chainId: 'SN_MAIN'
    };

    async connect(preferredWallet?: WalletType): Promise<WalletConnection> {
        this.connected = true;
        return {
            account: {} as Account,
            provider: {} as Provider,
            isConnected: true,
            walletType: preferredWallet || 'argentX'
        };
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    getAccount(): StarknetAccount | null {
        return this.connected ? this.mockAccount : null;
    }

    async getBalance(tokenAddress?: string): Promise<TokenBalance> {
        return {
            symbol: 'STRK',
            address: tokenAddress || '0x123...strk',
            balance: BigInt(1000000),
            decimals: 18
        };
    }

    async sendTransaction(calls: any): Promise<TransactionResult> {
        return {
            transactionHash: '0x' + Date.now().toString(16),
            status: 'PENDING'
        };
    }

    async waitForTransaction(txHash: string): Promise<TransactionResult> {
        return {
            transactionHash: txHash,
            status: 'ACCEPTED_ON_L2',
            blockNumber: 123456
        };
    }

    async transfer(tokenAddress: string, recipient: string, amount: bigint): Promise<TransactionResult> {
        return this.sendTransaction([]);
    }

    async approve(tokenAddress: string, spender: string, amount: bigint): Promise<TransactionResult> {
        return this.sendTransaction([]);
    }

    async switchAccount(accountIndex: number): Promise<StarknetAccount> {
        return this.mockAccount;
    }

    async listAccounts(): Promise<StarknetAccount[]> {
        return [this.mockAccount];
    }

    async callContract(contractAddress: string, entrypoint: string, calldata: any[]): Promise<any> {
        return { result: ['0x123'] };
    }

    async initMixerContract(_contractAddress: string): Promise<void> {
        // Mock implementation - no-op
    }

    async depositToMixer(_commitment: string, _amount: bigint): Promise<string> {
        return '0x' + Date.now().toString(16);
    }

    async withdrawFromMixer(
        _nullifier: string,
        _commitment: string,
        _recipient: string,
        _amount: bigint,
        _proof: string[]
    ): Promise<string> {
        return '0x' + Date.now().toString(16);
    }

    async getMixerStats(): Promise<any> {
        return {
            total_deposits: 1000n,
            total_withdrawals: 500n,
            active_commitments: 500n,
            anonymity_set_size: 100n,
            mixing_efficiency: 95n,
        };
    }

    async getPrivacyMetrics(): Promise<any> {
        return {
            min_anonymity_set: 10n,
            avg_mixing_time: 3600n,
            unlinkability_score: 95n,
            temporal_privacy_score: 90n,
        };
    }
}

// Wallet connection manager
export class StarknetWalletManager {
    private clients = new Map<WalletType, StarknetWalletClient>();
    private activeClient: StarknetWalletClient | null = null;

    constructor() {
        // Initialize supported wallet clients
        this.clients.set('argentX', new RealStarknetWalletClient());
        this.clients.set('braavos', new RealStarknetWalletClient());
        this.clients.set('okx', new RealStarknetWalletClient());
    }

    async connectWallet(preferredWallet?: WalletType): Promise<WalletConnection> {
        const client = preferredWallet ?
            this.clients.get(preferredWallet) :
            this.clients.get('argentX');

        if (!client) {
            throw new Error(`Unsupported wallet: ${preferredWallet}`);
        }

        const connection = await client.connect(preferredWallet);
        this.activeClient = client;
        return connection;
    }

    getActiveClient(): StarknetWalletClient | null {
        return this.activeClient;
    }

    async disconnectAll(): Promise<void> {
        if (this.activeClient) {
            await this.activeClient.disconnect();
            this.activeClient = null;
        }
    }

    getSupportedWallets(): WalletType[] {
        return Array.from(this.clients.keys());
    }
}
