import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export function CompleteView({ amount, anonymitySet, onReset }: { amount: string; anonymitySet: number; onReset: () => void }) {
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
            <CheckCircleIcon className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-green-400">Mix Complete</h2>
            <p className="text-gray-400 mb-6">Your {amount} STRK has been mixed with {anonymitySet} participants</p>
            <button onClick={onReset} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Start New Mix</button>
        </div>
    );
}
