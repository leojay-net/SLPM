'use client';

import { WalletProvider } from '../context/WalletContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <WalletProvider>
            {children}
        </WalletProvider>
    );
}
