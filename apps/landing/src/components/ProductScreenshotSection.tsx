import { motion } from "framer-motion";

const ProductScreenshotSection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
            The Tributary Dashboard
          </h2>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
            Manage your entire subscription ecosystem from one intuitive
            interface. Create payment policies, monitor performance, and give
            users full control over their recurring payments.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="space-y-6">
            <motion.div
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Create Payment Policies
                </h3>
                <p className="text-neutral-600">
                  Set up subscription plans, installment schedules, or
                  usage-based billing with flexible parameters and custom fee
                  structures.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Monitor Real-time Analytics
                </h3>
                <p className="text-neutral-600">
                  Track payment success rates, revenue metrics, and user
                  engagement with comprehensive dashboards and detailed
                  reporting.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  User Self-Service Portal
                </h3>
                <p className="text-neutral-600">
                  Give customers full control to manage, pause, or cancel
                  subscriptions through a transparent interface built on
                  Solana's secure delegation.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <div className="relative glass rounded-2xl p-8 shadow-2xl">
              <img
                src="/product-screenshot.png"
                alt="Tributary Dashboard"
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>

            {/* Feature callouts */}
            <motion.div
              className="absolute -top-4 -right-4 bg-electric text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Non-custodial
            </motion.div>
            <motion.div
              className="absolute -bottom-4 -left-4 bg-accent text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              Automated
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductScreenshotSection;
