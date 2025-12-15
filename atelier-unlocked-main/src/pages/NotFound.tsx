import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-8 opacity-0 animate-fade-up">
        {/* Large 404 */}
        <div className="relative">
          <span className="heading-display text-[12rem] md:text-[16rem] leading-none text-foreground/5">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="heading-editorial text-2xl md:text-3xl text-muted-foreground">
              Lost in the Atelier
            </h1>
          </div>
        </div>

        {/* Message */}
        <p className="ui-caption max-w-md mx-auto">
          The piece you're looking for has either been acquired by another collector 
          or doesn't exist in our collection.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            to="/floor"
            className="group inline-flex items-center gap-3 px-8 py-4 border border-accent bg-accent/5 text-accent hover:bg-accent/10 transition-all duration-500"
          >
            <span className="ui-label">Browse The Floor</span>
          </Link>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 ui-caption hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Gateway
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
