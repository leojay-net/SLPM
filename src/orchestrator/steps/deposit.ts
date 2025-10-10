import { OrchestratorEvent } from '@/lib/types';
import { RealStarknetWalletClient } from '@/integrations/starknet/wallet';
import { ENV } from '@/config/env';
import { PRIVACY_MIXER } from '@/config/constants';
import { randomHex } from '@/crypto/bdhke';
import { num } from 'starknet';
import { generateCommitmentArtifacts, generateSecret } from '@/utils/zk';

// Starknet addresses (testnet)
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'; // STRK on Sepolia
const MIXER_CONTRACT_ADDRESS = PRIVACY_MIXER.CONTRACT_ADDRESS; // Use deployed contract address

export async function stepDeposit(amountStrk: number, onEvent: (e: OrchestratorEvent) => void) {
    console.log('💰 SLPM Deposit: Starting deposit step');
    console.log('💰 SLPM Deposit: Amount requested:', amountStrk, 'STRK');

    try {
        // Fast sanity check: current deployed contract min deposit is 1 STRK (1e18 wei)
        // (See PRIVACY_MIXER.DEPLOYMENT_PARAMS.MIN_DEPOSIT). If user enters < 1 it will revert
        // on-chain with a generic Execute failed (assert Amount below minimum) which is hard
        // to decode client-side right now.
        const configuredMinDepositWei = PRIVACY_MIXER.DEPLOYMENT_PARAMS.MIN_DEPOSIT; // bigint (wei)
        const configuredMinDepositStrk = Number(configuredMinDepositWei) / 1e18; // for log (only safe here since value is small: 1e18)
        if (amountStrk < configuredMinDepositStrk) {
            const friendlyMsg = `Requested amount ${amountStrk} STRK is below current minimum deposit (${configuredMinDepositStrk} STRK). Increase amount or redeploy with lower MIN_DEPOSIT.`;
            console.warn('⚠️ SLPM Deposit: Early rejection -', friendlyMsg);
            onEvent({ type: 'deposit:error', message: friendlyMsg });
            throw new Error(friendlyMsg);
        }

        onEvent({ type: 'deposit:initiated', message: 'Connecting to Starknet wallet...' });
        console.log('💰 SLPM Deposit: Initializing wallet client...');

        // Initialize Starknet wallet client
        const walletClient = new RealStarknetWalletClient(ENV.STARKNET_RPC);

        // Connect to wallet (ArgentX/Braavos)
        console.log('💰 SLPM Deposit: Connecting wallet...');
        const connection = await walletClient.connect();
        console.log('💰 SLPM Deposit: Wallet connected:', {
            address: connection.account.address,
            walletType: connection.walletType
        });

        onEvent({ type: 'deposit:wallet_connected', message: 'Wallet connected successfully' });

        // Initialize mixer contract
        console.log('💰 SLPM Deposit: Initializing privacy mixer contract...');
        await walletClient.initMixerContract(MIXER_CONTRACT_ADDRESS);
        console.log('💰 SLPM Deposit: Mixer contract initialized');

        // Check STRK balance
        console.log('💰 SLPM Deposit: Checking STRK balance...');
        const balance = await walletClient.getBalance(STRK_TOKEN_ADDRESS);
        // Use decimal math carefully – avoid floating point drift by converting string
        const scaled = BigInt(Math.round(Number(amountStrk) * 10 ** balance.decimals));
        const amountWei = scaled;

        // Validate amount doesn't exceed felt limit (2^251 - 1)
        const FELT_MAX = BigInt('0x800000000000011000000000000000000000000000000000000000000000000') - BigInt(1);
        if (amountWei > FELT_MAX) {
            throw new Error(`Amount too large for Starknet felt: ${amountWei.toString()}`);
        }

        console.log('💰 SLPM Deposit: Balance check:', {
            tokenAddress: STRK_TOKEN_ADDRESS,
            symbol: balance.symbol,
            onChainBalanceWei: balance.balance.toString(),
            onChainBalanceSTRK: Number(balance.balance) / Math.pow(10, balance.decimals),
            decimals: balance.decimals,
            requestedAmountWei: amountWei.toString(),
            requestedAmountSTRK: amountStrk,
            requestedAmountHex: '0x' + amountWei.toString(16),
            minDepositWei: configuredMinDepositWei.toString(),
            minDepositSTRK: configuredMinDepositStrk
        });

        if (balance.balance < amountWei) {
            throw new Error(`Insufficient STRK balance. Required: ${amountStrk} STRK, Available: ${Number(balance.balance) / Math.pow(10, balance.decimals)} STRK`);
        }

        onEvent({ type: 'deposit:balance_checked', message: `Balance confirmed: ${Number(balance.balance) / Math.pow(10, balance.decimals)} STRK available` });

        // Generate correct commitment/nullifier per contract spec
        console.log('💰 SLPM Deposit: Generating commitment & nullifier (contract spec)...');
        const secretHex = generateSecret();
        const amountBigInt = BigInt(amountWei.toString());
        const artifacts = generateCommitmentArtifacts(secretHex, amountBigInt);
        console.log('💰 SLPM Deposit: Generated artifacts:', {
            secret: artifacts.secret.slice(0, 10) + '...',
            commitment: artifacts.commitment,
            nullifier: artifacts.nullifier.slice(0, 10) + '...'
        });

        onEvent({ type: 'deposit:balance_checked', message: 'Privacy commitment generated' });

        // First approve STRK spending by mixer contract
        console.log('💰 SLPM Deposit: Approving STRK spending by mixer contract...');
        const approvalResult = await walletClient.approve(STRK_TOKEN_ADDRESS, MIXER_CONTRACT_ADDRESS, amountWei);
        console.log('💰 SLPM Deposit: Approval transaction submitted:', approvalResult);

        onEvent({ type: 'deposit:transfer_submitted', message: `Approval submitted: ${approvalResult.transactionHash}` });

        // Wait for approval confirmation
        console.log('💰 SLPM Deposit: Waiting for approval confirmation...');
        const confirmedApproval = await walletClient.waitForTransaction(approvalResult.transactionHash);
        console.log('💰 SLPM Deposit: Approval confirmed:', confirmedApproval);

        if (confirmedApproval.status === 'REJECTED') {
            throw new Error('Approval transaction was rejected by the network');
        }

        onEvent({ type: 'deposit:balance_checked', message: 'STRK spending approval confirmed' });

        // Verify allowance was set correctly before attempting deposit
        console.log('💰 SLPM Deposit: Verifying allowance was set correctly...');
        try {
            const allowanceResult = await walletClient.callContract(
                STRK_TOKEN_ADDRESS,
                'allowance',
                [connection.account.address, MIXER_CONTRACT_ADDRESS]
            );
            const currentAllowance = BigInt(allowanceResult[0] || 0);
            console.log('💰 SLPM Deposit: Current allowance:', {
                allowanceWei: currentAllowance.toString(),
                allowanceSTRK: Number(currentAllowance) / Math.pow(10, balance.decimals),
                requiredWei: amountWei.toString(),
                requiredSTRK: amountStrk,
                sufficient: currentAllowance >= amountWei
            });

            if (currentAllowance < amountWei) {
                throw new Error(`Insufficient allowance: ${Number(currentAllowance) / Math.pow(10, balance.decimals)} STRK allowed, ${amountStrk} STRK required`);
            }

            onEvent({ type: 'deposit:balance_checked', message: `Allowance verified: ${Number(currentAllowance) / Math.pow(10, balance.decimals)} STRK` });
        } catch (allowanceError) {
            console.error('💰 SLPM Deposit: Allowance check failed:', allowanceError);
            // Continue anyway - some tokens might not support allowance query
            onEvent({ type: 'deposit:balance_checked', message: 'Allowance check failed, proceeding with deposit...' });
        }

        // Now deposit to mixer contract with commitment
        console.log('💰 SLPM Deposit: Depositing to privacy mixer contract...');
        const depositTxHash = await walletClient.depositToMixer(artifacts.commitment, amountWei);
        console.log('💰 SLPM Deposit: Deposit transaction submitted:', depositTxHash); onEvent({ type: 'deposit:transfer_submitted', message: `Deposit to mixer submitted: ${depositTxHash}` });

        // Wait for deposit confirmation
        console.log('💰 SLPM Deposit: Waiting for deposit confirmation...');
        const confirmedTx = await walletClient.waitForTransaction(depositTxHash);
        console.log('💰 SLPM Deposit: Deposit confirmed:', confirmedTx);

        if (confirmedTx.status === 'REJECTED') {
            throw new Error('Deposit transaction was rejected by the network');
        }

        onEvent({ type: 'deposit:confirmed', message: 'STRK deposit confirmed in privacy mixer', progress: 20 });
        console.log('💰 SLPM Deposit: Step completed successfully');

        console.log('🔄 SLPM Deposit: Now preparing for immediate withdrawal to enable swapping...');

        // For privacy mixing, we need to immediately withdraw the funds to a temporary address
        // that the orchestrator controls, so it can proceed with the Lightning/Cashu mixing
        onEvent({ type: 'deposit:preparing_withdrawal', message: 'Preparing privacy withdrawal for mixing...', progress: 22 });

        // Convert BigInt to hex string for Cairo felt252 compatibility
        const commitmentHashHex = artifacts.commitment;

        return {
            transactionHash: confirmedTx.transactionHash,
            amount: amountStrk,
            amountWei: amountWei.toString(),
            walletAddress: connection.account.address,
            commitmentHash: commitmentHashHex,
            secret: artifacts.secret,
            nullifier: artifacts.nullifier,
            mixerContractAddress: MIXER_CONTRACT_ADDRESS,
            // Add withdrawal credentials for immediate processing
            withdrawalReady: true
        };

    } catch (error) {
        // Attempt to refine common failure causes
        let refined = error instanceof Error ? error.message : 'Unknown deposit error';
        if (/Execute failed/i.test(refined)) {
            refined = refined + ' (Possible causes: amount below MIN_DEPOSIT, insufficient allowance, or token transfer_from failure)';
        }
        console.error('❌ SLPM Deposit: Step failed:', error);
        onEvent({ type: 'deposit:error', message: refined });
        throw new Error(refined);
    }
}
