// Real Cashu client implementation using @cashu/cashu-ts
import { CashuMint, CashuWallet, MintQuoteState, Proof, getEncodedTokenV4, getDecodedToken } from '@cashu/cashu-ts';
import { EcashProof } from '../../domain';

export interface MintQuote {
    quote: string;
    amount: bigint;
    state: 'CREATED' | 'PAID' | 'ISSUED';
    request?: string; // Lightning payment request
}

export interface MeltQuote {
    quote: string;
    amount: bigint;
    fee_reserve: bigint;
}

export interface CashuClient {
    // Core operations
    createMintQuote(amount: bigint): Promise<MintQuote>;
    checkMintQuote(quote: string): Promise<MintQuote>;
    mintProofs(amount: bigint, quote: string): Promise<EcashProof[]>;

    // Lightning operations
    createMeltQuote(invoice: string): Promise<MeltQuote>;
    meltProofs(quote: MeltQuote, proofs: EcashProof[]): Promise<{ change: EcashProof[] }>;

    // Token operations
    createToken(proofs: EcashProof[]): string;
    receive(token: string): Promise<EcashProof[]>;

    // Privacy operations
    send(amount: bigint, proofs: EcashProof[]): Promise<{ keep: EcashProof[], send: EcashProof[] }>;

    // Multi-mint support
    getMintInfo(): Promise<{ name?: string, description?: string, version?: string }>;
    getBalance(proofs: EcashProof[]): bigint;
}

export class RealCashuClient implements CashuClient {
    private mint: CashuMint;
    private wallet: CashuWallet;
    private initialized = false;

    constructor(mintUrl: string) {
        this.mint = new CashuMint(mintUrl);
        this.wallet = new CashuWallet(this.mint);
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.wallet.loadMint();
            this.initialized = true;
        }
    }

    async createMintQuote(amount: bigint): Promise<MintQuote> {
        await this.ensureInitialized();
        const mintQuote = await this.wallet.createMintQuote(Number(amount));

        return {
            quote: mintQuote.quote,
            amount: BigInt(mintQuote.amount),
            state: mintQuote.state === MintQuoteState.PAID ? 'PAID' :
                mintQuote.state === MintQuoteState.ISSUED ? 'ISSUED' : 'CREATED',
            request: mintQuote.request
        };
    }

    async checkMintQuote(quote: string): Promise<MintQuote> {
        await this.ensureInitialized();
        const mintQuote = await this.wallet.checkMintQuote(quote);

        return {
            quote: mintQuote.quote,
            amount: BigInt(mintQuote.amount || 0),
            state: mintQuote.state === MintQuoteState.PAID ? 'PAID' :
                mintQuote.state === MintQuoteState.ISSUED ? 'ISSUED' : 'CREATED',
            request: mintQuote.request
        };
    }

    async mintProofs(amount: bigint, quote: string): Promise<EcashProof[]> {
        await this.ensureInitialized();
        const proofs = await this.wallet.mintProofs(Number(amount), quote);

        return proofs.map(this.convertToEcashProof);
    }

    async createMeltQuote(invoice: string): Promise<MeltQuote> {
        await this.ensureInitialized();
        const meltQuote = await this.wallet.createMeltQuote(invoice);

        return {
            quote: meltQuote.quote,
            amount: BigInt(meltQuote.amount),
            fee_reserve: BigInt(meltQuote.fee_reserve)
        };
    }

    async meltProofs(quote: MeltQuote, proofs: EcashProof[]): Promise<{ change: EcashProof[] }> {
        await this.ensureInitialized();
        const cashuProofs = proofs.map(this.convertFromEcashProof);

        // Create a proper MeltQuoteResponse object with all required fields
        const meltQuoteResponse = {
            quote: quote.quote,
            amount: Number(quote.amount),
            fee_reserve: Number(quote.fee_reserve),
            state: 'UNPAID' as const,
            expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
            payment_preimage: null,
            request: '', // Will be filled by the actual quote
            unit: 'sat'
        };

        const meltResponse = await this.wallet.meltProofs(meltQuoteResponse, cashuProofs);

        return {
            change: meltResponse.change?.map(this.convertToEcashProof) || []
        };
    }

    async send(amount: bigint, proofs: EcashProof[]): Promise<{ keep: EcashProof[], send: EcashProof[] }> {
        await this.ensureInitialized();
        const cashuProofs = proofs.map(this.convertFromEcashProof);
        const { keep, send } = await this.wallet.send(Number(amount), cashuProofs);

        return {
            keep: keep.map(this.convertToEcashProof),
            send: send.map(this.convertToEcashProof)
        };
    }

    createToken(proofs: EcashProof[]): string {
        const cashuProofs = proofs.map(this.convertFromEcashProof);
        return getEncodedTokenV4({
            mint: this.mint.mintUrl,
            proofs: cashuProofs
        });
    }

    async receive(token: string): Promise<EcashProof[]> {
        await this.ensureInitialized();
        const receiveProofs = await this.wallet.receive(token);
        return receiveProofs.map(this.convertToEcashProof);
    }

    async getMintInfo(): Promise<{ name?: string, description?: string, version?: string }> {
        await this.ensureInitialized();
        const info = await this.mint.getInfo();
        return {
            name: info.name,
            description: info.description,
            version: info.version
        };
    }

    getBalance(proofs: EcashProof[]): bigint {
        return proofs.reduce((sum, proof) => sum + proof.amount, 0n);
    }

    // Utility methods for proof conversion
    private convertToEcashProof(proof: Proof): EcashProof {
        return {
            secret: proof.secret,
            signature: proof.C,
            amount: BigInt(proof.amount),
            currency: 'SAT',
            keysetId: proof.id
        };
    }

    private convertFromEcashProof(proof: EcashProof): Proof {
        return {
            secret: proof.secret,
            C: proof.signature,
            amount: Number(proof.amount),
            id: proof.keysetId
        };
    }
}

