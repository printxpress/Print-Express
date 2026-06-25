import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { shopSettings } = useAppContext();

    return (
        <footer className="mt-24 border-t border-slate-100 bg-slate-50/50 py-12">
            <div className="max-w-7xl mx-auto px-6 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Brand Section */}
                    <div className="text-center md:text-left space-y-2">
                        <p className="font-outfit font-black text-lg text-slate-800">{shopSettings?.name || 'Print Express'}</p>
                        <p className="text-xs text-text-muted">High Quality Printing & Instant Delivery across India 🇮🇳</p>
                    </div>

                    {/* Support Channels */}
                    <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-700">
                        <a 
                            href={`https://wa.me/${shopSettings?.whatsapp || '917603957422'}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-600 transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm"
                        >
                            <span className="text-sm">💬</span> WhatsApp Support
                        </a>
                        <a 
                            href={`tel:${shopSettings?.phone || shopSettings?.whatsapp || '917603957422'}`} 
                            className="hover:text-blue-600 transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm"
                        >
                            <span className="text-sm">📞</span> Call Support
                        </a>
                    </div>
                </div>

                <div className="border-t border-slate-100/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted">
                    <p>© {currentYear} {shopSettings?.name || 'Print Express'}. All rights reserved.</p>
                    <div className="flex gap-6 items-center">
                        <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
                        <NavLink to="/terms" className="hover:text-primary transition-colors">Terms of Service</NavLink>
                        <span className="text-slate-300">|</span>
                        <p className="font-semibold text-slate-600">🕒 Mon - Fri: 9 AM - 6 PM</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;