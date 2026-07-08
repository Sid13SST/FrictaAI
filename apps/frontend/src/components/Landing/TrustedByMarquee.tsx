export function TrustedByMarquee() {
  const logos = [
    "ACME Corp",
    "GlobalTech",
    "Nexus",
    "Quantum",
    "Stark Ind",
    "CyberDyne",
    "Umbrella",
    "Initech",
    "Soylent",
    "Massive Dynamic",
  ];

  return (
    <section className="py-20 border-y border-white/5 bg-transparent overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background-alt to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background-alt to-transparent z-10" />
      
      <div className="flex w-[200%] animate-marquee">
        {/* Double the logos to create the infinite scroll effect */}
        {[...logos, ...logos].map((logo, index) => (
          <div 
            key={index} 
            className="flex-1 flex justify-center items-center opacity-40 hover:opacity-100 transition-opacity duration-300 px-8"
          >
            <span className="font-display text-xl md:text-2xl font-bold text-text-tertiary uppercase tracking-wider">
              {logo}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
