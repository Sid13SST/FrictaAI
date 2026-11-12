import { motion } from 'framer-motion';

const examples = [
  {
    title: 'Guest checkout',
    goal: 'Add a product to the cart and reach checkout as a first-time visitor.',
    detail: 'Look for blocked controls, confusing steps, and missing form labels.',
  },
  {
    title: 'First-time onboarding',
    goal: 'Create an account and find the next step without prior product knowledge.',
    detail: 'Explore whether instructions, navigation, and error messages make the path clear.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-32 bg-transparent relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
          >
            What to explore in an audit
          </motion.h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Example goals for a UX review, not customer testimonials. Audit results depend on the site and the chosen workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {examples.map((example, index) => (
            <motion.div
              key={example.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.8 }}
              className="bg-card border border-white/5 rounded-3xl p-8 sm:p-10"
            >
              <p className="text-xs text-primary uppercase tracking-wider mb-4">Example workflow</p>
              <h3 className="text-white font-bold text-2xl mb-4">{example.title}</h3>
              <p className="text-lg text-white font-inter leading-relaxed mb-6">{example.goal}</p>
              <p className="text-text-secondary leading-relaxed">{example.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
