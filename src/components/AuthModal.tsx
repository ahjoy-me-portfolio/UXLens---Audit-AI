import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  Chrome, 
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginAnonymously, 
  signInWithGoogle,
  updateUserDisplayName
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Global hook/trigger helper for clean decoupled state integration
export function triggerAuthModal() {
  window.dispatchEvent(new CustomEvent('open-auth-modal'));
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobileWebView, setIsMobileWebView] = useState(false);

  useEffect(() => {
    // Detect mobile WebView / APK environments
    const isMobile = !window.location.origin.startsWith('http') || 
                     window.location.origin.includes('localhost') || 
                     window.location.origin.includes('127.0.0.1');
    setIsMobileWebView(isMobile);
  }, []);

  // Reset states on open/close toggle
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all required fields.");
      return;
    }
    if (isSignUp && !fullName) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        await registerWithEmail(email, password);
        await updateUserDisplayName(fullName);
        setSuccess("Account created successfully! Welcome.");
      } else {
        await loginWithEmail(email, password);
        setSuccess("Logged in successfully!");
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      let errMsg = "An unexpected error occurred.";
      if (err.code === 'auth/email-already-in-use') {
        errMsg = "This email is already registered. Please sign in instead.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = "Invalid email or password. Please verify your credentials.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "The email address formatting is invalid.";
      } else {
        errMsg = err.message || errMsg;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      setSuccess("Logged in successfully with Google!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(
        isMobileWebView 
          ? "Google Popup is blocked inside APK WebView. Please use standard Email/Password Sign-In."
          : err.message || "Google Sign-In failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAnonymously();
      setSuccess("Logged in as Guest! Redirecting...");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Guest Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
      />

      {/* Main Container */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl overflow-hidden text-neutral-100 flex flex-col gap-6"
      >
        {/* Spark decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
              <Sparkles className="w-5 h-5 text-orange-500" />
            </h3>
            <p className="text-xs text-neutral-400">
              {isSignUp ? "Sign up to start saving and sharing audits" : "Sign in to save audits and manage settings"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-neutral-950/50 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form with unified layout */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-white placeholder:text-neutral-700"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-white placeholder:text-neutral-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type="password" 
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-white placeholder:text-neutral-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-orange-600 hover:bg-orange-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-6 shadow-lg shadow-orange-600/10 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                {isSignUp ? "Register Account" : "Sign In with Email"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-neutral-800 relative my-2">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900 px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">or continue with</span>
        </div>

        {/* Alternative Auth buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="h-12 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Chrome className="w-4 h-4 text-orange-500" />
            Google
          </button>

          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            type="button"
            className="h-12 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Guest/Anon
          </button>
        </div>

        {/* Mode Toggle footer */}
        <div className="text-center text-xs text-neutral-500">
          {isSignUp ? "Already have an account?" : "Don't have an email login yet?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-orange-500 font-bold hover:underline"
          >
            {isSignUp ? "Sign In Instead" : "Create Password Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
