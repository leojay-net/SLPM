import { OrchestratorEvent } from '@/lib/types';
import { RealStarknetWalletClient } from '@/integrations/starknet/wallet';
import { ENV } from '@/config/env';
import { PRIVACY_MIXER, SHARED_SWAP_ACCOUNT_ADDRESS } from '@/config/constants';
import { hash, uint256, num } from 'starknet';
import { getSharedSwapAccount, getSharedSwapProvider, getSharedSwapAccountRaw } from '@/integrations/starknet/sharedAccount';
import { PrivacyMixerContract } from '@/integrations/starknet/privacy-mixer-contract';

export async function stepWithdrawForMixing(
    depositResult: {
        commitmentHash: string;
        secret: string;
        nullifier: string;
        amount: number;
        amountWei: string;
        mixerContractAddress: string;
        walletAddress: string;
    },
    onEvent: (e: OrchestratorEvent) => void
) {
    console.log('🔄 SLPM Withdraw: Starting immediate withdrawal for mixing pipeline');
    console.log('🔄 SLPM Withdraw: Parameters:', {
        commitment: depositResult.commitmentHash.slice(0, 10) + '...',
        amount: depositResult.amount,
        nullifier: depositResult.nullifier.slice(0, 10) + '...'
    });

    try {
        onEvent({
            type: 'deposit:preparing_withdrawal',
            message: 'Preparing withdrawal for privacy mixing...',
            progress: 25
        });

        // Prefer headless shared account if configured (avoids UI popups)
        const sharedSigner = getSharedSwapAccount();
        const sharedAccount = getSharedSwapAccountRaw();
        let walletClient: RealStarknetWalletClient | null = null;
        let directMixerContract: PrivacyMixerContract | null = null;

        if (sharedSigner && sharedAccount) {
            console.log('🔄 SLPM Withdraw: Using shared swap account for headless withdrawal');
            // Directly construct mixer contract wrapper with shared account
            const provider = getSharedSwapProvider();
            if (!provider) {
                throw new Error('Shared swap provider not initialized');
            }
            directMixerContract = new PrivacyMixerContract(
                depositResult.mixerContractAddress,
                sharedAccount,
                provider
            );
        } else {
            console.log('🔄 SLPM Withdraw: Shared account not configured, falling back to interactive wallet connection');
            walletClient = new RealStarknetWalletClient(ENV.STARKNET_RPC);
            await walletClient.connect();
            await walletClient.initMixerContract(depositResult.mixerContractAddress);
        }

        // Create a temporary hot wallet address for the orchestrator to control the funds
        // In production, this would be a dedicated orchestrator wallet
        // For now, we'll withdraw to the same user wallet but this enables the next steps
        const recipientAddress = SHARED_SWAP_ACCOUNT_ADDRESS; // central swap account (prototype)

        console.log('🔄 SLPM Withdraw: Preparing withdrawal transaction...');
        console.log('🔄 SLPM Withdraw: Withdrawal details (shared swap account):', {
            nullifier: depositResult.nullifier.slice(0, 10) + '...',
            commitment: depositResult.commitmentHash.slice(0, 10) + '...',
            recipient: recipientAddress.slice(0, 10) + '...',
            amount: depositResult.amountWei
        });

        // Generate ZK proof (same 3-element format as main withdraw step & e2e test)
        console.log('🔄 SLPM Withdraw: Generating withdrawal proof (3-element format)...');

        const amountBigInt = BigInt(depositResult.amountWei);
        const recipientBigInt = BigInt(recipientAddress);

        const amountUint256 = uint256.bnToUint256(amountBigInt);
        const amountLow = BigInt(amountUint256.low);
        const amountHigh = BigInt(amountUint256.high);

        const recipientHash = hash.computePoseidonHashOnElements([recipientBigInt]);
        const amountHash = hash.computePoseidonHashOnElements([amountLow, amountHigh]);

        const proof: string[] = [
            depositResult.secret,             // secret
            num.toHex(recipientHash),          // recipient_hash
            num.toHex(amountHash)              // amount_hash
        ];

        if (proof.length !== 3) {
            throw new Error(`Generated proof length mismatch: expected 3, got ${proof.length}`);
        }

        console.log('🔄 SLPM Withdraw: Proof generated:', {
            proofLength: proof.length,
            elements: proof.map(p => p.slice(0, 10) + '...')
        });

        onEvent({
            type: 'deposit:preparing_withdrawal',
            message: 'Checking minimum mixing delay...',
            progress: 25
        });

        // Check if enough time has passed since deposit for privacy requirements
        // The NEW contract enforces a 4-second delay between deposit and withdrawal for testing
        const MINIMUM_DELAY_SECONDS = 4; // 4 seconds as per new test contract deployment

        console.log('🕐 SLPM Withdraw: Checking timing requirements...');
        console.log('🕐 SLPM Withdraw: Contract requires 4 second delay between deposit and withdrawal');

        // Wait the required delay to satisfy contract requirements
        console.log('⏳ SLPM Withdraw: Waiting 4 seconds for mixing delay...');
        await new Promise(resolve => setTimeout(resolve, MINIMUM_DELAY_SECONDS * 1000));

        console.log('✅ SLPM Withdraw: Minimum delay satisfied, proceeding with withdrawal');

        onEvent({
            type: 'deposit:preparing_withdrawal',
            message: 'Submitting withdrawal transaction...',
            progress: 30
        });

        // Execute withdrawal from privacy mixer
        console.log('🔄 SLPM Withdraw: Executing withdrawal from privacy mixer...');
        let withdrawalResult: string;
        if (directMixerContract) {
            const tx = await directMixerContract.withdraw(
                depositResult.nullifier,
                depositResult.commitmentHash,
                recipientAddress,
                amountBigInt,
                proof
            );
            withdrawalResult = tx.transaction_hash;
        } else if (walletClient) {
            withdrawalResult = await walletClient.withdrawFromMixer(
                depositResult.nullifier,
                depositResult.commitmentHash,
                recipientAddress,
                amountBigInt,
                proof
            );
        } else {
            throw new Error('No withdrawal pathway available');
        }

        console.log('🔄 SLPM Withdraw: Withdrawal transaction submitted:', withdrawalResult);

        onEvent({
            type: 'deposit:withdrawn_for_mixing',
            message: `Withdrawal submitted: ${withdrawalResult}`,
            progress: 35
        });

        // Wait for withdrawal confirmation
        console.log('🔄 SLPM Withdraw: Waiting for withdrawal confirmation...');
        let confirmedWithdrawal: any;
        if (walletClient) {
            confirmedWithdrawal = await walletClient.waitForTransaction(withdrawalResult);
        } else {
            // Poll provider via shared account
            const provider = getSharedSwapProvider();
            if (!provider) {
                throw new Error('Shared swap provider not available for confirmation');
            }
            confirmedWithdrawal = await provider.waitForTransaction(withdrawalResult);
        }
        console.log('🔄 SLPM Withdraw: Withdrawal confirmed:', confirmedWithdrawal);

        if (confirmedWithdrawal.status === 'REJECTED') {
            throw new Error('Withdrawal transaction was rejected by the network');
        }

        onEvent({
            type: 'deposit:withdrawn_for_mixing',
            message: 'STRK successfully withdrawn from privacy mixer for mixing pipeline',
            progress: 40
        });

        console.log('🔄 SLPM Withdraw: Step completed successfully');
        console.log('🔄 SLPM Withdraw: Funds are now available for Lightning/Cashu mixing');

        const txHash = (confirmedWithdrawal as any).transactionHash || (confirmedWithdrawal as any).transaction_hash || withdrawalResult;
        console.log('🔄 SLPM Withdraw: Determined withdrawal tx hash:', txHash);
        return {
            withdrawalTxHash: txHash,
            availableForSwap: true,
            controllingWallet: recipientAddress,
            amount: depositResult.amount,
            amountWei: depositResult.amountWei,
            originalDeposit: depositResult
        };

    } catch (error) {
        console.error('❌ SLPM Withdraw: Step failed:', error);
        onEvent({
            type: 'deposit:error',
            message: error instanceof Error ? error.message : 'Unknown withdrawal error'
        });
        throw error;
    }
}
