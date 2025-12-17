import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen gradient-atmosphere relative overflow-hidden">
      {/* Atmospheric overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--ink))_70%)]" />
      
      {/* Subtle animated particles/grain effect */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
        {/* Logo */}
        <div className="opacity-0 animate-fade-up">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl xl:text-8xl tracking-wide text-foreground mb-4 break-words">
            ATELIER
          </h1>
          <p className="heading-editorial text-base md:text-lg lg:text-xl text-muted-foreground text-center">
            Luxury Validated by Desire
          </p>
        </div>

        {/* Divider */}
        <div className="w-[3px] h-12 md:h-16 bg-gradient-to-b from-transparent via-foreground/70 to-transparent my-12 opacity-0 animate-fade-up delay-200" />

        {/* Role Selection */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 opacity-0 animate-fade-up delay-400">
          {/* Collector Entry */}
          <Link
            href="/floor"
            className="group relative px-6 md:px-12 py-4 md:py-6 border border-border hover:border-accent transition-all duration-500 w-full md:w-auto"
          >
            <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-500" />
            <div className="relative flex items-center gap-4">
              <div>
                <span className="ui-label text-muted-foreground block mb-1">
                  Browse & Bid
                </span>
                <span className="font-serif text-lg md:text-xl lg:text-2xl group-hover:text-accent transition-colors duration-300 break-words">
                  Enter as Collector
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>

          {/* Designer Entry */}
          <Link
            href="/vault?role=designer"
            className="group relative px-6 md:px-12 py-4 md:py-6 border border-border hover:border-foreground transition-all duration-500 w-full md:w-auto"
          >
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500" />
            <div className="relative flex items-center gap-4">
              <div>
                <span className="ui-label text-muted-foreground block mb-1">
                  Submit & Sell
                </span>
                <span className="font-serif text-lg md:text-xl lg:text-2xl group-hover:text-foreground transition-colors duration-300 break-words">
                  Enter as Designer
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        </div>

        {/* Footer tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center opacity-0 animate-fade-up delay-600 hidden md:block">
          <p className="ui-caption">
            Where exclusive pieces are unlocked by collective desire
          </p>
        </div>
      </div>

      {/* Corner accents - highly visible */}
      <div className="absolute top-4 md:top-8 left-4 md:left-8 w-12 h-12 md:w-16 md:h-16 border-l-[2px] border-t-[2px] border-foreground/70" />
      <div className="absolute top-4 md:top-8 right-4 md:right-8 w-12 h-12 md:w-16 md:h-16 border-r-[2px] border-t-[2px] border-foreground/70" />
      <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 w-12 h-12 md:w-16 md:h-16 border-l-[2px] border-b-[2px] border-foreground/70" />
      <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 w-12 h-12 md:w-16 md:h-16 border-r-[2px] border-b-[2px] border-foreground/70" />
      
      {/* Edge lines - highly visible */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-foreground/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-foreground/60 to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-gradient-to-b from-transparent via-foreground/60 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-[1.5px] bg-gradient-to-b from-transparent via-foreground/60 to-transparent" />
    </div>
  );
}