// Multi-mint manager for routing diversification
export class MultiMintCashuManager {
    private clients: Map<string, RealCashuClient> = new Map();
    private mintUrls: string[];

    constructor(mintUrls: string[]) {
        this.mintUrls = mintUrls;
        mintUrls.forEach(url => {
            this.clients.set(url, new RealCashuClient(url));
        });
    }

    // Select mint based on privacy strategy (random selection for now)
    selectMint(): RealCashuClient {
        const randomIndex = Math.floor(Math.random() * this.mintUrls.length);
        const selectedUrl = this.mintUrls[randomIndex];
        return this.clients.get(selectedUrl)!;
    }

    // Get all mints for distributed operations
    getAllMints(): RealCashuClient[] {
        return Array.from(this.clients.values());
    }

    // Split tokens across multiple mints for privacy
    async distributeSend(
        totalAmount: bigint,
        proofs: EcashProof[],
        numberOfMints: number = 2
    ): Promise<{ distributions: Array<{ mint: RealCashuClient, proofs: EcashProof[] }> }> {
        const mintsToUse = this.mintUrls.slice(0, numberOfMints);
        const amountPerMint = totalAmount / BigInt(numberOfMints);
        const distributions = [];

        for (const mintUrl of mintsToUse) {
            const client = this.clients.get(mintUrl)!;
            // In real implementation, would need to convert proofs between mints
            // For now, just distribute existing proofs
            const relevantProofs = proofs.filter(p =>
                this.getBalance([p]) <= amountPerMint
            );
            distributions.push({ mint: client, proofs: relevantProofs });
        }

        return { distributions };
    }

    private getBalance(proofs: EcashProof[]): bigint {
        return proofs.reduce((sum, proof) => sum + proof.amount, 0n);
    }
}

// Legacy mock client for backward compatibility
export class MockCashuClient implements CashuClient {
    async createMintQuote(amount: bigint): Promise<MintQuote> {
        return { quote: `q_${Date.now()}`, amount, state: 'CREATED' };
    }
    async checkMintQuote(quote: string): Promise<MintQuote> {
        return { quote, amount: 0n, state: 'PAID' };
    }
    async mintProofs(amount: bigint, quote: string): Promise<EcashProof[]> {
        const proof: EcashProof = {
            secret: `sec_${quote}`,
            signature: `sig_${quote}`,
            amount,
            currency: 'SAT',
            keysetId: 'mock',
        };
        return [proof];
    }
    async createMeltQuote(invoice: string): Promise<MeltQuote> {
        return { quote: `melt_${Date.now()}`, amount: 1000n, fee_reserve: 10n };
    }
    async meltProofs(_quote: MeltQuote, _proofs: EcashProof[]): Promise<{ change: EcashProof[] }> {
        return { change: [] };
    }
    createToken(_proofs: EcashProof[]): string {
        return 'mock_token';
    }
    async receive(_token: string): Promise<EcashProof[]> {
        return [];
    }
    async send(amount: bigint, proofs: EcashProof[]): Promise<{ keep: EcashProof[], send: EcashProof[] }> {
        return { keep: proofs, send: [] };
    }
    async getMintInfo(): Promise<{ name?: string, description?: string, version?: string }> {
        return { name: 'Mock Mint', description: 'Test mint', version: '1.0.0' };
    }
    getBalance(proofs: EcashProof[]): bigint {
        return proofs.reduce((sum, proof) => sum + proof.amount, 0n);
    }
}
