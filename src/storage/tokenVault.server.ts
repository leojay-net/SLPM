// Server-only token vault for persisting Cashu tokens by quoteId
// Storage backend: JSON file under .data/cashu-tokens.json

import { promises as fs } from 'fs';
import path from 'path';

export interface StoredTokenRecord {
    quote: string;
    token: string;
    mintUrl: string;
    amountSats: number;
    proofsCount?: number;
    createdAt: number; // epoch ms
}

interface VaultFileShape {
    version: number;
    records: Record<string, StoredTokenRecord>; // keyed by quote
}

const DATA_DIR = path.join(process.cwd(), '.data');
const VAULT_FILE = path.join(DATA_DIR, 'cashu-tokens.json');

async function ensureDir(): Promise<void> {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (_) {
        // ignore
    }
}

async function loadFile(): Promise<VaultFileShape> {
    await ensureDir();
    try {
        const raw = await fs.readFile(VAULT_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.records) {
            return { version: parsed.version || 1, records: parsed.records };
        }
    } catch (_) { }
    return { version: 1, records: {} };
}

async function saveFile(data: VaultFileShape): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(VAULT_FILE, content, 'utf8');
}

const TokenVault = {
    async get(quote: string): Promise<StoredTokenRecord | null> {
        const data = await loadFile();
        return data.records[quote] || null;
    },

    async set(record: StoredTokenRecord): Promise<void> {
        const data = await loadFile();
        data.records[record.quote] = record;
        await saveFile(data);
    },

    async has(quote: string): Promise<boolean> {
        const rec = await this.get(quote);
        return !!rec;
    },

    async list(limit = 100): Promise<StoredTokenRecord[]> {
        const data = await loadFile();
        const all = Object.values(data.records);
        all.sort((a, b) => b.createdAt - a.createdAt);
        return all.slice(0, limit);
    }
};

export default TokenVault;
