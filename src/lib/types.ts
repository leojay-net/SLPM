export type MixingStep = 'setup' | 'deposit' | 'mixing' | 'complete';

export type PrivacyLevel = 'standard' | 'enhanced' | 'maximum';

export interface PrivacyConfig {
    name: string;
    description: string;
    minParticipants: number;
    estimatedTime: number; // minutes
    feeBps: number; // basis points e.g. 20 = 0.2%
}

export interface MixRequest {
    amountStrk: number;
    destinations: string[]; // destination STRK addresses
    privacyLevel: PrivacyLevel;
    // Day 6 options
    enableTimeDelays: boolean;
    enableSplitOutputs: boolean;
    splitCount: number; // number of outputs
    enableRandomizedMints: boolean;
    enableAmountObfuscation: boolean;
    enableDecoyTx: boolean;
}

export type OrchestratorEventType =
    | 'wallet:connected'
    | 'deposit:initiated'
    | 'deposit:confirmed'
    | 'lightning:invoice_created'
    | 'lightning:paid'
    | 'cashu:minted'
    | 'cashu:routed'
    | 'cashu:redeemed'
    | 'mix:progress'
    | 'mix:complete'
    | 'mix:error';

export interface OrchestratorEvent {
    type: OrchestratorEventType;
    message?: string;
    progress?: number; // 0-100
    anonymitySetSize?: number;
    estimatedTime?: number; // minutes
    privacyScore?: number; // 0-100
    details?: Record<string, unknown>;
}

export interface TransactionItem {
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
