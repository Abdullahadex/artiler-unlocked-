import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  if (isLanding) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            to="/" 
            className="font-serif text-xl tracking-wide text-foreground hover:text-accent transition-colors duration-500"
          >
            ATELIER
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/floor"
              className={`ui-label transition-colors duration-300 ${
                location.pathname === '/floor' 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              The Floor
            </Link>
            <Link
              to="/vault"
              className={`ui-label transition-colors duration-300 ${
                location.pathname === '/vault' 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              The Vault
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* User Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="ui-label truncate">{profile?.display_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/vault" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      The Vault
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/auth"
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300"
              >
                <User className="w-4 h-4" />
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-foreground"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 z-40 bg-background transition-all duration-500 md:hidden ${
          mobileMenuOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col items-center justify-center h-full gap-8">
          <Link
            to="/floor"
            onClick={() => setMobileMenuOpen(false)}
            className={`heading-display text-3xl transition-colors duration-300 ${
              location.pathname === '/floor' ? 'text-accent' : 'text-foreground hover:text-accent'
            }`}
          >
            The Floor
          </Link>
          <Link
            to="/vault"
            onClick={() => setMobileMenuOpen(false)}
            className={`heading-display text-3xl transition-colors duration-300 ${
              location.pathname === '/vault' ? 'text-accent' : 'text-foreground hover:text-accent'
            }`}
          >
            The Vault
          </Link>
          {user ? (
            <button
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              className="ui-label text-destructive hover:text-destructive/80 transition-colors mt-8"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="ui-label text-accent hover:text-accent/80 transition-colors mt-8"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </>
  );
};

export default Header;
