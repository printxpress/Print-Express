import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import BulkOrderAlert from './BulkOrderAlert';

const Categories = () => {
  const { pricingRules } = useAppContext();
  const rules = pricingRules?.rules;
  const [showBulkAlert, setShowBulkAlert] = useState(false);

  const services = [
    {
      name: 'B/W Printing',
      icon: '📄',
      desc: 'Fast and crisp black & white document printing for all your needs.',
      price: `From ₹${rules?.printing?.bw?.single || '0.75'}/page`,
      link: '/print',
      color: 'blue'
    },
    {
      name: 'Color Printing',
      icon: '🌈',
      desc: 'Vibrant, high-quality color prints to make your documents stand out.',
      price: `From ₹${rules?.printing?.color?.single || '8'}/page`,
      link: '/print',
      color: 'orange'
    },
    {
      name: 'Spiral Binding',
      icon: '📚',
      desc: 'Secure and professional spiral binding for reports, notebooks, and more.',
      price: `From ₹${rules?.additional?.binding || '15'}`,
      link: '/print',
      color: 'purple'
    },
    {
      name: 'Chart Binding',
      icon: '📊',
      desc: 'Specialized binding for large charts, maps, and engineering drawings.',
      price: `From ₹${rules?.additional?.chart_binding || '10'}`,
      link: '/print',
      color: 'green'
    },
    {
      name: 'Bulk Printing',
      icon: '🖨️',
      desc: 'Large volume printing for offices, schools, and events at discounted rates.',
      price: 'Custom Quote',
      link: '/print',
      color: 'blue'
    },
    {
      name: 'Express Delivery',
      icon: '🚀',
      desc: 'Same-day printing and delivery to your doorstep across India.',
      price: 'From ₹40',
      link: '#estimator',
      color: 'teal'
    }
  ]

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue': return 'bg-blue-50/30 border-blue-100 hover:border-blue-500 hover:bg-blue-50/50 shadow-blue-100/20';
      case 'orange': return 'bg-orange-50/30 border-orange-100 hover:border-orange-500 hover:bg-orange-50/50 shadow-orange-100/20';
      case 'purple': return 'bg-purple-50/30 border-purple-100 hover:border-purple-500 hover:bg-purple-50/50 shadow-purple-100/20';
      case 'green': return 'bg-green-50/30 border-green-100 hover:border-green-500 hover:bg-green-50/50 shadow-green-100/20';
      case 'teal': return 'bg-teal-50/30 border-teal-100 hover:border-teal-500 hover:bg-teal-50/50 shadow-teal-100/20';
      default: return 'bg-slate-50 border-slate-100 hover:border-primary';
    }
  }

  return (
    <div className='mt-24 space-y-12'>
      <div className="flex flex-col items-center text-center space-y-2">
        <span className="px-4 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">What We Offer</span>
        <h2 className='text-3xl md:text-5xl font-bold font-outfit'>Our Printing Services</h2>
        <p className="text-text-muted max-w-xl">From document printing to bulk orders and express delivery — your one-stop printing solution across India.</p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10'>
        {services.map((service, index) => (
          <div 
            key={index} 
            onClick={() => {
              if (service.name === 'Bulk Printing') {
                setShowBulkAlert(true);
              }
            }}
            className="contents"
          >
            <Link 
              to={service.name === 'Bulk Printing' ? '#' : service.link} 
              className={`card-premium group relative overflow-hidden flex flex-col items-start p-7 border-2 ${getColorClasses(service.color)} transition-all hover-lift cursor-pointer`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-150 transition-all text-7xl">{service.icon}</div>
  
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl mb-5 shadow-sm border border-border/50 group-hover:scale-110 transition-transform">{service.icon}</div>
  
              <h3 className='text-lg font-bold font-outfit mb-1.5'>{service.name}</h3>
              <p className='text-text-muted text-sm mb-5 flex-grow leading-relaxed'>{service.desc}</p>
  
              <div className="flex items-center justify-between w-full mt-auto pt-4 border-t border-border/50">
                <span className="text-primary font-bold text-sm">{service.price}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-text-main group-hover:text-primary transition-colors">
                  Order Now <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <BulkOrderAlert isOpen={showBulkAlert} onClose={() => setShowBulkAlert(false)} />
    </div>
  )
}

export default Categories;
