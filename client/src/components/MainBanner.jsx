import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import BulkOrderAlert from './BulkOrderAlert'

const MainBanner = () => {
  const { user, setShowUserLogin, pricingRules, navigate } = useAppContext();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBulkAlert, setShowBulkAlert] = useState(false);

  const handleReferClick = () => {
    navigate('/refer');
  };

  const sliderImages = [
    assets.anbu_card,
    assets.Banners1,
    assets.Banners2,
    assets.Banners3,
    assets.Banners4
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [sliderImages.length]);

  return (
    <div className='relative py-8 md:py-16 overflow-hidden'>
      {/* Background Subtle Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-50 rounded-full blur-3xl -z-10 opacity-60"></div>

      <div className='flex flex-col lg:flex-row items-center gap-12 lg:gap-20'>
        {/* Left Content - Slider Area */}
        <div className='flex-1 w-full text-center lg:text-left space-y-12'>
          <div className="flex flex-col items-center lg:items-start space-y-10">
            {/* Slider Container */}
            <div className="relative w-full max-w-2xl aspect-[16/9] md:aspect-video rounded-3xl shadow-2xl border-4 border-white overflow-hidden bg-white">
              <div
                className="flex transition-transform duration-1000 ease-in-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {sliderImages.map((img, index) => (
                  <div key={index} className="min-w-full h-full">
                    <img
                      src={img}
                      alt={`Banner ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* Slider Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {sliderImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${currentSlide === index ? "bg-blue-700 w-6" : "bg-slate-300"
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Buttons moved under categories */}
          </div>
        </div>

        {/* Right Content - Service Categories */}
        <div className='flex-1 relative animate-in slide-in-from-right duration-700 w-full lg:max-w-[600px]'>
          <div className="relative z-10 p-0 md:p-4 bg-transparent lg:bg-slate-50/50 rounded-[40px] border-none lg:border-white/60">
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {/* Category 1: Black & White */}
              <Link to="/print" className="group bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700/30 space-y-4 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/10 transition-colors"></div>
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/20 group-hover:scale-105 transition-transform relative z-10 shadow-inner">
                  <img src={assets.bw_print_icon} alt="B&W" className="w-full h-full object-cover invert brightness-200" />
                </div>
                <div className="relative z-10 w-full space-y-1">
                  <h3 className="font-bold font-outfit text-white/70 text-sm uppercase tracking-wider mb-1">B&W</h3>
                  <p className="text-white font-black text-2xl leading-none flex items-baseline justify-center gap-1">
                    ₹{pricingRules?.rules?.printing?.bw?.double || '0.50'} <span className="text-[10px] font-bold text-white/40">/pg</span>
                  </p>
                </div>
              </Link>

              {/* Category 2: Color Printing */}
              <Link to="/print" className="group bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-6 md:p-8 shadow-xl border border-blue-500/30 space-y-4 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/20 transition-colors"></div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/30 group-hover:scale-105 transition-transform relative z-10 shadow-inner">
                  <img src={assets.color_print_icon} alt="Color" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full space-y-1">
                  <h3 className="font-bold font-outfit text-blue-50 text-sm uppercase tracking-wider mb-1">Color</h3>
                  <p className="text-white font-black text-2xl leading-none flex items-baseline justify-center gap-1">
                    ₹{pricingRules?.rules?.printing?.color?.single || '8'} <span className="text-[10px] font-bold text-blue-100/50">/pg</span>
                  </p>
                </div>
              </Link>

              {/* Category 3: Spiral Binding */}
              <Link to="/print" className="group bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl p-6 md:p-8 shadow-xl border border-orange-400/30 space-y-4 hover:shadow-2xl hover:shadow-orange-200 transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/20 transition-colors"></div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/30 group-hover:scale-105 transition-transform relative z-10 shadow-inner">
                  <img src={assets.spiral_binding_icon} alt="Spiral" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full space-y-1">
                  <h3 className="font-bold font-outfit text-orange-50 text-sm uppercase tracking-wider mb-1">Spiral</h3>
                  <p className="text-white font-black text-2xl leading-none flex items-baseline justify-center gap-1">
                    ₹{pricingRules?.rules?.additional?.binding || '15'} <span className="text-[10px] font-bold text-orange-100/50">/book</span>
                  </p>
                </div>
              </Link>

              {/* Category 4: Chart Binding */}
              <Link to="/print" className="group bg-gradient-to-br from-purple-500 to-violet-800 rounded-3xl p-6 md:p-8 shadow-xl border border-purple-400/30 space-y-4 hover:shadow-2xl hover:shadow-purple-200 transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/20 transition-colors"></div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/30 group-hover:scale-105 transition-transform relative z-10 shadow-inner">
                  <img src={assets.chart_binding_icon} alt="Chart" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full space-y-1">
                  <h3 className="font-bold font-outfit text-purple-50 text-sm uppercase tracking-wider mb-1">Chart Binding</h3>
                  <p className="text-white font-black text-2xl leading-none flex items-baseline justify-center gap-1">
                    ₹{pricingRules?.rules?.additional?.chart_binding || '10'} <span className="text-[10px] font-bold text-purple-100/50">/unit</span>
                  </p>
                </div>
              </Link>
            </div>

            {/* Action Buttons */}
            <div className='mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4 w-full'>
              <Link to="/print" className='w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-2xl text-xl font-bold transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2 group transform hover:-translate-y-1 active:scale-95'>
                🚀 Start Printing
              </Link>
              <div className="flex flex-col items-center group">
                <button
                  onClick={() => setShowBulkAlert(true)}
                  className='w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-none rounded-2xl text-xl font-bold transition-all shadow-xl shadow-amber-200/50 flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95 cursor-pointer'
                >
                  📦 Bulk Order
                </button>
                <p className="text-[10px] text-amber-600 font-bold mt-2 animate-pulse uppercase tracking-wider group-hover:text-amber-700 transition-colors">Above 2500 copies? Place Bulk Orders! 🚀</p>
              </div>
              <button
                onClick={handleReferClick}
                className='w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xl font-bold transition-all shadow-xl shadow-emerald-200/50 flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95 cursor-pointer'
              >
                💸 Refer & Earn
              </button>
            </div>

            {/* Same Day Delivery Info */}
            <div className='mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-center gap-3 text-blue-800 animate-in fade-in slide-in-from-bottom-2 duration-500'>
              <span className='text-2xl'>⚡</span>
              <p className='text-sm font-semibold mb-0'>
                Order before <span className='font-black'>1:00 PM</span> for <span className='bg-blue-200 px-2 py-0.5 rounded text-blue-900'>Process on the Same day</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <BulkOrderAlert isOpen={showBulkAlert} onClose={() => setShowBulkAlert(false)} />
    </div>
  )
}

export default MainBanner;
