import React from 'react';
import { BanknotesIcon, CheckCircleIcon, ArrowPathIcon, WalletIcon } from '@heroicons/react/24/outline';
import { MixingStep } from '../../lib/types';

const icons = {
    setup: WalletIcon,
    deposit: BanknotesIcon,
    mixing: ArrowPathIcon,
    complete: CheckCircleIcon,
};

export function Stepper({ current }: { current: MixingStep }) {
    const steps: { id: MixingStep; name: string }[] = [
        { id: 'setup', name: 'Setup' },
        { id: 'deposit', name: 'Deposit' },
        { id: 'mixing', name: 'Mixing' },
        { id: 'complete', name: 'Complete' },
    ];
    const currentIndex = steps.findIndex((s) => s.id === current);
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {steps.map((s, idx) => {
                    const Icon = icons[s.id];
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                        <div key={s.id} className="flex flex-col items-center relative">
                            <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center mb-2 ${isActive ? 'border-orange-500 bg-orange-500/10' : 'border-gray-600 bg-gray-800'}`}>
                                <Icon className={`w-6 h-6 ${isActive ? 'text-orange-400' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-sm ${isCurrent ? 'text-orange-400' : isActive ? 'text-white' : 'text-gray-400'}`}>{s.name}</span>
                            {idx < steps.length - 1 && (
                                <div className={`absolute w-full h-0.5 top-6 left-11 ${idx < currentIndex ? 'bg-orange-500' : 'bg-gray-600'}`} style={{ width: 'calc(100% + 44px)' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
