import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Scan, 
  User, 
  Info, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Menu, 
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { logout } from '../lib/firebase';
import { AuthModal, triggerAuthModal } from './AuthModal';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, t } = useAuth();
  const { config } = useConfig();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [logoTaps, setLogoTaps] = useState(0);

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  const handleLogoClick = () => {
    if (!isAdmin) return;
    setLogoTaps(prev => prev + 1);
    setTimeout(() => setLogoTaps(0), 1000); // Reset after 1 second of inactivity
    if (logoTaps + 1 >= 3) {
      navigate('/admin');
      setLogoTaps(0);
    }
  };

  const navItems = [
    { label: t('analyze'), icon: Scan, path: '/' },
    { label: t('history'), icon: History, path: '/history', protected: true },
    { label: t('about'), icon: Info, path: '/about' },
    { label: t('profile'), icon: User, path: '/profile', protected: true },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              {config?.logoText || config?.appName || 'UXLens AI'}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              (!item.protected || user) && (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="ml-2 p-2 rounded-full text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="ml-2 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden bg-neutral-950 pt-16 px-4"
          >
            <nav className="flex flex-col gap-2 py-8">
              {navItems.map((item) => (
                (!item.protected || user) && (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-lg font-medium transition-all ${
                      location.pathname === item.path
                        ? 'bg-orange-600 text-white'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </Link>
                )
              ))}
              {user ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl text-lg font-medium text-red-500 hover:bg-red-500/10 mt-4 animate-colors"
                >
                  <LogOut className="w-6 h-6" />
                  {t('logout')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl text-lg font-bold text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 mt-4 border border-orange-500/10"
                >
                  <User className="w-6 h-6" />
                  Sign In / Register
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Custom Auth Modal state wrapper toggle */}
      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Scan className="w-6 h-6 text-orange-600" />
              <span className="font-bold text-lg">{config?.appName}</span>
            </div>
            <p className="text-neutral-500 text-sm max-w-xs transition-colors hover:text-neutral-400">
              {config?.tagline}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
             <a href={config?.creator?.portfolio} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white text-sm transition-colors">
               Creator: {config?.creator?.name}
             </a>
             <Link to="/about" className="text-neutral-400 hover:text-white text-sm">Policy & Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
