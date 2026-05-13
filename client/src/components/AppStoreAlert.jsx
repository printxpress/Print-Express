import React, { useState, useEffect } from 'react';
import { assets } from '../assets/assets';

const AppStoreAlert = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show alert on mount
    setIsVisible(true);

    // Hide after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md animate-fade-in-up">
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-3xl shadow-2xl p-6 flex items-center justify-between gap-6">
        <div className="flex flex-col">
          <p className="text-lg font-bold text-gray-900 leading-tight">Coming Soon!</p>
          <p className="text-sm text-gray-600 mt-1">Soon in Appstore and Playstore</p>
        </div>
        <div className="flex-shrink-0">
          <img 
            src={assets.google_app_store} 
            alt="App Store and Play Store" 
            className="h-14 w-auto object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  );
};

export default AppStoreAlert;
