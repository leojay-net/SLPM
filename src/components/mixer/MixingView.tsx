import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export function MixingView({ progress, anonymitySet, eta }: { progress: number; anonymitySet: number; eta: number }) {
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8">
            <div className="text-center mb-8">
                <ArrowPathIcon className="w-14 h-14 text-orange-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Mixing in Progress</h2>
                <p className="text-gray-400">Your transaction is being mixed with {anonymitySet} participants</p>
            </div>
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-orange-500 h-3 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{anonymitySet}</div>
                    <div className="text-sm text-gray-400">Anonymity Set</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-orange-400">{eta}m</div>
                    <div className="text-sm text-gray-400">Est. Time</div>
                </div>
            </div>
        </div>
    );
}
