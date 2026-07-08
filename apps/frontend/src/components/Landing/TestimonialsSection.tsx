import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "Fricta caught a checkout bug that only happened on iOS Safari for guest users. Our E2E tests missed it for weeks. Fricta found it on day one.",
    author: "Sarah Jenkins",
    role: "VP Engineering, GlobalTech",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    quote: "The autonomous exploration is mind-blowing. It literally behaves like our most confused users, and gives us the exact DOM snapshot of where they get stuck.",
    author: "David Chen",
    role: "Lead QA, Nexus",
    avatar: "https://i.pravatar.cc/150?u=david"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
           <motion.h2 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
           >
             Trusted by engineering teams
           </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              className="bg-card border border-white/5 rounded-3xl p-10 relative group hover:border-white/10 transition-colors"
            >
              {/* Quote mark decoration */}
              <div className="absolute top-8 left-8 text-6xl text-white/5 font-serif leading-none select-none">"</div>
              
              <div className="relative z-10">
                <p className="text-xl md:text-2xl text-white font-inter leading-relaxed mb-8">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                    <img src={t.avatar} alt={t.author} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                  </div>
                  <div>
                    <div className="text-white font-bold">{t.author}</div>
                    <div className="text-text-tertiary text-sm">{t.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
