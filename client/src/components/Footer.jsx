import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { shopSettings } = useAppContext();

    return (
        <footer className="mt-24 py-8 border-t border-blue-100 bg-white">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted">
                <p>© {currentYear} Print Express. All India Printing & Delivery Service. 🇮🇳</p>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
                    <p className="font-bold text-blue-700">🕒 Working Hours: 9 AM - 6 PM, Monday to Friday</p>
                    <div className="flex gap-8">
                        <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
                        <NavLink to="/terms" className="hover:text-primary transition-colors">Terms of Service</NavLink>
                        <a href={`https://wa.me/${shopSettings?.whatsapp || '917603957422'}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                            <span className="text-sm">💬</span> WhatsApp: +{shopSettings?.whatsapp || '917603957422'}
                        </a>
                        <a href="mailto:support@printexpress.in" className="hover:text-primary transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;