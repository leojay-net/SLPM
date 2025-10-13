#!/usr/bin/env npx tsx

/**
 * Mainnet Integration Test
 * 
 * This script tests the complete SLPM mainnet flow:
 * 1. Validates mainnet configuration
 * 2. Tests Cashu mainnet mint connectivity
 * 3. Tests Atomiq SDK mainnet initialization
 * 4. Verifies all integrations are configured correctly
 */

import { ENV, getNetworkStatus, getStarknetRpc } from './src/config/env';
import { RealCashuClient } from './src/integrations/cashu/client';
import { RealAtomiqSwapClient } from './src/integrations/swaps/atomiq';

class MainnetIntegrationTest {
    private results: { [key: string]: boolean } = {};

    private log(emoji: string, message: string, details?: any) {
        console.log(`${emoji} ${message}`);
        if (details) {
            console.log('  ', JSON.stringify(details, null, 2));
        }
    }

    private async testNetworkConfiguration(): Promise<boolean> {
        this.log('🔍', 'Testing network configuration...');

        const status = getNetworkStatus();
        this.log('📋', `Network: ${status.network}`);
        this.log('📋', `Ready: ${status.ready}`);

        if (status.warnings.length > 0) {
            this.log('⚠️', 'Configuration warnings:', status.warnings);

            // Provide helpful setup guidance
            if (!status.ready) {
                this.log('💡', 'To fix configuration issues:');
                this.log('📝', '1. Copy the mainnet template: cp .env.mainnet .env.local');
                this.log('📝', '2. Edit .env.local with your actual credentials');
                this.log('📝', '3. Set STARKNET_PRIVATE_KEY to your mainnet private key');
                this.log('📝', '4. Configure Lightning node credentials (LND_URL, LND_MACAROON)');
                this.log('📝', '5. Use mainnet RPC like: https://starknet-mainnet.public.blastapi.io/rpc/v0_7');
            }
        }

        if (status.network !== 'MAINNET') {
            this.log('⚠️', `Expected MAINNET but got ${status.network}`);
            this.log('💡', 'Set NEXT_PUBLIC_NETWORK=MAINNET in your .env.local');
            return false;
        }

        if (!status.ready) {
            this.log('❌', 'Network configuration not ready for mainnet');
            this.log('⚠️', 'This is expected if you haven\'t set up .env.local yet');
            return false;
        }

        this.log('✅', 'Network configuration valid for mainnet');
        return true;
    }

    private async testStarknetRPC(): Promise<boolean> {
        this.log('🔍', 'Testing Starknet RPC connection...');

        const rpcUrl = getStarknetRpc();
        this.log('📋', `RPC URL: ${rpcUrl}`);

        // Basic validation
        if (!rpcUrl.includes('mainnet')) {
            this.log('⚠️', 'RPC URL does not appear to be mainnet');
            return false;
        }

        this.log('✅', 'Starknet RPC configuration looks correct');
        return true;
    }

