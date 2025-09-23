"use client";
import React, { useState } from 'react';
import { WalletIcon, CreditCardIcon, KeyIcon, ShieldCheckIcon, ShieldExclamationIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface WalletOption {
    id: string;
    name: string;
    icon: string;
    description: string;
    isInstalled: boolean;
    isPopular?: boolean;
}

interface WalletConnectionProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (walletId: string) => void;
    isConnecting: boolean;
}

export default function WalletConnection({ isOpen, onClose, onConnect, isConnecting }: WalletConnectionProps) {
    const [selectedWallet, setSelectedWallet] = useState<string>('');

    const wallets: WalletOption[] = [
        {
            id: 'argentx',
            name: 'ArgentX',
            icon: 'argentx',
            description: 'Most popular Starknet wallet with advanced features',
            isInstalled: typeof window !== 'undefined' && !!(window as any).starknet_argentX,
            isPopular: true
        },
        {
            id: 'braavos',
            name: 'Braavos',
            icon: 'braavos',
            description: 'Security-focused wallet with hardware support',
            isInstalled: typeof window !== 'undefined' && !!(window as any).starknet_braavos
        },
        {
            id: 'okx',
            name: 'OKX Wallet',
            icon: 'okx',
            description: 'Multi-chain wallet with DeFi integration',
            isInstalled: typeof window !== 'undefined' && !!(window as any).starknet_okxwallet
        }
    ];

    const handleConnect = (walletId: string) => {
        setSelectedWallet(walletId);
        onConnect(walletId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <WalletIcon className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-3">
                    {wallets.map((wallet) => (
                        <div key={wallet.id} className="relative">
                            <button
                                onClick={() => handleConnect(wallet.id)}
                                disabled={isConnecting || !wallet.isInstalled}
                                className={`w-full p-4 rounded-lg border transition-all duration-200 ${wallet.isInstalled
                                        ? 'border-gray-600 hover:border-orange-500 hover:bg-gray-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                                        : 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-50'
                                    } ${selectedWallet === wallet.id && isConnecting
                                        ? 'border-orange-500 bg-orange-500/10'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                                        {wallet.id === 'argentx' && <ShieldCheckIcon className="w-6 h-6 text-blue-400" />}
                                        {wallet.id === 'braavos' && <ShieldExclamationIcon className="w-6 h-6 text-orange-400" />}
                                        {wallet.id === 'okx' && <CircleStackIcon className="w-6 h-6 text-gray-300" />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-semibold text-white">{wallet.name}</h3>
                                            {wallet.isPopular && (
                                                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded font-medium">
                                                    Popular
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{wallet.description}</p>
                                        {!wallet.isInstalled && (
                                            <p className="text-xs text-red-400 mt-1">Not installed</p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {wallet.isInstalled ? (
                                            <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <KeyIcon className="w-5 h-5 text-gray-600" />
                                        )}
                                        {selectedWallet === wallet.id && isConnecting && (
                                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-start space-x-3">
                        <CreditCardIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-white">Wallet Security</h4>
                            <p className="text-sm text-gray-400 mt-1">
                                Only connect wallets you trust. The mixer requires transaction signing for privacy operations.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Don&apos;t have a wallet?{' '}
                        <a
                            href="https://www.argent.xyz/starknet/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-400 hover:text-orange-300 transition-colors"
                        >
                            Install ArgentX
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
