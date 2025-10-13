'use client';

import React, { useMemo, useState } from 'react';
import {
    BanknotesIcon,
    ArrowPathIcon,
    EyeSlashIcon,
    WalletIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import WalletConnection from '../../components/WalletConnection';
import TransactionStatus from '../../components/TransactionStatus';
import Notification from '../../components/Notification';
import { Stepper } from '../../components/mixer/Stepper';
import { SetupForm } from '../../components/mixer/SetupForm';
import { DepositView } from '../../components/mixer/DepositView';
import { MixingView } from '../../components/mixer/MixingView';
import { CompleteView } from '../../components/mixer/CompleteView';
import { runMix } from '../../lib/orchestrator';
import { MixRequest, PrivacyLevel as PLevel } from '../../lib/types';
import { StarknetWalletManager, type WalletType } from '@/integrations/starknet/wallet';

type MixingStep = 'setup' | 'deposit' | 'mixing' | 'complete';

interface MixingSession {
    step: MixingStep;
    amount: string;
    privacyLevel: PLevel;
    progress: number;
    anonymitySetSize: number;
    estimatedTime: number;
}

export default function MixerPage() {
    // Wallet manager instance (memoized per page mount)
    const walletManager = useMemo(() => new StarknetWalletManager(), []);

    const [session, setSession] = useState<MixingSession>({
        step: 'setup',
        amount: '',
        privacyLevel: 'standard',
        progress: 0,
        anonymitySetSize: 0,
        estimatedTime: 0
    });

    const [isConnected, setIsConnected] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [notification, setNotification] = useState<{
        show: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
    }>({ show: false, type: 'info', title: '', message: '' });
    // Live transaction history (no recipient addresses stored)
    const [transactions, setTransactions] = useState<Array<{
        id: string;
        type: 'deposit' | 'mix' | 'withdraw';
        amount: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        timestamp: number;
        privacyScore: number;
        fromNetwork: string;
        toNetwork: string;
        anonymitySetSize?: number;
    }>>([]);

    const privacyLevels = {
        standard: {
            name: 'Standard Privacy',
            description: 'Basic privacy protection with 10+ participants',
            minParticipants: 10,
            estimatedTime: 5,
            fee: '0.1%'
        },
        enhanced: {
            name: 'Enhanced Privacy',
            description: 'Advanced mixing with 50+ participants',
            minParticipants: 50,
            estimatedTime: 15,
            fee: '0.2%'
        },
        maximum: {
            name: 'Maximum Privacy',
            description: 'Maximum anonymity with 100+ participants',
            minParticipants: 100,
            estimatedTime: 30,
            fee: '0.3%'
        }
    };

    const steps = [
        { id: 'setup', name: 'Setup', icon: WalletIcon },
        { id: 'deposit', name: 'Deposit', icon: BanknotesIcon },
        { id: 'mixing', name: 'Mixing', icon: ArrowPathIcon },
        { id: 'complete', name: 'Complete', icon: CheckCircleIcon }
    ];

    const [mixReq, setMixReq] = useState<MixRequest>({
        amountStrk: 0,
        destinations: [],
        privacyLevel: 'standard',
        enableTimeDelays: true,
        enableSplitOutputs: true,
        splitCount: 2,
        enableRandomizedMints: true,
        enableAmountObfuscation: true,
        enableDecoyTx: true,
    });

    const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setNotification({ show: true, type, title, message });
    };

    const handleWalletConnect = async (walletId: string) => {
        setIsConnecting(true);
        try {
            // Map UI id to WalletType used by the manager
            const mapId = (id: string): WalletType => {
                if (id.toLowerCase() === 'argentx') return 'argentX';
                if (id.toLowerCase() === 'braavos') return 'braavos';
                if (id.toLowerCase() === 'okx') return 'okx';
                return 'argentX';
            };

            await walletManager.connectWallet(mapId(walletId));
            setIsConnected(true);
            setShowWalletModal(false);
            showNotification('success', 'Wallet Connected', `Connected to ${walletId}`);
        } catch {
            showNotification('error', 'Connection Failed', 'Failed to connect wallet. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
            setSession(prev => ({ ...prev, amount: value }));
        }
    };

    const handlePrivacyLevelChange = (level: PLevel) => {
        const config = privacyLevels[level];
        setSession(prev => ({
            ...prev,
            privacyLevel: level,
            anonymitySetSize: config.minParticipants,
            estimatedTime: config.estimatedTime
        }));
    };

    const startMixing = async () => {
        if (!isConnected) {
            setShowWalletModal(true);
            return;
        }

        const amt = parseFloat(session.amount || '0');
        if (!amt || amt <= 0 || mixReq.destinations.length === 0 || !mixReq.destinations[0]) {
            showNotification('warning', 'Invalid Input', 'Enter amount and destination address');
            return;
        }

        setSession((p) => ({ ...p, step: 'deposit', progress: 0 }));
        showNotification('info', 'Starting Mix', 'Initializing mixing pipeline...');

        try {
            const txIdBase = Date.now().toString(36);
            // Either call the modular orchestrator directly (client-side) or via API route.
            // Using direct call to keep interactions smooth; switch to fetch('/api/mix') if you prefer server-side orchestration.
            await runMix(
                { ...mixReq, amountStrk: amt, privacyLevel: session.privacyLevel },
                (e) => {
                    // Update session progress/metrics
                    if (typeof e.progress === 'number') {
                        setSession((p) => ({
                            ...p,
                            step: p.step === 'deposit' && (e.progress as number) > 30 ? 'mixing' : p.step,
                            progress: (e.progress as number) ?? p.progress,
                        }));
                    }
                    if (typeof e.anonymitySetSize === 'number') {
                        setSession((p) => ({ ...p, anonymitySetSize: e.anonymitySetSize ?? p.anonymitySetSize }));
                    }
                    if (typeof e.estimatedTime === 'number') {
                        setSession((p) => ({ ...p, estimatedTime: e.estimatedTime ?? p.estimatedTime }));
                    }

                    // Maintain live, address-free transaction history
                    setTransactions((prev) => {
                        const next = [...prev];
                        const now = Date.now();
                        if (e.type === 'deposit:initiated') {
                            next.push({
                                id: `${txIdBase}-dep`,
                                type: 'deposit',
                                amount: String(amt),
                                status: 'pending',
                                timestamp: now,
                                privacyScore: 0,
                                fromNetwork: 'Starknet',
                                toNetwork: 'Lightning',
                            });
                        }
                        if (e.type === 'lightning:paid') {
                            const idx = next.findIndex(t => t.id === `${txIdBase}-dep`);
                            if (idx >= 0) next[idx] = { ...next[idx], status: 'completed' };
                        }
                        if (e.type === 'cashu:minted' && !next.some(t => t.id === `${txIdBase}-mix`)) {
                            next.push({
                                id: `${txIdBase}-mix`,
                                type: 'mix',
                                amount: String(amt),
                                status: 'processing',
                                timestamp: now,
                                privacyScore: 0,
                                fromNetwork: 'Lightning',
                                toNetwork: 'STRK',
                            });
                        }
                        if (e.type === 'mix:complete') {
                            const idx = next.findIndex(t => t.id === `${txIdBase}-mix`);
                            if (idx >= 0) next[idx] = {
                                ...next[idx],
                                status: 'completed',
                                privacyScore: e.privacyScore ?? next[idx].privacyScore,
                                anonymitySetSize: session.anonymitySetSize || next[idx].anonymitySetSize,
                            };
                        }
                        if (e.type === 'mix:error') {
                            const idxMix = next.findIndex(t => t.id === `${txIdBase}-mix`);
                            if (idxMix >= 0) next[idxMix] = { ...next[idxMix], status: 'failed' };
                        }
                        return next;
                    });

                    if (e.type === 'mix:complete') {
                        showNotification('success', 'Mix Complete', `Privacy score ${e.privacyScore}%`);
                        setSession((p) => ({ ...p, step: 'complete', progress: 100 }));
                    }
                    if (e.type === 'mix:error') {
                        showNotification('error', 'Mix Error', e.message || 'Unknown error');
                    }
                }
            );
        } catch {
            // error already notified
        }
    };

    const currentStepIndex = steps.findIndex(step => step.id === session.step);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Background Grid (no gradient) */}
            <div className="absolute inset-0 bg-gray-950">
                <div className="absolute inset-0" style={{
                    backgroundImage: "url('/patterns/grid.svg')",
                    backgroundSize: '40px 40px'
                }}></div>
            </div>
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-70 pointer-events-none"
                style={{
                    backgroundImage: "url('/patterns/grid.svg')",
                    backgroundSize: '32px 32px',
                    backgroundRepeat: 'repeat'
                }}
            />

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4 text-white">Privacy Mixer</h1>
                    <p className="text-gray-400 text-lg">
                        Enhanced privacy through advanced cryptographic mixing
                    </p>

                    {/* Wallet Status */}
                    <div className="mt-6">
                        {isConnected ? (
                            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                <span className="text-green-400 font-medium">Wallet Connected</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowWalletModal(true)}
                                className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/20 hover:border-orange-500 rounded-lg px-4 py-2 transition-colors"
                            >
                                <WalletIcon className="w-5 h-5 text-orange-400" />
                                <span className="text-orange-400 font-medium">Connect Wallet</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Mixer Interface */}
                    <div className="lg:col-span-2">
                        <Stepper current={session.step} />

                        {/* Main Content */}
                        <div>
                            {session.step === 'setup' && (
                                <SetupForm
                                    value={mixReq}
                                    onChange={(v) => {
                                        if (v.amountStrk != null) setSession((p) => ({ ...p, amount: String(v.amountStrk) }));
                                        if (v.privacyLevel) setSession((p) => ({ ...p, privacyLevel: v.privacyLevel as PLevel }));
                                        setMixReq((p) => ({ ...p, ...v }));
                                    }}
                                    onStart={startMixing}
                                    isConnected={isConnected}
                                />
                            )}

                            {session.step === 'deposit' && (
                                <DepositView amount={session.amount} />
                            )}

                            {session.step === 'mixing' && (
                                <MixingView progress={session.progress} anonymitySet={session.anonymitySetSize} eta={session.estimatedTime} />
                            )}

                            {session.step === 'complete' && (
                                <CompleteView amount={session.amount} anonymitySet={session.anonymitySetSize} onReset={() => setSession({ step: 'setup', amount: '', privacyLevel: 'standard', progress: 0, anonymitySetSize: 0, estimatedTime: 0 })} />
                            )}
                        </div>
                    </div>

                    {/* Transaction Status Sidebar */}
                    <div className="lg:col-span-1">
                        <TransactionStatus
                            transactions={transactions}
                            currentMixingSession={session.step === 'mixing' ? {
                                id: 'current',
                                phase: session.step,
                                progress: session.progress,
                                anonymitySetSize: session.anonymitySetSize,
                                estimatedTime: session.estimatedTime
                            } : undefined}
                        />
                    </div>
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
