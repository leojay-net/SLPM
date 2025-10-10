import React, { useMemo } from 'react';
import { EyeSlashIcon } from '@heroicons/react/24/outline';
import { MixRequest, PrivacyLevel, PrivacyConfig } from '../../lib/types';
import { useWallet } from '../../context/WalletContext';
import { createAtomiqStarknetSigner } from '../../integrations/starknet/wallet';

const PRIVACY_LEVELS: Record<PrivacyLevel, PrivacyConfig> = {
    standard: { name: 'Standard', description: '10+ participants', minParticipants: 10, estimatedTime: 5, feeBps: 10 },
    enhanced: { name: 'Enhanced', description: '50+ participants', minParticipants: 50, estimatedTime: 15, feeBps: 20 },
    maximum: { name: 'Maximum', description: '100+ participants', minParticipants: 100, estimatedTime: 30, feeBps: 30 },
};

export function SetupForm({
    value,
    onChange,
    onStart,
    isConnected,
}: {
    value: MixRequest;
    onChange: (v: Partial<MixRequest>) => void;
    onStart: () => void;
    isConnected: boolean;
}) {
    const { connection } = useWallet();
    const feePct = useMemo(() => PRIVACY_LEVELS[value.privacyLevel].feeBps / 100, [value.privacyLevel]);
    const valid = value.amountStrk > 0 && value.destinations.length > 0 && value.destinations.every((a) => a.length > 0);

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center space-x-3">
                <EyeSlashIcon className="w-6 h-6 text-blue-400" />
                <span>Configure Privacy Mix</span>
            </h2>

            {/* Amount */}
            <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">Amount (STRK)</label>
                <input
                    inputMode="decimal"
                    value={value.amountStrk || ''}
                    onChange={(e) => onChange({ amountStrk: Number(e.target.value || 0) })}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Min: 1 STRK • Max: 10,000 STRK</p>
            </div>

            {/* Destinations */}
            <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">Destination Addresses (comma-separated)</label>
                <input
                    value={value.destinations.join(',')}
                    onChange={(e) => onChange({ destinations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="0xabc...,0xdef..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Supports splitting across multiple destinations.</p>
            </div>

            {/* Privacy level */}
            <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">Privacy Level</label>
                <div className="grid sm:grid-cols-3 gap-3">
                    {(Object.keys(PRIVACY_LEVELS) as PrivacyLevel[]).map((level) => {
                        const cfg = PRIVACY_LEVELS[level];
                        const active = value.privacyLevel === level;
                        return (
                            <button
                                type="button"
                                key={level}
                                onClick={() => onChange({ privacyLevel: level })}
                                className={`p-4 border rounded-lg text-left ${active ? 'border-orange-500 bg-orange-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                            >
                                <div className="font-semibold">{cfg.name}</div>
                                <div className="text-sm text-gray-400">{cfg.description}</div>
                                <div className="mt-2 text-xs text-gray-500">Fee: {(cfg.feeBps / 100).toFixed(2)}% • Est: {cfg.estimatedTime}m</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day 6: Privacy enhancements */}
            <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">Advanced Privacy Options</label>
                <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 text-gray-300">
                        <input type="checkbox" checked={value.enableTimeDelays} onChange={(e) => onChange({ enableTimeDelays: e.target.checked })} />
                        Time delays & randomization
                    </label>
                    <label className="flex items-center gap-3 text-gray-300">
                        <input type="checkbox" checked={value.enableRandomizedMints} onChange={(e) => onChange({ enableRandomizedMints: e.target.checked })} />
                        Randomized Cashu mint hops
                    </label>
                    <label className="flex items-center gap-3 text-gray-300">
                        <input type="checkbox" checked={value.enableAmountObfuscation} onChange={(e) => onChange({ enableAmountObfuscation: e.target.checked })} />
                        Amount obfuscation
                    </label>
                    <label className="flex items-center gap-3 text-gray-300">
                        <input type="checkbox" checked={value.enableDecoyTx} onChange={(e) => onChange({ enableDecoyTx: e.target.checked })} />
                        Decoy transactions
                    </label>
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <label className="block text-sm text-gray-300">
                        Split outputs
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={value.splitCount}
                            onChange={(e) => onChange({ splitCount: Number(e.target.value) })}
                            className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                        />
                    </label>
                    <div className="text-sm text-gray-400 self-end">Fee estimate: {(feePct).toFixed(2)}%</div>
                </div>
            </div>

            {/* Test Lightning → STRK Swap Button */}
            {isConnected && (
                <div className="mb-4">
                    <button
                        onClick={async (event) => {
                            try {
                                const button = event?.target as HTMLButtonElement;
                                if (button) {
                                    button.disabled = true;
                                    button.textContent = '⏳ Creating Lightning Invoice...';
                                }

                                const { RealAtomiqSwapClient } = await import('../../integrations/swaps/atomiq');
                                const atomiq = new RealAtomiqSwapClient('TESTNET');

                                // Use first destination or a default test address
                                const testAddress = value.destinations[0] || '0x047bC9Ab67CF0203341C13Bc97DCb13E7Fa790Ae8fC405b19F5004b4089Fb6c8';

                                // Create a signer from the connected wallet
                                let walletSigner = null;
                                if (connection?.account) {
                                    walletSigner = await createAtomiqStarknetSigner(connection);
                                    console.log('🔐 Using SDK-compatible wallet signer');
                                }

                                // Request 20 STRK (matching the amount)
                                const result = await atomiq.swapLightningToStrkInteractive(20, testAddress, walletSigner);

                                if (result.success) {
                                    alert(`✅ Lightning → STRK swap successful!\n\nTransaction: ${result.txId}\nAmount: ${result.amount} STRK\nStatus: ${result.note || 'Completed'}`);
                                } else {
                                    alert(`❌ Lightning → STRK swap failed: ${result.error}`);
                                }
                            } catch (error) {
                                alert(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
                            } finally {
                                const button = event?.target as HTMLButtonElement;
                                if (button) {
                                    button.disabled = false;
                                    button.textContent = '🧪 Test Lightning → STRK (20 STRK)';
                                }
                            }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg mb-2 text-sm"
                    >
                        🧪 Test Lightning → STRK (20 STRK)
                    </button>
                </div>
            )}

            <button
                onClick={onStart}
                disabled={!valid}
                className={`w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg`}
            >
                {isConnected ? 'Start Privacy Mix' : 'Connect Wallet to Continue'}
            </button>
        </div>
    );
}
