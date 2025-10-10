import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { WalletConnection, WalletType } from '../integrations/starknet/wallet';
import { getWalletClient } from '../integrations/starknet/wallet';

interface WalletContextType {
    connection: WalletConnection | null;
    isConnecting: boolean;
    error: string | null;
    connect: (preferredWallet?: WalletType) => Promise<void>;
    disconnect: () => Promise<void>;
    isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = 'slpm-starknet-wallet';
const CONNECTION_STORAGE_KEY = 'slpm-wallet-connected';

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [connection, setConnection] = useState<WalletConnection | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load wallet preference and auto-reconnect
    useEffect(() => {
        const wasConnected = localStorage.getItem(CONNECTION_STORAGE_KEY) === 'true';
        const preferredWallet = localStorage.getItem(WALLET_STORAGE_KEY) as WalletType | null;

        if (wasConnected && preferredWallet) {
            console.log('🔄 Auto-reconnecting to wallet:', preferredWallet);
            autoReconnect(preferredWallet);
        }
    }, []);

    const autoReconnect = async (preferredWallet: WalletType) => {
        try {
            setIsConnecting(true);
            setError(null);

            const walletClient = getWalletClient();
            const conn = await walletClient.connect(preferredWallet);

            setConnection(conn);
            localStorage.setItem(CONNECTION_STORAGE_KEY, 'true');
            localStorage.setItem(WALLET_STORAGE_KEY, preferredWallet);

            console.log('✅ Auto-reconnected to wallet:', {
                address: conn.account.address,
                walletType: conn.walletType
            });
        } catch (error) {
            console.warn('⚠️ Auto-reconnection failed:', error);
            // Clear stored preferences if auto-reconnection fails
            localStorage.removeItem(CONNECTION_STORAGE_KEY);
            localStorage.removeItem(WALLET_STORAGE_KEY);
            setError(error instanceof Error ? error.message : 'Failed to auto-reconnect');
        } finally {
            setIsConnecting(false);
        }
    };

    const connect = useCallback(async (preferredWallet?: WalletType) => {
        try {
            setIsConnecting(true);
            setError(null);

            const walletClient = getWalletClient();
            const conn = await walletClient.connect(preferredWallet);

            setConnection(conn);
            localStorage.setItem(CONNECTION_STORAGE_KEY, 'true');
            if (preferredWallet) {
                localStorage.setItem(WALLET_STORAGE_KEY, preferredWallet);
            }

            console.log('✅ Connected to wallet:', {
                address: conn.account.address,
                walletType: conn.walletType
            });
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            setError(error instanceof Error ? error.message : 'Failed to connect to wallet');
            throw error;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            const walletClient = getWalletClient();
            await walletClient.disconnect();

            setConnection(null);
            setError(null);

            // Clear stored preferences
            localStorage.removeItem(CONNECTION_STORAGE_KEY);
            localStorage.removeItem(WALLET_STORAGE_KEY);

            console.log('✅ Disconnected from wallet');
        } catch (error) {
            console.error('❌ Wallet disconnection failed:', error);
            setError(error instanceof Error ? error.message : 'Failed to disconnect wallet');
        }
    }, []);

    const isConnected = connection?.isConnected || false;

    const value: WalletContextType = {
        connection,
        isConnecting,
        error,
        connect,
        disconnect,
        isConnected
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
