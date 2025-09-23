'use client';

"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
    HomeIcon,
    EyeSlashIcon,
    ChartBarIcon,
    DocumentTextIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { href: '/', label: 'Home', icon: HomeIcon },
        { href: '/mixer', label: 'Mixer', icon: EyeSlashIcon },
        { href: '/analytics', label: 'Analytics', icon: ChartBarIcon },
        { href: '/docs', label: 'Docs', icon: DocumentTextIcon }
    ];

    return (
        <nav className="bg-gray-900 border-b border-gray-700">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <EyeSlashIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">SLPM</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center space-x-2 text-gray-300 hover:text-orange-400 transition-colors"
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-gray-300 hover:text-white"
                    >
                        {isOpen ? (
                            <XMarkIcon className="w-6 h-6" />
                        ) : (
                            <Bars3Icon className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isOpen && (
                    <div className="md:hidden border-t border-gray-700 py-4">
                        <div className="flex flex-col space-y-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center space-x-3 text-gray-300 hover:text-orange-400 transition-colors"
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
