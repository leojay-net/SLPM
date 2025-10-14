'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletProvider';
import { ShieldCheckIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import WalletConnection from '@/components/WalletConnection';
import Notification from '@/components/Notification';
import { type WalletType } from '@/integrations/starknet/wallet';
import { IssueTokenTab } from '@/components/mixer/split/IssueTokenTab';
import { RedeemTokenTab } from '@/components/mixer/split/RedeemTokenTab';

type ActiveTab = 'issue' | 'redeem';

export default function SplitMixPage() {
    const wallet = useWallet();
    const [activeTab, setActiveTab] = useState<ActiveTab>('issue');
    const [isConnected, setIsConnected] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [notification, setNotification] = useState<{
        show: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
    }>({ show: false, type: 'info', title: '', message: '' });

    const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setNotification({ show: true, type, title, message });
    };

    const handleWalletConnect = async (walletId: string) => {
        setIsConnecting(true);
        try {
            const mapId = (id: string): WalletType => {
                if (id.toLowerCase() === 'argentx') return 'argentX';
                if (id.toLowerCase() === 'braavos') return 'braavos';
                if (id.toLowerCase() === 'okx') return 'okx';
                return 'argentX';
            };

            await wallet.connect(mapId(walletId));
            setIsConnected(true);
            setShowWalletModal(false);
            showNotification('success', 'Wallet Connected', `Connected to ${walletId}`);
        } catch {
            showNotification('error', 'Connection Failed', 'Failed to connect wallet. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    React.useEffect(() => {
        setIsConnected(wallet.isConnected);
    }, [wallet.isConnected]);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-gray-950">
                <div className="absolute inset-0" style={{
                    backgroundImage: "url('/patterns/grid.svg')",
                    backgroundSize: '40px 40px'
                }}></div>
            </div>

            <div className="absolute inset-0 opacity-70 pointer-events-none" style={{
                backgroundImage: "url('/patterns/grid.svg')",
                backgroundSize: '32px 32px',
                backgroundRepeat: 'repeat'
            }} />

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
                        >
                            <HomeIcon className="w-4 h-4" />
                            <span>Home</span>
                        </Link>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 text-white">Split Mix</h1>
                    <p className="text-gray-400 text-lg">
                        Issue ecash tokens or redeem them for STRK
                    </p>

                    <div className="mt-6 flex justify-center">
                        {!isConnected ? (
                            <button
                                onClick={() => setShowWalletModal(true)}
                                className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                            >
                                <ShieldCheckIcon className="w-5 h-5" />
                                <span>Connect Wallet</span>
                            </button>
                        ) : (
                            <div className="inline-flex items-center space-x-2 bg-green-500/20 border border-green-500 text-green-400 px-6 py-3 rounded-lg">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>Wallet Connected</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto mb-6">
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActiveTab('issue')}
                            className={`flex-1 px-6 py-4 text-center font-semibold transition ${activeTab === 'issue'
                                    ? 'border-b-2 border-orange-500 text-orange-500'
                                    : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <ShieldCheckIcon className="w-5 h-5" />
                                <span>Issue Token</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('redeem')}
                            className={`flex-1 px-6 py-4 text-center font-semibold transition ${activeTab === 'redeem'
                                    ? 'border-b-2 border-orange-500 text-orange-500'
                                    : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <ArrowPathIcon className="w-5 h-5" />
                                <span>Redeem Token</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="max-w-5xl mx-auto">
                    {activeTab === 'issue' ? (
                        <IssueTokenTab
                            isConnected={isConnected}
                            onConnectWallet={() => setShowWalletModal(true)}
                            showNotification={showNotification}
                        />
                    ) : (
                        <RedeemTokenTab
                            isConnected={isConnected}
                            onConnectWallet={() => setShowWalletModal(true)}
                            showNotification={showNotification}
                        />
                    )}
                </div>
            </div>

            {/* Modals and Notifications */}
            <WalletConnection
                isOpen={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                onConnect={handleWalletConnect}
                isConnecting={isConnecting}
            />

            <Notification
                type={notification.type}
                title={notification.title}
                message={notification.message}
                isVisible={notification.show}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
}
