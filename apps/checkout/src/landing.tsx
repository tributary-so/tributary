"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Shield, Zap, Globe, ArrowRight } from "lucide-react";
import { CheckoutLinkForm } from "@/components/checkout-link-form";

export function Landing() {
  const scrollToForm = React.useRef<HTMLDivElement>(null);

  const handleScrollToForm = () => {
    scrollToForm.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-[#9945FF] to-[#14F195]"
      >
        <motion.div
          animate={{
            backgroundPosition: ["0% 50%", "100% 0%", "0% 50%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 bg-gradient-to-br from-[#9945FF] to-[#14F195]"
          style={{
            backgroundSize: "200% 200%",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
            >
              Simple Checkout for
              <br />
              Recurring Payments
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto mb-8"
            >
              Create a hosted checkout link for your subscriptions in seconds.
              No backend required. Just a URL you can share anywhere.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <button
                onClick={handleScrollToForm}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Create Checkout Link
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Tributary Checkout?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            The easiest way to accept recurring payments on Solana
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start accepting payments
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Everyone
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're a creator, SaaS company, or marketplace
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm border border-gray-100"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Checkout Link Form Section */}
      <section ref={scrollToForm} className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Create Your Checkout Link
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Configure your payment settings and get a shareable URL instantly
            </p>
          </motion.div>

          <CheckoutLinkForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p className="flex items-center justify-center gap-2 text-sm">
              <span>Powered by Tributary</span>
              <span>•</span>
              <span>Secured by Solana</span>
            </p>
            <p className="text-xs mt-2">
              © {new Date().getFullYear()} Tributary. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

const features = [
  {
    icon: Zap,
    title: "Instant Setup",
    description:
      "No coding required. Generate a checkout link in seconds and start accepting payments immediately.",
    color: "bg-gradient-to-br from-yellow-400 to-orange-500",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description:
      "Built on Solana's secure blockchain. Non-custodial payments mean funds stay safe in user wallets.",
    color: "bg-gradient-to-br from-blue-400 to-indigo-500",
  },
  {
    icon: Globe,
    title: "Share Anywhere",
    description:
      "Use your checkout link on social media, email, websites, or anywhere you can paste a URL.",
    color: "bg-gradient-to-br from-green-400 to-emerald-500",
  },
];

const howItWorks = [
  {
    title: "Configure Your Payment",
    description:
      "Set your amount, frequency, and other payment parameters using the form below.",
  },
  {
    title: "Get Your Checkout Link",
    description:
      "Generate a unique URL that contains all your payment configuration.",
  },
  {
    title: "Share & Collect Payments",
    description:
      "Send the link to customers. They'll be directed to a secure checkout page to pay.",
  },
];

const benefits = [
  "No backend needed",
  "Non-custodial & secure",
  "Low 1% protocol fee",
  "Automatic recurring billing",
  "Supports subscriptions & milestones",
  "Pay-as-you-go options",
  "Instant finality",
  "Transparent on-chain",
];
