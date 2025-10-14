'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ShieldCheckIcon, EyeSlashIcon, CurrencyDollarIcon, ClockIcon, ServerIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function Home() {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        setIsLoaded(true);
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const steps = [
        { title: 'STRK Deposit', icon: CurrencyDollarIcon, color: 'text-blue-400' },
        { title: 'Lightning Route', icon: ServerIcon, color: 'text-orange-400' },
        { title: 'Cashu Privacy', icon: EyeSlashIcon, color: 'text-purple-400' },
        { title: 'STRK Withdrawal', icon: ShieldCheckIcon, color: 'text-green-400' }
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
            {/* Animated background grid */}
            <div className="fixed inset-0 opacity-5">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "url('/patterns/grid.svg')",
                        backgroundSize: '50px 50px',
                        backgroundRepeat: 'repeat',
                        backgroundPosition: 'center'
                    }}
                ></div>
            </div>

            {/* Header */}
            <header className={`relative z-10 px-6 py-4 border-b border-gray-800 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <nav className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <CpuChipIcon className="w-5 h-5 text-gray-900" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">SLPM</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                        <a href="#privacy" className="text-gray-300 hover:text-white transition-colors">Privacy</a>
                        <button onClick={() => router.push('/docs')} className="text-gray-300 hover:text-white transition-colors">Docs</button>
                        <button onClick={() => router.push('/mixer')} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-medium transition-colors">
                            Launch App
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 px-6 py-20">
                <div className="max-w-7xl mx-auto">
                    <div className={`text-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            <span className="text-white">Starknet</span>{' '}
                            <span className="text-orange-500">Lightning</span>{' '}
                            <span className="text-blue-400">Privacy</span>{' '}
                            <span className="text-white">Mixer</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
                            Break on-chain linkability with military-grade privacy routing through Bitcoin Lightning Network and Cashu e-cash protocols
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => router.push('/mixer')}
                                className="group bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                            >
                                <span>Start Mixing</span>
                                <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => router.push('/docs')}
                                className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                            >
                                View Documentation
                            </button>
                        </div>
                    </div>

                    {/* Privacy Flow Visualization */}
                    <div className={`mt-20 transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Privacy Flow Architecture</h2>
                            <p className="text-gray-400">STRK → Lightning BTC → Cashu e-cash → Lightning BTC → STRK</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = activeStep === index;
                                return (
                                    <div
                                        key={index}
                                        className={`relative p-6 bg-gray-900 border rounded-lg transition-all duration-500 ${isActive ? 'border-orange-500 bg-gray-800 scale-105' : 'border-gray-700'
                                            }`}
                                    >
                                        <div className="text-center">
                                            <div className={`mx-auto w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-4 transition-all duration-300 ${isActive ? 'bg-orange-500' : ''
                                                }`}>
                                                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : step.color}`} />
                                            </div>
                                            <h3 className="font-semibold text-sm">{step.title}</h3>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-700">
                                                <div className={`h-full bg-orange-500 transition-all duration-500 ${activeStep > index ? 'w-full' : 'w-0'
                                                    }`}></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 px-6 py-20 bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Advanced Privacy Technology</h2>
                        <p className="text-xl text-gray-400">Military-grade privacy with zero compromises</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="group p-8 bg-gray-900 border border-gray-700 rounded-lg hover:border-orange-500 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
                                <EyeSlashIcon className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Unlinkable Transfers</h3>
                            <p className="text-gray-400">Zero on-chain correlation between source and destination accounts through advanced cryptographic protocols</p>
                        </div>

                        <div className="group p-8 bg-gray-900 border border-gray-700 rounded-lg hover:border-orange-500 transition-all duration-300">
                            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:bg-orange-500/30 transition-colors">
                                <ClockIcon className="w-6 h-6 text-orange-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Temporal Privacy</h3>
                            <p className="text-gray-400">Configurable time delays and randomization prevent timing correlation attacks</p>
                        </div>

                        <div className="group p-8 bg-gray-900 border border-gray-700 rounded-lg hover:border-orange-500 transition-all duration-300">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors">
                                <ShieldCheckIcon className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Non-Custodial</h3>
                            <p className="text-gray-400">Atomic operations ensure your funds are never at risk with automatic refund mechanisms</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 px-6 py-20">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div className="p-6">
                            <div className="text-4xl font-bold text-orange-500 mb-2">&lt;10min</div>
                            <div className="text-gray-400">Average Mix Time</div>
                        </div>
                        <div className="p-6">
                            <div className="text-4xl font-bold text-blue-400 mb-2">&lt;2%</div>
                            <div className="text-gray-400">Total Fees</div>
                        </div>
                        <div className="p-6">
                            <div className="text-4xl font-bold text-green-400 mb-2">99.9%</div>
                            <div className="text-gray-400">Success Rate</div>
                        </div>
                        <div className="p-6">
                            <div className="text-4xl font-bold text-purple-400 mb-2">24/7</div>
                            <div className="text-gray-400">Availability</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-3 mb-4 md:mb-0">
                            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                <CpuChipIcon className="w-5 h-5 text-gray-900" />
                            </div>
                            <span className="text-xl font-bold">SLPM</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                            Privacy-enhancing technology. Use responsibly.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
