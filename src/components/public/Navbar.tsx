'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
    transparent?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ transparent = false }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navLinks = [
        { name: 'About', href: '/about' },
        { name: 'Features', href: '/#features' },
        { name: 'Pricing', href: '/#pricing' },
        { name: 'Developers', href: '/#developers' },
        { name: 'Contact', href: '/contact' },
    ];

    const isTransparent = transparent && !isScrolled;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isTransparent ? 'bg-transparent py-5' : 'bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-100 py-3'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img src="/logo.png" alt="VTStack Logo" className="h-14 w-auto" />
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            link.href.startsWith('/#') ? (
                                <a 
                                    key={link.name} 
                                    href={link.href} 
                                    className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                                >
                                    {link.name}
                                </a>
                            ) : (
                                <Link 
                                    key={link.name} 
                                    href={link.href} 
                                    className={`text-sm font-bold ${pathname === link.href ? 'text-primary-600' : 'text-gray-600'} hover:text-primary-600 transition-colors`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-bold text-gray-700 hover:text-primary-600 transition-colors">
                            Log in
                        </Link>
                        <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-bold rounded-full shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
                            Get Started <ArrowRight size={16} />
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="md:hidden p-2 text-gray-600 hover:text-primary-600 transition-colors" onClick={toggleMenu} aria-label="Toggle menu">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            link.href.startsWith('/#') ? (
                                <a 
                                    key={link.name} 
                                    href={link.href} 
                                    className="text-base font-medium text-gray-600 hover:text-primary-600 py-2" 
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.name}
                                </a>
                            ) : (
                                <Link 
                                    key={link.name} 
                                    href={link.href} 
                                    className={`text-base font-bold ${pathname === link.href ? 'text-primary-600' : 'text-gray-600'} hover:text-primary-600 py-2`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}
                        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                            <Link 
                                href="/login" 
                                className="w-full py-2.5 text-center text-sm font-bold text-gray-700 hover:text-primary-600 border border-gray-200 rounded-xl"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Log in
                            </Link>
                            <Link 
                                href="/register" 
                                className="w-full py-2.5 text-center bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/30"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};
