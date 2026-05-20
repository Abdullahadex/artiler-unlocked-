'use client';

import Link from 'next/link';
import { ArrowRight, Lock, Users, Unlock, Shield, Fingerprint, Activity, ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const lineReveal = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div className="bg-background text-foreground">
      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION 1: HERO                                */}
      {/* ═══════════════════════════════════════════════ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-screen gradient-atmosphere relative overflow-hidden flex flex-col items-center justify-center px-4 md:px-6"
      >
        {/* Atmospheric overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--ink))_70%)]" />

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Corner accents */}


        {/* Edge lines */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-foreground/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-foreground/60 to-transparent" />
        <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-gradient-to-b from-transparent via-foreground/60 to-transparent" />
        <div className="absolute top-0 bottom-0 right-0 w-[1.5px] bg-gradient-to-b from-transparent via-foreground/60 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center"
          >
            <div className="relative px-8 py-6 mb-4">
              {/* Refined 90-degree accents framing the title - now more subtle and tight */}
              <div className="absolute top-0 left-0 w-6 h-6 border-l-[2px] border-t-[2px] border-accent/30" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-[2px] border-b-[2px] border-accent/30" />
              
              <motion.h1
                variants={fadeUp}
                custom={0}
                className="text-4xl md:text-5xl lg:text-7xl xl:text-8xl tracking-tight flex flex-col md:flex-row items-center md:items-baseline gap-x-6 gap-y-2"
              >
                <span className="font-serif text-accent drop-shadow-[0_0_30px_rgba(180,130,50,0.2)]">ATELIER</span>
                <span className="font-sans font-light text-foreground/90 uppercase tracking-[0.2em] text-[0.6em] md:text-[0.7em]">UNLOCKED</span>
              </motion.h1>
            </div>

            <motion.div variants={lineReveal} className="w-16 h-[2px] bg-accent mb-6 origin-left" />

            <motion.p
              variants={fadeUp}
              custom={1}
              className="heading-editorial text-lg md:text-xl lg:text-2xl text-muted-foreground mb-4"
            >
              Luxury Validated by Consensus
            </motion.p>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-sm md:text-base text-muted-foreground/60 max-w-lg leading-relaxed font-sans"
            >
              An exclusive marketplace. Rare archival pieces are released only when genuine demand is proven by the community.
            </motion.p>

            {/* Divider */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="w-[2px] h-24 md:h-40 bg-gradient-to-b from-transparent via-foreground/30 to-transparent my-10"
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="ui-label text-[9px] text-muted-foreground/40 tracking-[0.3em]">SCROLL</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION: GATEWAY CTAs                          */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="py-32 md:py-48 border-y border-border/20 bg-background relative overflow-hidden">
        {/* Subtle glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_hsl(var(--accent)/0.03)_0%,_transparent_70%)] pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl relative z-10 px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
          >
            <motion.div variants={fadeUp} custom={0} className="w-full md:w-auto">
              <Link
                href="/auth"
                className="group relative flex items-center justify-between md:justify-start px-10 md:px-16 py-8 md:py-10 border border-accent/30 hover:border-accent transition-all duration-700 overflow-hidden bg-card/30 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-700" />
                
                {/* 90-degree corner accents on button - subtle but persistent */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-[2px] border-t-[2px] border-accent/10 group-hover:border-accent/80 transition-all duration-500" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-[2px] border-b-[2px] border-accent/10 group-hover:border-accent/80 transition-all duration-500" />

                <div className="relative flex items-center gap-6">
                  <div>
                    <span className="ui-label text-accent/70 block mb-2 text-[11px] tracking-[0.4em] uppercase">
                      Browse & Bid
                    </span>
                    <span className="font-serif text-2xl md:text-3xl group-hover:text-accent transition-colors duration-500">
                      Enter The Floor
                    </span>
                  </div>
                  <ArrowRight className="w-6 h-6 text-accent/50 group-hover:text-accent group-hover:translate-x-2 transition-all duration-500" />
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="w-full md:w-auto">
              <Link
                href="/auth"
                className="group relative flex items-center justify-between md:justify-start px-10 md:px-16 py-8 md:py-10 border border-border hover:border-foreground/50 transition-all duration-700 overflow-hidden bg-card/30 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-700" />
                
                {/* 90-degree corner accents on button - subtle but persistent */}
                <div className="absolute top-0 right-0 w-4 h-4 border-r-[2px] border-t-[2px] border-foreground/10 group-hover:border-foreground/50 transition-all duration-500" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-[2px] border-b-[2px] border-foreground/10 group-hover:border-foreground/50 transition-all duration-500" />

                <div className="relative flex items-center gap-6">
                  <div>
                    <span className="ui-label text-muted-foreground block mb-2 text-[11px] tracking-[0.4em] uppercase">
                      Submit & Sell
                    </span>
                    <span className="font-serif text-2xl md:text-3xl group-hover:text-foreground transition-colors duration-500">
                      Enter The Vault
                    </span>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-2 transition-all duration-500" />
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION 2: HOW IT WORKS                        */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 px-4 md:px-6 overflow-hidden">
        {/* Subtle top gradient bleed */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />

        <div className="container mx-auto max-w-6xl relative z-10">
          {/* Section Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-20 md:mb-28"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-accent/30" />
              <span className="ui-label text-[10px] text-accent tracking-[0.4em]">THE PROTOCOL</span>
              <div className="w-12 h-[1px] bg-accent/30" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="heading-display text-3xl md:text-5xl lg:text-6xl mb-6">
              How Atelier Works
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="ui-caption text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Every item follows a clear, community-led path from the vault to your collection.
            </motion.p>
          </motion.div>

          {/* Steps */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-0"
          >
            {[
              {
                step: '01',
                icon: Lock,
                title: 'Piece Proposed',
                description: 'Authorized designers submit rare archive items. We review and verify every piece before it enters the vault.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Community Signals',
                description: 'Collectors signal their interest, creating a true consensus. No artificial scarcity, just organic demand.',
              },
              {
                step: '03',
                icon: Unlock,
                title: 'Unlocked to Bid',
                description: 'Once enough interest is gathered, the item unlocks for bidding. The market decides its true value.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={i}
                className="group relative p-8 md:p-10 lg:p-12 border border-border/50 hover:border-accent/30 transition-all duration-700"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/[0.02] transition-colors duration-700" />

                {/* Step connector line (hidden on last) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-[1px] w-[1px] h-8 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-mono text-3xl md:text-4xl font-bold text-accent/20 group-hover:text-accent/40 transition-colors duration-700">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-full border border-accent/20 group-hover:border-accent/40 flex items-center justify-center transition-all duration-700 group-hover:shadow-[0_0_20px_rgba(180,130,50,0.1)]">
                      <item.icon className="w-4 h-4 text-accent/60 group-hover:text-accent transition-colors duration-500" />
                    </div>
                  </div>

                  <h3 className="font-serif text-xl md:text-2xl mb-3 group-hover:text-accent transition-colors duration-500">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION 3: THE PROMISE / VALUE PILLARS          */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 px-4 md:px-6">
        {/* Ambient accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-border" />
              <span className="ui-label text-[10px] text-muted-foreground tracking-[0.4em]">THE STANDARD</span>
              <div className="w-12 h-[1px] bg-border" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="heading-display text-3xl md:text-5xl lg:text-6xl mb-6">
              Built on Trust
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 md:gap-8"
          >
            {[
              {
                icon: Shield,
                title: 'Verified Sellers',
                description: 'We thoroughly vet and authorize every designer before they can list an item on the platform.',
              },
              {
                icon: Fingerprint,
                title: 'On-Platform Security',
                description: 'All transactions are secure and strictly on-platform. We monitor and prevent off-platform solicitation.',
              },
              {
                icon: Activity,
                title: 'Community-Driven',
                description: 'True value is determined by actual collector demand. No hype, no artificial inflation.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="group relative p-8 md:p-10 bg-card/50 border border-border/50 hover:border-accent/20 transition-all duration-700 overflow-hidden"
              >
                {/* Corner accent */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l border-t border-accent/0 group-hover:border-accent/30 transition-all duration-700" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r border-b border-accent/0 group-hover:border-accent/30 transition-all duration-700" />

                <item.icon className="w-6 h-6 text-accent/50 group-hover:text-accent mb-6 transition-colors duration-500" />

                <h3 className="font-serif text-lg md:text-xl mb-3 group-hover:text-accent transition-colors duration-500">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground/60 leading-relaxed font-sans">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION 4: FOR DESIGNERS CTA                   */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 px-4 md:px-6 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
          >
            {/* Left - Text */}
            <div>
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-6">
                <div className="w-8 h-[1px] bg-accent/30" />
                <span className="ui-label text-[10px] text-accent tracking-[0.4em]">FOR DESIGNERS</span>
              </motion.div>

              <motion.h2 variants={fadeUp} custom={1} className="heading-display text-3xl md:text-4xl lg:text-5xl mb-6">
                Open The Vault
              </motion.h2>

              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground/70 leading-relaxed mb-4 text-sm md:text-base font-sans">
                Offer your finest archival pieces to a curated audience of serious collectors.
                The community evaluates every submission, ensuring real interest backs your item.
              </motion.p>

              <motion.p variants={fadeUp} custom={3} className="text-muted-foreground/50 leading-relaxed mb-8 text-sm font-sans">
                As an authorized designer, you keep full control. Manage shipments directly,
                track analytics, and enjoy clear, transparent payouts.
              </motion.p>

              <motion.div variants={fadeUp} custom={4}>
                <Link
                  href="/auth"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-500 shadow-[0_0_30px_rgba(180,130,50,0.15)] hover:shadow-[0_0_40px_rgba(180,130,50,0.25)]"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Apply to Design</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
            </div>

            {/* Right - Visual Card */}
            <motion.div variants={fadeUp} custom={2} className="relative">
              <div className="relative bg-card border border-border p-8 md:p-10">
                {/* Decorative corner accents */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-accent/40" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-accent/40" />

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="ui-label text-[9px] text-accent tracking-[0.3em]">SUBMISSION PREVIEW</span>
                  </div>

                  <div className="aspect-[16/9] bg-muted/30 border border-border/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border border-accent/20 flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-5 h-5 text-accent/40" />
                      </div>
                      <span className="ui-label text-[9px] text-muted-foreground/40 tracking-[0.2em]">YOUR PIECE HERE</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="h-3 bg-muted/40 rounded-sm w-3/4" />
                    <div className="h-2 bg-muted/20 rounded-sm w-1/2" />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <div>
                      <span className="ui-label text-[9px] text-muted-foreground/40 block mb-1">STARTING</span>
                      <span className="font-serif text-lg text-muted-foreground/50">€—</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-6 h-1 rounded-full bg-muted/20" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* SECTION 5: FOOTER                              */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="relative py-20 md:py-24 px-4 md:px-6 border-t border-border/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col items-center text-center"
          >
            <motion.h3 
              variants={fadeUp} 
              custom={0} 
              className="flex items-baseline gap-3 mb-2"
            >
              <span className="font-serif text-xl md:text-2xl text-accent">ATELIER</span>
              <span className="font-sans font-light text-[10px] md:text-[12px] tracking-[0.3em] text-muted-foreground/50 uppercase">UNLOCKED</span>
            </motion.h3>

            <motion.div variants={lineReveal} className="w-16 h-[1px] bg-accent/30 mb-8 origin-center" />

            <motion.div variants={fadeUp} custom={1} className="flex items-center gap-6 md:gap-8 mb-10">
              <Link href="/intel" className="ui-label text-[10px] text-muted-foreground/50 hover:text-accent transition-colors duration-300 tracking-[0.2em]">
                Updates
              </Link>
              <span className="w-1 h-1 rounded-full bg-border" />
              <Link href="/terms" className="ui-label text-[10px] text-muted-foreground/50 hover:text-accent transition-colors duration-300 tracking-[0.2em]">
                Terms
              </Link>
              <span className="w-1 h-1 rounded-full bg-border" />
              <Link href="/privacy" className="ui-label text-[10px] text-muted-foreground/50 hover:text-accent transition-colors duration-300 tracking-[0.2em]">
                Privacy
              </Link>
            </motion.div>

            <motion.p variants={fadeUp} custom={2} className="text-[11px] text-muted-foreground/30 font-sans tracking-wide">
              Where exclusive pieces are unlocked by collective desire
            </motion.p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
