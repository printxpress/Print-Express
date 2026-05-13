import React, { useState, useEffect } from 'react';

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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-fade-in-up">
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-gray-800">Coming Soon!</p>
          <p className="text-xs text-gray-600">Soon in Appstore and Playstore</p>
        </div>
        <div className="flex gap-2">
          {/* Apple Store Icon */}
          <div className="bg-black p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.96.95-2.44.8-3.41.04-1.53-1.19-1.93-1.19-3.43 0-.96.76-2.43.91-3.41-.04-4.88-4.81-4.01-12.01 1.63-12.01 1.44 0 2.37.89 3.25.89.87 0 1.95-.89 3.39-.89 1.44 0 2.76.71 3.49 1.83-3.14 1.83-2.61 6.32.48 7.56-.7 1.76-1.63 3.51-3 4.63zM12.03 7.25c-.02-2.23 1.83-4.08 4.06-4.1.06 2.34-2.04 4.31-4.06 4.1z" />
            </svg>
          </div>
          {/* Play Store Icon */}
          <div className="bg-black p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3.123c-.305.298-.5.722-.5 1.232v15.29c0 .51.195.934.5 1.232l9.04-8.877L5 3.123zm10.46 7.427l2.62-1.48c.67-.377.67-.993 0-1.37l-2.62-1.48-2.31 2.26 2.31 2.07zm-3.21-3.14L3.13 1.15c-.45-.25-.85-.14-1.07.28L12.25 7.41zm0 9.18l-9.13 8.26c.22.42.62.53 1.07.28l9.12-6.26-1.06-2.28z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppStoreAlert;
