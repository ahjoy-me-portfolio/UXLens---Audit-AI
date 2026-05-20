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

  const enterSandboxMode = () => {
    localStorage.setItem('local_auth_user', JSON.stringify({
      uid: 'local_user_' + Math.random().toString(36).substr(2, 9),
      email: email || 'local@uxlens.local',
      displayName: fullName || 'Local Designer',
      photoURL: '',
      isAnonymous: false
    }));
    localStorage.setItem('local_user_profile', JSON.stringify({
      fullName: fullName || 'Local Designer',
      email: email || 'local@uxlens.local',
      role: 'user',
      createdAt: new Date().toISOString(),
      languagePreference: 'en',
      darkMode: true,
      notifications: true
    }));
    
    setSuccess("🔒 Local Sandbox Mode activated! Redirecting...");
    setError(null);
    window.dispatchEvent(new Event('local-login'));
    setTimeout(() => {
      onClose();
    }, 1500);
  };

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
      const isConfigError = err.code === 'auth/operation-not-allowed' || 
                           err.message?.includes('operation-not-allowed') || 
                           err.code === 'auth/admin-restricted-operation' || 
                           err.message?.includes('admin-restricted-operation');

      if (isConfigError) {
        enterSandboxMode();
        return;
      }

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
      const isConfigError = err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed');
      if (isConfigError) {
        localStorage.setItem('local_auth_user', JSON.stringify({
          uid: 'local_user_' + Math.random().toString(36).substr(2, 9),
          email: 'google@uxlens.local',
          displayName: 'Google Partner',
          photoURL: '',
          isAnonymous: false
        }));
        localStorage.setItem('local_user_profile', JSON.stringify({
          fullName: 'Google Partner',
          email: 'google@uxlens.local',
          role: 'user',
          createdAt: new Date().toISOString(),
          languagePreference: 'en',
          darkMode: true,
          notifications: true
        }));
        setSuccess("Google Sign-In is not enabled on Firebase. Starting Local Sandbox session!");
        window.dispatchEvent(new Event('local-login'));
        setTimeout(() => {
          onClose();
        }, 2000);
        return;
      }
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
      console.warn("Firebase Guest auth failed, falling back to local guest user:", err);
      localStorage.setItem('local_auth_user', JSON.stringify({
        uid: 'local_guest_' + Math.random().toString(36).substr(2, 9),
        email: 'guest@uxlens.local',
        displayName: 'Guest Designer',
        photoURL: '',
        isAnonymous: true
      }));
      localStorage.setItem('local_user_profile', JSON.stringify({
        fullName: 'Guest Designer',
        email: 'guest@uxlens.local',
        role: 'user',
        createdAt: new Date().toISOString(),
        languagePreference: 'en',
        darkMode: true,
        notifications: true
      }));
      
      setSuccess("Local Guest Sandbox Session Enabled! Redirecting...");
      window.dispatchEvent(new Event('local-login'));
      setTimeout(() => {
        onClose();
      }, 1500);
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
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex flex-col gap-2.5"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 font-bold" />
                <span>{error}</span>
              </div>
              {String(error).includes("already") && (
                <div className="flex items-center gap-2 pt-2 border-t border-red-500/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError(null);
                    }}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all font-bold text-[10px] text-white cursor-pointer"
                  >
                    Switch to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={enterSandboxMode}
                    className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/20 rounded-lg transition-all font-bold text-[10px] text-orange-400 cursor-pointer"
                  >
                    Instant Sandbox Mode
                  </button>
                </div>
              )}
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
                    className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-neutral-100 placeholder:text-neutral-500"
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
                className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-neutral-100 placeholder:text-neutral-500"
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
                className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-orange-600 transition-all text-neutral-100 placeholder:text-neutral-500"
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
            className="h-12 bg-neutral-950 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 text-neutral-200 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            type="button"
            className="h-12 bg-neutral-950 hover:bg-neutral-800 border-2 border-dashed border-orange-500/30 hover:border-orange-500/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 text-neutral-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            Guest Mode
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
