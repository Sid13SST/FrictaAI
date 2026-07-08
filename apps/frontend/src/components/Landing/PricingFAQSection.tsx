import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    q: "How does Fricta differ from traditional E2E testing tools?",
    a: "Unlike Cypress or Playwright which require hardcoded selectors and explicit steps, Fricta uses AI agents that navigate visually. They adapt to DOM changes automatically and don't break when a class name changes."
  },
  {
    q: "Can I run Fricta behind a VPN or in staging?",
    a: "Yes. Our Enterprise plan includes secure tunneling and static IP options, allowing agents to access staging environments behind corporate firewalls."
  },
  {
    q: "How does pricing work?",
    a: "Pricing is based on 'Agent Hours'. One hour equals one hour of continuous, autonomous exploration by an AI agent across your application."
  }
];

export function PricingFAQSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="py-32 bg-transparent relative" id="pricing">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20">
        
        {/* Left: Pricing */}
        <div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-6">
            Simple, predictable pricing.
          </h2>
          <p className="font-inter text-text-secondary text-lg mb-12">
            Start for free, upgrade when you need more agent hours and advanced personas.
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-4 mb-12">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-text-tertiary'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-8 bg-white/10 rounded-full p-1 relative transition-colors hover:bg-white/20"
            >
              <motion.div 
                className="w-6 h-6 bg-primary rounded-full shadow-md"
                animate={{ x: isAnnual ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium flex items-center gap-2 transition-colors ${isAnnual ? 'text-white' : 'text-text-tertiary'}`}>
              Annually <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded font-bold tracking-wider">Save 20%</span>
            </span>
          </div>

          <div className="bg-card border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-end gap-2 mb-6">
              <div className="text-5xl font-display font-bold text-white">${isAnnual ? '299' : '349'}</div>
              <div className="text-text-tertiary mb-1">/mo</div>
            </div>
            
            <p className="text-white font-medium mb-8">Pro Plan</p>
            
            <ul className="space-y-4 mb-10">
              {['100 Agent Hours per month', 'Unlimited Projects', 'CI/CD Integration', 'Advanced Custom Personas', 'Slack & Jira integrations'].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-text-secondary text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-full bg-white text-background-deep font-bold hover:bg-gray-200 transition-colors">
              Start 14-Day Free Trial
            </button>
          </div>
        </div>

        {/* Right: FAQ */}
        <div className="lg:pt-24">
          <h3 className="font-display font-bold text-3xl text-white mb-8">Frequently Asked Questions</h3>
          
          <div className="space-y-4">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div 
                  key={i} 
                  className={`border border-white/5 rounded-2xl overflow-hidden transition-colors ${isOpen ? 'bg-card' : 'bg-transparent hover:bg-white/5'}`}
                >
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-bold text-white pr-8">{faq.q}</span>
                    <div className="shrink-0 text-text-tertiary">
                      {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 text-text-secondary text-sm leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
