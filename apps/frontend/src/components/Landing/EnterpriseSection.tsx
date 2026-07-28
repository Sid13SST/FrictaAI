import { motion } from 'framer-motion';
import { Shield, Key, Users, Lock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'Encrypted data at rest and in transit, with continuous compliance monitoring built in.',
    color: 'text-[#7342e2]'
  },
  {
    icon: Key,
    title: 'SAML & SSO',
    desc: 'Integrate with Okta, Azure AD, Google Workspace, and other major identity providers.',
    color: 'text-[#5C2FC2]'
  },
  {
    icon: Users,
    title: 'Role-Based Access Control',
    desc: 'Granular permissions for Viewers, Editors, and Admins across multiple workspaces.',
    color: 'text-[#FFBD2E]'
  },
  {
    icon: Lock,
    title: 'Data Retention & Privacy',
    desc: 'Custom data retention policies, PII masking in replays, and full GDPR compliance.',
    color: 'text-[#FF5F56]'
  }
];

export function EnterpriseSection() {
  return (
    <section className="py-24 bg-transparent border-t border-white/5 relative overflow-hidden" id="enterprise">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12 mb-16">
          <div className="max-w-2xl">
             <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="font-display font-bold text-4xl md:text-5xl text-white mb-4"
             >
               Enterprise-grade by default.
             </motion.h2>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 }}
               className="font-inter text-text-secondary text-lg"
             >
               Scale your UX testing with confidence. Fricta provides the security, control, and compliance required by the world's most demanding organizations.
             </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <button className="px-8 py-4 rounded-full bg-white text-background-deep font-bold hover:bg-gray-200 transition-colors">
              Contact Sales
            </button>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="bg-transparent border border-white/5 rounded-2xl p-8 hover:bg-card hover:border-white/10 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-white font-bold text-xl mb-3">{feature.title}</h3>
                <p className="text-text-tertiary text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
