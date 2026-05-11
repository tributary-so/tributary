import { motion } from 'framer-motion'

import { useState } from 'react'

function USDCConfirmDialog() {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="bg-white border border-gray-600 rounded-2xl p-7">
      <div className="flex items-baseline justify-end  mb-4">
        <span className="text-4xl font-medium text-gray-900 pr-2">5 </span>
        <span className="text-base text-gray-400">USDC/month</span>
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6 flex flex-col gap-5">
        <div className="flex justify-between text-sm gap-2">
          <span className="text-gray-400">renewals</span>
          <span className="text-gray-900 font-medium">12 months</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Future payments</span>
          <span className="text-gray-900 font-medium">55 USDC</span>
        </div>
      </div>

      <button
        onClick={() => setConfirmed(true)}
        disabled={confirmed}
        className="w-full py-3 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50 bg-emerald-600 text-gray-300 hover:opacity-85"
      >
        {confirmed ? '✓ Authorized' : 'Confirm'}
      </button>

      <p className="text-xs text-gray-800 text-center mt-2.5">Cancel anytime in the future</p>
    </div>
  )
}

export default function SlideFlow() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-8 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Sign once.
        <br />
        <span className="text-emerald-400">Pay automatically.</span>
      </motion.h2>

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          className="max-w-md w-full rounded overflow-hidden shadow-emerald-500/5"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <USDCConfirmDialog />
        </motion.div>
        <motion.div
          className="max-w-md w-full rounded overflow-hidden shadow-emerald-500/5"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <img src="/frontier/sign-tx-small.png" width="280" />
        </motion.div>
      </div>

      <motion.p
        className="text-xs text-muted-foreground mt-6 italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        One signature. Recurring payments run automatically after that.
      </motion.p>
    </div>
  )
}
