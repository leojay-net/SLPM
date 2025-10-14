'use client';

import React, { useState } from 'react';
import {
    BanknotesIcon,
    DocumentDuplicateIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { issueCashuToken } from '@/orchestrator/steps/issueCashu';
import type { OrchestratorEvent } from '@/lib/types';

type IssueStatus = 'idle' | 'depositing' | 'withdrawing' | 'estimating' | 'creating_invoice' | 'swapping' | 'minting' | 'complete' | 'error';

interface IssueTokenTabProps {
    isConnected: boolean;
    onConnectWallet: () => void;
    showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export function IssueTokenTab({ isConnected, onConnectWallet, showNotification }: IssueTokenTabProps) {
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<IssueStatus>('idle');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [currentMessage, setCurrentMessage] = useState('');
    const [satsValue, setSatsValue] = useState(0);

    const handleIssue = async () => {
        if (!isConnected) {
            onConnectWallet();
            return;
        }

        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            showNotification('error', 'Invalid Amount', 'Please enter a valid amount');
            return;
        }

        setStatus('depositing');
        setError('');
        setProgress(0);

        try {
            const result = await issueCashuToken(amt, (event: OrchestratorEvent) => {
                console.log('Issue event:', event);

                if (event.progress !== undefined) {
                    setProgress(event.progress);
                }

                if (event.message) {
                    setCurrentMessage(event.message);
                }

                // Update status based on event type
                if (event.type === 'issue:progress') {
                    if (event.message?.includes('Deposit')) {
                        setStatus('depositing');
                    } else if (event.message?.includes('Withdraw')) {
                        setStatus('withdrawing');
                    } else if (event.message?.includes('Estimat')) {
                        setStatus('estimating');
                    } else if (event.message?.includes('invoice')) {
                        setStatus('creating_invoice');
                    } else if (event.message?.includes('Swap')) {
                        setStatus('swapping');
                    } else if (event.message?.includes('Claim') || event.message?.includes('token')) {
                        setStatus('minting');
                    }
                } else if (event.type === 'issue:complete') {
                    setStatus('complete');
                } else if (event.type === 'issue:error') {
                    setStatus('error');
                    setError(event.message || 'Unknown error');
                }
            });

            setToken(result.token);
            setSatsValue(result.satsValue);
            setStatus('complete');
            showNotification('success', 'Token Issued', `Your ${result.satsValue} sats ecash token is ready`);

        } catch (err) {
            setStatus('error');
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            showNotification('error', 'Issue Failed', errorMsg);
        }
    };

    const copyToken = () => {
        navigator.clipboard.writeText(token);
        showNotification('success', 'Copied', 'Token copied to clipboard');
    };

    const downloadToken = () => {
        const blob = new Blob([token], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashu-token-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'Downloaded', 'Token saved to file');
    };

    const reset = () => {
        setStatus('idle');
        setAmount('');
        setToken('');
        setError('');
        setProgress(0);
        setCurrentMessage('');
        setSatsValue(0);
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'depositing':
                return 'Depositing STRK to privacy mixer...';
            case 'withdrawing':
                return 'Withdrawing from mixer...';
            case 'estimating':
                return 'Estimating conversion rate...';
            case 'creating_invoice':
                return 'Creating Cashu mint invoice...';
            case 'swapping':
                return 'Swapping STRK to Lightning...';
            case 'minting':
                return 'Claiming Cashu token...';
            default:
                return currentMessage || 'Processing...';
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            {status === 'idle' && (
                <>
                    <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                        <BanknotesIcon className="w-6 h-6 text-blue-400" />
                        <span>Issue Ecash Token</span>
                    </h2>

                    <div className="mb-6">
                        <label className="block text-sm text-gray-300 mb-2">Amount (STRK)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum: 1.0 STRK</p>
                    </div>

                    <button
                        onClick={handleIssue}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
                    >
                        {isConnected ? 'Issue Token' : 'Connect Wallet'}
                    </button>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                            This creates a Cashu ecash token that you can store securely and redeem later for STRK.
                            The flow: Deposit → Withdraw → Swap to Lightning → Mint ecash token.
                        </p>
                    </div>
                </>
            )}

            {(status === 'depositing' || status === 'withdrawing' || status === 'estimating' ||
                status === 'creating_invoice' || status === 'swapping' || status === 'minting') && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                        <p className="text-gray-300 mb-2">{getStatusMessage()}</p>
                        {progress > 0 && (
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                                <div
                                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 mt-2">{progress}%</p>
                    </div>
                )}

            {status === 'complete' && token && (
                <div>
                    <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        <span>Token Issued Successfully</span>
                    </h2>

                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-300 font-semibold mb-2">
                            IMPORTANT: Store this token securely!
                        </p>
                        <p className="text-sm text-green-300 mb-2">
                            This token represents real value ({satsValue} sats ≈ {amount} STRK) and can be redeemed for STRK. Anyone with this token can redeem it.
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-2">Ecash Token</label>
                        <textarea
                            readOnly
                            value={token}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none"
                            rows={6}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={copyToken}
                            className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition"
                        >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                            <span>Copy Token</span>
                        </button>
                        <button
                            onClick={downloadToken}
                            className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold transition"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Download</span>
                        </button>
                    </div>

                    <button
                        onClick={reset}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                    >
                        Issue Another Token
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