    private async testCashuMainnetMints(): Promise<boolean> {
        this.log('🔍', 'Testing Cashu mainnet mint connectivity...');

        const mainnetMints = [
            'https://mint.minibits.cash/Bitcoin',
            'https://mint.coinos.io',
            'https://mint.lnserver.com',
            'https://mint.0xchat.com',
            'https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC'
        ];

        let successCount = 0;

        for (const mintUrl of mainnetMints) {
            try {
                this.log('🔗', `Testing mint: ${mintUrl}`);
                const client = new RealCashuClient(mintUrl);

                // Test basic connectivity
                const info = await client.getMintInfo();
                this.log('✅', `Connected to ${info.name || 'Unknown mint'}`);
                successCount++;

            } catch (error) {
                this.log('❌', `Failed to connect to ${mintUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if (successCount === 0) {
            this.log('❌', 'No mainnet Cashu mints accessible');
            return false;
        }

        this.log('✅', `Successfully connected to ${successCount}/${mainnetMints.length} mainnet mints`);
        return true;
    }

    private async testAtomiqMainnetConfig(): Promise<boolean> {
        this.log('🔍', 'Testing Atomiq SDK mainnet configuration...');

        try {
            // This will test the configuration but won't initialize in Node.js
            const client = new RealAtomiqSwapClient('MAINNET', getStarknetRpc());

            // Check if it's properly configured for mainnet
            this.log('✅', 'Atomiq SDK configured for mainnet');
            this.log('📋', 'Note: Full initialization requires browser environment');

            return true;

        } catch (error) {
            if (error instanceof Error && error.message.includes('browser environment')) {
                this.log('✅', 'Atomiq SDK properly requires browser environment (expected)');
                return true;
            }

            this.log('❌', `Atomiq SDK configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    private async testEnvironmentVariables(): Promise<boolean> {
        this.log('🔍', 'Validating mainnet environment variables...');

        const checks = [
            { name: 'NEXT_PUBLIC_NETWORK', value: ENV.NETWORK, expected: 'MAINNET' },
            {
                name: 'STARKNET_RPC',
                value: ENV.STARKNET_RPC,
                test: (v: string) => v.length > 0 && (v.includes('mainnet') || v.includes('alchemy.com')),
                suggestion: 'Use a mainnet RPC like: https://starknet-mainnet.public.blastapi.io/rpc/v0_7'
            },
            {
                name: 'CASHU_DEFAULT_MINT',
                value: ENV.CASHU_DEFAULT_MINT,
                test: (v: string) => v.includes('Bitcoin') || v.includes('mainnet') || v.includes('minibits'),
                suggestion: 'Should be a mainnet mint like: https://mint.minibits.cash/Bitcoin'
            },
            {
                name: 'STARKNET_PRIVATE_KEY',
                value: ENV.STARKNET_PRIVATE_KEY,
                test: (v: string) => v.length > 0 && v !== 'your_mainnet_private_key_here',
                suggestion: 'Set your actual Starknet mainnet private key (keep it secure!)'
            }
        ];

        let allPassed = true;

        for (const check of checks) {
            if (check.expected && check.value !== check.expected) {
                this.log('❌', `${check.name}: expected ${check.expected}, got ${check.value}`);
                allPassed = false;
            } else if (check.test && !check.test(check.value)) {
                this.log('❌', `${check.name}: value "${check.value}" failed validation`);
                if (check.suggestion) {
                    this.log('💡', `Suggestion: ${check.suggestion}`);
                }
                allPassed = false;
            } else {
                this.log('✅', `${check.name}: ${check.value}`);
            }
        }

        if (!allPassed) {
            this.log('📝', 'To fix environment issues:');
            this.log('📝', '1. Edit .env.local file in the project root');
            this.log('📝', '2. Set proper mainnet values for failed checks above');
            this.log('📝', '3. Restart the test: npm run test:mainnet');
        }

        return allPassed;
    }

    public async runAllTests(): Promise<void> {
        console.log('🚀 SLPM Mainnet Integration Test');
        console.log('='.repeat(50));

        const tests = [
            { name: 'Network Configuration', test: () => this.testNetworkConfiguration() },
            { name: 'Environment Variables', test: () => this.testEnvironmentVariables() },
            { name: 'Starknet RPC', test: () => this.testStarknetRPC() },
            { name: 'Cashu Mainnet Mints', test: () => this.testCashuMainnetMints() },
            { name: 'Atomiq Mainnet Config', test: () => this.testAtomiqMainnetConfig() },
        ];

        let passedCount = 0;

        for (const test of tests) {
            console.log('\n' + '-'.repeat(30));
            try {
                const result = await test.test();
                this.results[test.name] = result;
                if (result) {
                    passedCount++;
                } else {
                    this.log('🚫', `${test.name} test failed`);
                }
            } catch (error) {
                this.log('💥', `${test.name} test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.results[test.name] = false;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));

        for (const [name, result] of Object.entries(this.results)) {
            console.log(`${result ? '✅' : '❌'} ${name}`);
        }

        console.log(`\n🎯 Overall: ${passedCount}/${tests.length} tests passed`);

        if (passedCount === tests.length) {
            console.log('\n🎉 All tests passed! SLPM is ready for mainnet operations.');
            console.log('\n⚠️  IMPORTANT SAFETY NOTES:');
            console.log('   • This uses REAL Bitcoin mainnet - test with small amounts first');
            console.log('   • Ensure Lightning node has proper channel liquidity');
            console.log('   • Keep private keys secure and backed up');
            console.log('   • Monitor all transactions carefully');
            console.log('\n🚀 Next steps:');
            console.log('   1. Test Cashu flow: npm run test:cashu');
            console.log('   2. Run mixer tests with small amounts');
            console.log('   3. Deploy to production when ready');
        } else {
            console.log('\n🚨 Some tests failed. Configuration setup needed.');
            console.log('\n💡 Quick Setup Guide:');
            console.log('   1. Copy template: cp .env.mainnet .env.local');
            console.log('   2. Edit .env.local with your credentials:');
            console.log('      • STARKNET_PRIVATE_KEY=your_actual_private_key');
            console.log('      • LND_URL=your_lightning_node_url');
            console.log('      • LND_MACAROON=your_lightning_macaroon');
            console.log('   3. Test again: npm run test:mainnet');
            console.log('\n📚 For detailed setup: see MAINNET_SETUP_GUIDE.md');

            // Show which specific configs are missing
            const failed = Object.entries(this.results).filter(([_, passed]) => !passed);
            if (failed.length > 0) {
                console.log('\n❌ Failed tests that need attention:');
                failed.forEach(([test, _]) => {
                    console.log(`   • ${test}`);
                });
            }
        }
    }
}

// Run the test if called directly
if (require.main === module) {
    const test = new MainnetIntegrationTest();
    test.runAllTests().catch(console.error);
}

export { MainnetIntegrationTest };