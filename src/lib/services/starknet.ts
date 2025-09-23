import { MixRequest } from '../types';

export async function connectWallet(walletId: string) {
    await delay(600);
    return { walletId, address: '0xabc...123', network: 'starknet-sepolia' };
}

export async function depositSTRK(amount: number) {
    await delay(800);
    return { txHash: '0xdeposit' + Math.random().toString(16).slice(2), confirmed: true };
}

export async function withdrawSTRK(amount: number, destinations: string[]) {
    await delay(900);
    return { txHash: '0xwithdraw' + Math.random().toString(16).slice(2), outputs: destinations.length };
}

export async function estimateAnonymitySet(req: MixRequest) {
    // Simple heuristic based on privacy level & options
    const base = req.privacyLevel === 'maximum' ? 160 : req.privacyLevel === 'enhanced' ? 80 : 30;
    const bonus = (req.enableSplitOutputs ? req.splitCount * 5 : 0) + (req.enableDecoyTx ? 20 : 0);
    return base + bonus;
}

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}
