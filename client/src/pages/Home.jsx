import React from 'react'
import MainBanner from '../components/MainBanner'
import Categories from '../components/Categories'
import BottomBanner from '../components/BottomBanner'
import DeliveryEstimator from '../components/DeliveryEstimator'
import PricingTable from '../components/PricingTable'
import PrintOptions from '../components/PrintOptions'

const Home = () => {
  return (
    <div className='mt-6 space-y-24 pb-20'>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <MainBanner />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-24">


        <div id="estimator">
          <DeliveryEstimator />
        </div>

        <PrintOptions />

      </div>
    </div>
  )
}

export default Home
