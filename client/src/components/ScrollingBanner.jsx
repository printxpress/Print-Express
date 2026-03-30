import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';

const ScrollingBanner = () => {
    const { axios, navigate } = useAppContext();
    const [banners, setBanners] = useState([]);

    // Local banners provided by the user
    const localBanners = [
        { image: assets.Banners5, title: "" },
        { image: assets.Banners1, title: "" },
        { image: assets.Banners2, title: "" },
        { image: assets.Banners3, title: "" },
        { image: assets.Banners4, title: "" },
    ];

    const fetchBanners = async () => {
        try {
            const { data } = await axios.get('/api/banner');
            if (data.success && data.banners.length > 0) {
                // If backend banners exist, we can combine them or prioritize
                const activeBanners = data.banners.filter(b => b.isActive);
                setBanners([...localBanners, ...activeBanners]);
            } else {
                setBanners(localBanners);
            }
        } catch (error) {
            console.error(error);
            setBanners(localBanners);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    if (banners.length === 0) return null;

    return (
        <div className="w-full overflow-hidden bg-slate-50 py-8 mb-8 border-y border-slate-100">
            <div className="flex animate-scroll whitespace-nowrap items-center">
                {/* Double the list for seamless loop */}
                {[...banners, ...banners, ...banners].map((banner, index) => (
                    <div
                        key={index}
                        onClick={() => banner.link && navigate(banner.link)}
                        className={`inline-block px-4 cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 ${banner.link ? 'hover:shadow-xl' : ''}`}
                    >
                        <div className="relative rounded-3xl overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)] border-4 border-white transform transition-transform">
                            <img
                                src={banner.image}
                                alt={banner.title || "Banner"}
                                className="h-48 md:h-80 object-cover w-[300px] md:w-[600px]"
                            />
                            {banner.title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                    <p className="text-white font-bold text-lg md:text-xl drop-shadow-lg">{banner.title}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-scroll {
                    animation: scroll 40s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}} />
        </div>
    );
};

export default ScrollingBanner;
