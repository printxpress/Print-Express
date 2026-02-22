import React from 'react'
import { Link } from 'react-router-dom'

const services = [
  { name: 'B/W Printing', icon: '📄', desc: 'Fast and crisp black & white document printing for all your needs.', price: 'From ₹0.75/page', link: '/print', color: 'blue' },
  { name: 'Color Printing', icon: '🌈', desc: 'Vibrant, high-quality color prints to make your documents stand out.', price: 'From ₹8/page', link: '/print', color: 'orange' },
  { name: 'Spiral Binding', icon: '📚', desc: 'Secure and professional spiral binding for reports, notebooks, and more.', price: 'From ₹15', link: '/print', color: 'purple' },
  { name: 'Chart Binding', icon: '📊', desc: 'Specialized binding for large charts, maps, and engineering drawings.', price: 'From ₹10', link: '/print', color: 'green' },
  { name: 'Bulk Printing', icon: '🖨️', desc: 'Large volume printing for offices, schools, and events at discounted rates.', price: 'Custom Quote', link: '/print', color: 'blue' },
  { name: 'Express Delivery', icon: '🚀', desc: 'Same-day printing and delivery to your doorstep across India.', price: 'From ₹40', link: '#estimator', color: 'teal' }
]

const getColorClasses = (color) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-orange-100',
    green: 'bg-green-50 border-green-200 hover:border-green-400 hover:shadow-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-purple-100',
    red: 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-red-100',
    teal: 'bg-teal-50 border-teal-200 hover:border-teal-400 hover:shadow-teal-100'
  };
  return colors[color] || colors.blue;
};

const Categories = () => {
  return (
    <div className='mt-24 space-y-12'>
      <div className="flex flex-col items-center text-center space-y-2">
        <span className="px-4 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">What We Offer</span>
        <h2 className='text-3xl md:text-5xl font-bold font-outfit'>Our Printing Services</h2>
        <p className="text-text-muted max-w-xl">From document printing to bulk orders and express delivery — your one-stop printing solution across India.</p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10'>
        {services.map((service, index) => (
          <Link to={service.link} key={index} className={`card-premium group relative overflow-hidden flex flex-col items-start p-7 border-2 ${getColorClasses(service.color)} transition-all hover-lift cursor-pointer`}
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
        ))}
      </div>
    </div>
  )
}

export default Categories
