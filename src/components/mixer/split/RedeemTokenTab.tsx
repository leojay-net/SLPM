'use client';

import React, { useState } from 'react';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

type RedeemStatus = 'idle' | 'validating' | 'creating_swap' | 'melting' | 'claiming' | 'forwarding' | 'complete' | 'error';

interface RedeemTokenTabProps {
    isConnected: boolean;
    onConnectWallet: () => void;
    showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export function RedeemTokenTab({ isConnected, onConnectWallet, showNotification }: RedeemTokenTabProps) {
    const [token, setToken] = useState('');
    const [recipient, setRecipient] = useState('');
    const [status, setStatus] = useState<RedeemStatus>('idle');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [txHash, setTxHash] = useState('');
    const [changeToken, setChangeToken] = useState('');

    const handleRedeem = async () => {
        if (!isConnected) {
            onConnectWallet();
            return;
        }

        if (!token.trim()) {
            showNotification('error', 'Missing Token', 'Please enter an ecash token');
            return;
        }

        if (!recipient.trim()) {
            showNotification('error', 'Missing Recipient', 'Please enter a recipient address');
            return;
        }

        setStatus('validating');
        setError('');
        setProgress(10);

        try {
            // Import redeemCashuToken orchestrator function
            const { redeemCashuToken } = await import('@/orchestrator/steps/redeemCashu');

            await redeemCashuToken(token, recipient, (event: any) => {
                // Handle progress events
                if (event.type === 'redeem:validating') {
                    setStatus('validating');
                    setProgress(20);
                }
                if (event.type === 'redeem:creating_swap') {
                    setStatus('creating_swap');
                    setProgress(30);
                    showNotification('info', 'Creating Swap', 'Preparing Lightning to STRK swap');
                }
                if (event.type === 'redeem:melting') {
                    setStatus('melting');
                    setProgress(50);
                    showNotification('info', 'Melting Ecash', 'Converting ecash to Lightning payment');
                }
                if (event.type === 'redeem:claiming') {
                    setStatus('claiming');
                    setProgress(70);
                    showNotification('info', 'Claiming Swap', 'Finalizing STRK transfer');
                }
                if (event.type === 'redeem:forwarding') {
                    setStatus('forwarding');
                    setProgress(85);
                }
                if (event.type === 'redeem:complete') {
                    setStatus('complete');
                    setProgress(100);
                    if (event.txHash) setTxHash(event.txHash);
                    if (event.changeToken) setChangeToken(event.changeToken);
                    showNotification('success', 'Redemption Complete', 'STRK sent to recipient');
                }
                if (event.type === 'redeem:error') {
                    setStatus('error');
                    setError(event.message || 'Redemption failed');
                    showNotification('error', 'Redemption Failed', event.message || 'Unknown error');
                }
            });

        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Unknown error');
            showNotification('error', 'Redemption Failed', err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const reset = () => {
        setStatus('idle');
        setToken('');
        setRecipient('');
        setError('');
        setProgress(0);
        setTxHash('');
        setChangeToken('');
    };

    const getStatusText = () => {
        switch (status) {
            case 'validating': return 'Validating token...';
            case 'creating_swap': return 'Creating Lightning to STRK swap...';
            case 'melting': return 'Melting ecash to Lightning...';
            case 'claiming': return 'Claiming STRK on Starknet...';
            case 'forwarding': return 'Forwarding STRK to recipient...';
            default: return '';
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            {status === 'idle' && (
                <>
                    <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                        <ArrowPathIcon className="w-6 h-6 text-blue-400" />
                        <span>Redeem Ecash Token</span>
                    </h2>

                    <div className="mb-6">
                        <label className="block text-sm text-gray-300 mb-2">Ecash Token</label>
                        <textarea
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="cashuAeyJ0..."
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none font-mono text-sm resize-none"
                            rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">Paste your full ecash token here</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm text-gray-300 mb-2">Recipient Address</label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="0x1234567890abcdef..."
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Starknet address to receive STRK</p>
                    </div>

                    <button
                        onClick={handleRedeem}
                        disabled={!token.trim() || !recipient.trim()}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
                    >
                        {isConnected ? 'Redeem Token' : 'Connect Wallet'}
                    </button>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                            Your ecash token will be converted to Lightning BTC, then swapped to STRK and sent to the recipient address.
                        </p>
                    </div>
                </>
            )}

            {(status === 'validating' || status === 'creating_swap' || status === 'melting' || status === 'claiming' || status === 'forwarding') && (
                <div className="py-12">
                    <div className="text-center mb-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                        <p className="text-gray-300 font-semibold">{getStatusText()}</p>
                    </div>

                    <div className="max-w-md mx-auto">
                        <div className="mb-2 flex justify-between text-sm text-gray-400">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">This may take a few moments...</p>
                    </div>
                </div>
            )}

            {status === 'complete' && (
                <div>
                    <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        <span>Redemption Complete</span>
                    </h2>

                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-300 font-semibold mb-2">
                            Success!
                        </p>
                        <p className="text-sm text-green-300">
                            STRK has been sent to the recipient address.
                        </p>
                    </div>

                    {txHash && (
                        <div className="mb-6">
                            <label className="block text-sm text-gray-300 mb-2">Transaction Hash</label>
                            <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3">
                                <p className="text-white font-mono text-sm break-all">{txHash}</p>
                            </div>
                        </div>
                    )}

                    {changeToken && (
                        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-300 font-semibold mb-2">
                                Change Token Available
                            </p>
                            <p className="text-sm text-blue-300 mb-3">
                                Your redemption had leftover value. Here is your change token:
                            </p>
                            <textarea
                                readOnly
                                value={changeToken}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none"
                                rows={4}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(changeToken);
                                    showNotification('success', 'Copied', 'Change token copied to clipboard');
                                }}
                                className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition"
                            >
                                Copy Change Token
                            </button>
                        </div>
                    )}

                    <button
                        onClick={reset}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                    >
                        Redeem Another Token
                    </button>
                </div>
            )}

            {status === 'error' && error && (
                <div>
                    <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                        <span>Error</span>
                    </h2>

                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>

                    <button
                        onClick={reset}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
