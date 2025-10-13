/**
 * Cashu Token Manager
 * 
 * Utility to save, load, and manage Cashu ecash tokens
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDecodedToken } from '@cashu/cashu-ts';

export interface SavedToken {
    id: string;
    token: string;
    mint: string;
    amount: number;
    createdAt: string;
    isSpent: boolean;
    description?: string;
}

export class CashuTokenManager {
    private tokensFile: string;

    constructor(tokensFile = 'cashu-tokens.json') {
        this.tokensFile = path.join(process.cwd(), tokensFile);
    }

    private loadTokens(): SavedToken[] {
        try {
            if (fs.existsSync(this.tokensFile)) {
                const data = fs.readFileSync(this.tokensFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Failed to load tokens file:', error);
        }
        return [];
    }

    private saveTokens(tokens: SavedToken[]): void {
        try {
            fs.writeFileSync(this.tokensFile, JSON.stringify(tokens, null, 2));
        } catch (error) {
            console.error('Failed to save tokens:', error);
        }
    }

    saveToken(token: string, description?: string): string {
        try {
            const decoded = getDecodedToken(token);
            const totalAmount = decoded.proofs.reduce((sum: number, p: any) => sum + p.amount, 0);

            const savedToken: SavedToken = {
                id: Date.now().toString(),
                token,
                mint: decoded.mint,
                amount: totalAmount,
                createdAt: new Date().toISOString(),
                isSpent: false,
                description
            };

            const tokens = this.loadTokens();
            tokens.push(savedToken);
            this.saveTokens(tokens);

            console.log(`✅ Token saved with ID: ${savedToken.id}`);
            console.log(`💰 Amount: ${totalAmount} sats`);
            console.log(`🏭 Mint: ${decoded.mint}`);

            return savedToken.id;
        } catch (error) {
            console.error('Failed to save token:', error);
            throw error;
        }
    }

    listTokens(): SavedToken[] {
        const tokens = this.loadTokens();

        if (tokens.length === 0) {
            console.log('📭 No tokens found');
            return [];
        }

        console.log('\n📋 Saved Tokens:');
        console.log('='.repeat(80));

        tokens.forEach((token, index) => {
            const status = token.isSpent ? '❌ SPENT' : '✅ AVAILABLE';
            console.log(`${index + 1}. ID: ${token.id} | ${status}`);
            console.log(`   Amount: ${token.amount} sats`);
            console.log(`   Mint: ${token.mint}`);
            console.log(`   Created: ${new Date(token.createdAt).toLocaleString()}`);
            if (token.description) {
                console.log(`   Description: ${token.description}`);
            }
            console.log('   ' + '-'.repeat(70));
        });

        return tokens;
    }

    getToken(id: string): SavedToken | null {
        const tokens = this.loadTokens();
        return tokens.find(t => t.id === id) || null;
    }

    getTokenString(id: string): string | null {
        const savedToken = this.getToken(id);
        return savedToken ? savedToken.token : null;
    }

    markAsSpent(id: string): void {
        const tokens = this.loadTokens();
        const token = tokens.find(t => t.id === id);
        if (token) {
            token.isSpent = true;
            this.saveTokens(tokens);
            console.log(`✅ Token ${id} marked as spent`);
        }
    }

    deleteToken(id: string): void {
        const tokens = this.loadTokens();
        const filteredTokens = tokens.filter(t => t.id !== id);
        this.saveTokens(filteredTokens);
        console.log(`🗑️ Token ${id} deleted`);
    }

    exportToken(id: string): void {
        const savedToken = this.getToken(id);
        if (!savedToken) {
            console.log('❌ Token not found');
            return;
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎫 ECASH TOKEN EXPORT');
        console.log('='.repeat(80));
        console.log(`ID: ${savedToken.id}`);
        console.log(`Amount: ${savedToken.amount} sats`);
        console.log(`Status: ${savedToken.isSpent ? 'SPENT' : 'AVAILABLE'}`);
        console.log('');
        console.log('Token:');
        console.log('-'.repeat(40));
        console.log(savedToken.token);
        console.log('-'.repeat(40));
        console.log('='.repeat(80));
    }

    getAvailableTokens(): SavedToken[] {
        return this.loadTokens().filter(t => !t.isSpent);
    }

    getTotalBalance(): number {
        return this.getAvailableTokens().reduce((sum, token) => sum + token.amount, 0);
    }

    showBalance(): void {
        const availableTokens = this.getAvailableTokens();
        const totalBalance = this.getTotalBalance();

        console.log('\n💰 WALLET BALANCE');
        console.log('='.repeat(40));
        console.log(`Available tokens: ${availableTokens.length}`);
        console.log(`Total balance: ${totalBalance} sats`);
        console.log('='.repeat(40));
    }
}

// CLI utility functions
export async function tokenManagerCLI(): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };

    const manager = new CashuTokenManager();

    console.log('🪙 Cashu Token Manager');
    console.log('======================');

    try {
        while (true) {
            console.log('\nOptions:');
            console.log('1. List all tokens');
            console.log('2. Show balance');
            console.log('3. Export token');
            console.log('4. Mark token as spent');
            console.log('5. Delete token');
            console.log('6. Add existing token');
            console.log('0. Exit');

            const choice = await question('\nEnter choice (0-6): ');

            switch (choice.trim()) {
                case '1':
                    manager.listTokens();
                    break;

                case '2':
                    manager.showBalance();
                    break;

                case '3': {
                    const tokens = manager.listTokens();
                    if (tokens.length > 0) {
                        const id = await question('Enter token ID to export: ');
                        manager.exportToken(id);
                    }
                    break;
                }

                case '4': {
                    const tokens = manager.listTokens();
                    if (tokens.length > 0) {
                        const id = await question('Enter token ID to mark as spent: ');
                        manager.markAsSpent(id);
                    }
                    break;
                }

                case '5': {
                    const tokens = manager.listTokens();
                    if (tokens.length > 0) {
                        const id = await question('Enter token ID to delete: ');
                        const confirm = await question('Are you sure? (yes/no): ');
                        if (confirm.toLowerCase() === 'yes') {
                            manager.deleteToken(id);
                        }
                    }
                    break;
                }

                case '6': {
                    const token = await question('Enter ecash token: ');
                    const description = await question('Enter description (optional): ');
                    try {
                        manager.saveToken(token, description || undefined);
                    } catch (error) {
                        console.error('❌ Failed to add token:', error);
                    }
                    break;
                }

                case '0':
                    console.log('👋 Goodbye!');
                    rl.close();
                    return;

                default:
                    console.log('❌ Invalid choice');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
        rl.close();
    }
}

// Run CLI if called directly
if (require.main === module) {
    tokenManagerCLI().catch(console.error);
}