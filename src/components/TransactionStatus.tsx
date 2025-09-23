import React from 'react';
import {
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    EyeSlashIcon,
    BanknotesIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Transaction {
    id: string;
    type: 'deposit' | 'mix' | 'withdraw';
    amount: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: number;
    privacyScore: number;
    fromNetwork: string;
    toNetwork: string;
    anonymitySetSize?: number;
}

interface TransactionStatusProps {
    transactions: Transaction[];
    currentMixingSession?: {
        id: string;
        phase: 'setup' | 'deposit' | 'mixing' | 'withdraw';
        progress: number;
        anonymitySetSize: number;
        estimatedTime: number;
    };
}

export default function TransactionStatus({ transactions, currentMixingSession }: TransactionStatusProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
            case 'failed':
                return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />;
            case 'processing':
                return <ArrowPathIcon className="w-5 h-5 text-orange-400 animate-spin" />;
            default:
                return <ClockIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-400';
            case 'failed':
                return 'text-red-400';
            case 'processing':
                return 'text-orange-400';
            default:
                return 'text-gray-400';
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const getPrivacyScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
                <EyeSlashIcon className="w-6 h-6 text-blue-400" />
                <span>Privacy Operations</span>
            </h2>

            {/* Current Mixing Session */}
            {currentMixingSession && (
                <div className="mb-8 p-6 bg-gray-900/60 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white flex items-center space-x-2">
                            <ArrowPathIcon className="w-5 h-5 text-orange-400 animate-spin" />
                            <span>Active Mixing Session</span>
                        </h3>
                        <div className="text-sm text-gray-400">
                            Phase: <span className="text-orange-400 capitalize">{currentMixingSession.phase}</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Progress</span>
                            <span>{currentMixingSession.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${currentMixingSession.progress}%` }}></div>
                        </div>
                    </div>

                    {/* Session Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Anonymity Set:</span>
                            <span className="text-white ml-2 font-medium">{currentMixingSession.anonymitySetSize}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Est. Time:</span>
                            <span className="text-white ml-2 font-medium">{currentMixingSession.estimatedTime}min</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div>
                <h3 className="font-semibold text-white mb-4">Recent Transactions</h3>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <BanknotesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No transactions yet</p>
                        <p className="text-sm mt-1">Start your first privacy mix to see transactions here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        {getStatusIcon(tx.status)}
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-white capitalize">{tx.type}</span>
                                                <span className="text-sm text-gray-400">•</span>
                                                <span className="text-sm text-white font-mono">{tx.amount} STRK</span>
                                            </div>
                                            <div className="text-sm text-gray-400 mt-1">
                                                {tx.fromNetwork} → {tx.toNetwork}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatTimestamp(tx.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-medium ${getStatusColor(tx.status)} capitalize`}>
                                            {tx.status}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Privacy Score: <span className={getPrivacyScoreColor(tx.privacyScore)}>{tx.privacyScore}%</span>
                                        </div>
                                        {tx.anonymitySetSize && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Anonymity Set: {tx.anonymitySetSize}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Privacy Metrics Summary */}
            {transactions.length > 0 && (
                <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <h4 className="font-medium text-white mb-3">Privacy Metrics</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">
                                {transactions.filter(tx => tx.status === 'completed').length}
                            </div>
                            <div className="text-gray-400">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                                {Math.round(transactions.reduce((acc, tx) => acc + tx.privacyScore, 0) / transactions.length)}%
                            </div>
                            <div className="text-gray-400">Avg Privacy</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-400">
                                {transactions.reduce((acc, tx) => acc + parseFloat(tx.amount), 0).toFixed(2)}
                            </div>
                            <div className="text-gray-400">Total STRK</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
