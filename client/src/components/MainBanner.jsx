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
              <Link to="/print" className="group bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4 hover:shadow-[0_20px_50px_rgb(59,130,246,0.15)] transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-slate-500/10 transition-colors"></div>
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform relative z-10">
                  <img src={assets.bw_print_icon} alt="B&W" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full">
                  <h3 className="font-bold font-outfit text-slate-900 text-sm mb-1">B&W</h3>
                  <p className="text-slate-900 font-black text-xl leading-none">
                    ₹{pricingRules?.rules?.printing?.bw?.double || '0.50'} <span className="text-[10px] font-bold text-slate-400">/pg</span>
                  </p>
                </div>
              </Link>

              {/* Category 2: Color Printing */}
              <Link to="/print" className="group bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4 hover:shadow-[0_20px_50px_rgb(249,115,22,0.15)] transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform relative z-10">
                  <img src={assets.color_print_icon} alt="Color" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full">
                  <h3 className="font-bold font-outfit text-slate-900 text-sm mb-1">Color</h3>
                  <p className="text-blue-700 font-black text-xl leading-none">
                    ₹{pricingRules?.rules?.printing?.color?.single || '8'} <span className="text-[10px] font-bold text-slate-400">/pg</span>
                  </p>
                </div>
              </Link>

              {/* Category 3: Spiral Binding */}
              <Link to="/print" className="group bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4 hover:shadow-[0_20px_50px_rgb(234,88,12,0.15)] transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/10 transition-colors"></div>
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform relative z-10">
                  <img src={assets.spiral_binding_icon} alt="Spiral" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full">
                  <h3 className="font-bold font-outfit text-slate-900 text-sm mb-1">Spiral</h3>
                  <p className="text-orange-600 font-black text-xl leading-none">
                    ₹{pricingRules?.rules?.additional?.binding || '15'} <span className="text-[10px] font-bold text-slate-400">/book</span>
                  </p>
                </div>
              </Link>

              {/* Category 4: Chart Binding */}
              <Link to="/print" className="group bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 space-y-4 hover:shadow-[0_20px_50px_rgb(147,51,234,0.15)] transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden relative flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors"></div>
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform relative z-10">
                  <img src={assets.chart_binding_icon} alt="Chart" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-full">
                  <h3 className="font-bold font-outfit text-slate-900 text-sm mb-1">Chart Binding</h3>
                  <p className="text-purple-600 font-black text-xl leading-none">
                    ₹{pricingRules?.rules?.additional?.chart_binding || '10'} <span className="text-[10px] font-bold text-slate-400">/unit</span>
                  </p>
                </div>
              </Link>
            </div>

            {/* Action Buttons */}
            <div className='mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4 w-full'>
              <Link to="/print" className='w-full sm:w-auto px-10 py-5 bg-blue-700 hover:bg-black text-white rounded-2xl text-xl font-bold transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-2 group transform hover:-translate-y-1'>
                🚀 Start Printing
              </Link>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setShowBulkAlert(true)}
                  className='w-full sm:w-auto px-10 py-5 bg-white border-2 border-slate-100 hover:border-blue-200 text-slate-700 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 cursor-pointer'
                >
                  📦 Bulk Order
                </button>
                <p className="text-[10px] text-blue-600 font-bold mt-2 animate-pulse uppercase tracking-wider">Above 2500 copies? Place Bulk Orders! 🚀</p>
              </div>
              <button
                onClick={handleReferClick}
                className='w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl text-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-1 cursor-pointer'
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
