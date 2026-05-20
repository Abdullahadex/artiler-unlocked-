import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center opacity-0 animate-fade-up">
        <h1 className="heading-display text-4xl md:text-6xl mb-4">404</h1>
        <p className="heading-editorial text-xl text-muted-foreground mb-8">
          This piece has yet to be discovered
        </p>
        <Link
          href="/floor"
          className="ui-label text-accent hover:text-accent/80 transition-colors"
        >
          Return to The Floor
        </Link>
      </div>
    </div>
  );
}

