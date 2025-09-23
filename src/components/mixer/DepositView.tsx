import React from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';

export function DepositView({ amount }: { amount: string }) {
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
            <BanknotesIcon className="w-14 h-14 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Processing Deposit</h2>
            <p className="text-gray-400 mb-6">Preparing your {amount} STRK for mixing...</p>
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto" />
        </div>
    );
}
