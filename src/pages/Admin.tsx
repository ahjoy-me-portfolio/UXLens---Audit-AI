import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Settings, 
  Layout as LayoutIcon, 
  Key, 
  Save, 
  RefreshCw,
  Globe,
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Lock,
  Upload,
  User,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useConfig, AppConfig } from '../hooks/useConfig';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { SecurityConfig } from '../types';
import { compressImage } from '../lib/image';

export function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const [activeTab, setActiveTab] = useState<'content' | 'security'>('content');
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [secConfig, setSecConfig] = useState<SecurityConfig>({
    geminiApiKey: '',
    modelName: 'gemini-3.5-flash',
    temperature: 0.4,
    maxTokens: 2048
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{t:'s'|'e', m:string} | null>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(() => {
    return sessionStorage.getItem('admin_pin_verified') === 'true';
  });
  const [showPinError, setShowPinError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    getDoc(doc(db, 'security', 'config'))
      .then(d => {
        if (d.exists()) {
          const data = d.data() as SecurityConfig;
          setSecConfig(data);
          // If no PIN is set, verify immediately
          if (!data.adminPin) setIsPinVerified(true);
        } else {
          // No config exists yet, default to requiring PIN setup
          setIsPinVerified(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch security config from Firestore. Using local fallback or defaults.", err);
        const saved = localStorage.getItem('local_security_config');
        if (saved) {
          try {
            setSecConfig(JSON.parse(saved));
          } catch (e) {}
        } else {
          setSecConfig({
            geminiApiKey: '',
            modelName: 'gemini-3.5-flash',
            temperature: 0.4,
            maxTokens: 2048,
            adminPin: '1234'
          });
        }
      });
  }, [isAdmin]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && localConfig) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 400, 400, 0.8);
          setLocalConfig({
            ...localConfig,
            creator: { ...localConfig.creator!, avatarUrl: compressed }
          });
        } catch (err) {
          console.error("Image compression failed:", err);
          setLocalConfig({
            ...localConfig,
            creator: { ...localConfig.creator!, avatarUrl: reader.result as string }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (authLoading || configLoading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

  // PIN Verification Overlay
  if (secConfig.adminPin && !isPinVerified) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 flex shadow-2xl items-center justify-center p-4 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 rounded-[3rem] p-10 text-center space-y-8 relative backdrop-blur-md"
        >
          {/* Close button */}
          <button 
            onClick={() => navigate('/')}
            className="absolute top-8 right-8 p-3 rounded-full bg-neutral-800/50 text-neutral-400 hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <Plus className="w-6 h-6 rotate-45" />
          </button>

          <div className="w-24 h-24 bg-red-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-red-600/40 relative">
             <div className="absolute inset-0 bg-red-600 rounded-[2rem] animate-pulse" />
             <Lock className="w-12 h-12 text-white relative z-10" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black text-white tracking-tight">Access Gate</h2>
            <p className="text-neutral-500 font-medium">Please verify your identity to access the Control Center.</p>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <input 
                type="password"
                value={pinEntry}
                onChange={(e) => {
                  setPinEntry(e.target.value);
                  setShowPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') navigate('/');
                  if (e.key === 'Enter') {
                     if (String(pinEntry).trim() === String(secConfig.adminPin).trim()) {
                       setIsPinVerified(true);
                       sessionStorage.setItem('admin_pin_verified', 'true');
                       // Also elevate local sandbox guest to admin if using local session!
                       if (localStorage.getItem('local_auth_user')) {
                         const cachedProfile = JSON.parse(localStorage.getItem('local_user_profile') || '{}');
                         cachedProfile.role = 'admin';
                         localStorage.setItem('local_user_profile', JSON.stringify(cachedProfile));
                         window.dispatchEvent(new CustomEvent('local-profile-updated', { detail: cachedProfile }));
                       }
                     } else {
                       setShowPinError(true);
                       setPinEntry('');
                     }
                  }
                }}
                placeholder="••••"
                className="w-full bg-neutral-950/50 border-2 border-neutral-800 rounded-3xl p-6 text-center text-4xl font-mono tracking-[0.5em] outline-none focus:border-red-600 transition-all text-white placeholder:text-neutral-900 group-hover:border-neutral-700"
                autoFocus
              />
            </div>

            <AnimatePresence>
              {showPinError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 py-3 rounded-2xl"
                >
                   <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Authentication Failed</p>
                   <p className="text-red-400/60 text-[9px]">Check your secret key and try again.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (String(pinEntry).trim() === String(secConfig.adminPin).trim()) {
                    setIsPinVerified(true);
                    sessionStorage.setItem('admin_pin_verified', 'true');
                    // Also elevate local sandbox guest to admin if using local session!
                    if (localStorage.getItem('local_auth_user')) {
                      const cachedProfile = JSON.parse(localStorage.getItem('local_user_profile') || '{}');
                      cachedProfile.role = 'admin';
                      localStorage.setItem('local_user_profile', JSON.stringify(cachedProfile));
                      window.dispatchEvent(new CustomEvent('local-profile-updated', { detail: cachedProfile }));
                    }
                  } else {
                    setShowPinError(true);
                    setPinEntry('');
                  }
                }}
                className="w-full h-16 bg-white text-black rounded-3xl font-black text-lg hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
              >
                Access Terminal
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="w-full h-12 bg-neutral-900 text-neutral-500 rounded-2xl font-bold text-sm hover:text-white transition-all"
              >
                Return to Dashboard
              </button>
            </div>
            
            <p className="text-[10px] text-neutral-700 uppercase tracking-[0.2em] font-black pt-2">
              Encrypted Channel • AH JOY Admin v2
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Backup check: Only block if they entered neither a valid PIN nor are labeled isAdmin
  if (!isAdmin && !isPinVerified) {
    return <div className="py-20 text-center text-red-500 font-bold p-10 bg-red-50 rounded-3xl mx-4 my-20 border-2 border-red-100">Access Denied. You are not AH JOY.</div>;
  }

  const saveContent = async () => {
    if (!localConfig) return;
    setSaving(true);
    try {
      const isCreatorSuperAdmin = user?.email?.toLowerCase() === 'ahjoy.me@gmail.com';
      const finalConfig = { ...localConfig };
      if (!isCreatorSuperAdmin) {
        // Enforce fallback lock on creator profile database entries so other admins can't corrupt it
        finalConfig.creator = {
          name: "AH JOY",
          portfolio: "https://ahjoy.framer.website/",
          avatarUrl: "/input_file_2.png"
        };
      }
      await setDoc(doc(db, 'appConfig', 'main'), finalConfig);
      setMessage({ t: 's', m: 'Content updated successfully!' });
    } catch (e: any) {
      setMessage({ t: 'e', m: e.message });
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    setSaving(true);
    try {
      localStorage.setItem('local_security_config', JSON.stringify(secConfig));
      await setDoc(doc(db, 'security', 'config'), secConfig);
      setMessage({ t: 's', m: 'Security configuration saved to Firestore and local storage!' });
    } catch (e: any) {
      setMessage({ t: 'e', m: e.message + ' (Saved locally as fallback)' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 px-4 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Admin Panel</h1>
            <p className="text-neutral-500 text-sm">Welcome back, AH JOY. Manage your empire.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 overflow-x-auto">
           <button 
             onClick={() => setActiveTab('content')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
               activeTab === 'content' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'
             }`}
           >
             <LayoutIcon className="w-4 h-4" />
             Content
           </button>
           <button 
             onClick={() => setActiveTab('security')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
               activeTab === 'security' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'
             }`}
           >
             <Key className="w-4 h-4" />
             Security
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border ${
              message.t === 's' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {message.t === 's' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            <span className="font-bold">{message.m}</span>
            <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-12">
        {activeTab === 'content' && localConfig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
            {/* General Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 sm:p-10 space-y-8 overflow-hidden">
              <h3 className="text-xl font-black border-b border-neutral-800 pb-4 text-white">General Brand Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">App Name</label>
                  <input 
                    type="text" 
                    value={localConfig.appName}
                    onChange={(e) => setLocalConfig({...localConfig, appName: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Logo Text</label>
                  <input 
                    type="text" 
                    value={localConfig.logoText}
                    onChange={(e) => setLocalConfig({...localConfig, logoText: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">App Tagline</label>
                  <input 
                    type="text" 
                    value={localConfig.tagline}
                    onChange={(e) => setLocalConfig({...localConfig, tagline: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Backend Production Server URL (For APK/Mobile Compatibility)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. https://uxlens-ai.netlify.app"
                    value={localConfig.serverUrl || ''}
                    onChange={(e) => setLocalConfig({...localConfig, serverUrl: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                  <p className="text-xs text-neutral-500 px-1 mt-1">When running as a mobile APK, the app uses this backend URL to process screenshot audits. Standard web deployments will automatically detect this.</p>
                </div>
              </div>
            </div>

            {/* Homepage Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 sm:p-10 space-y-8 overflow-hidden">
              <h3 className="text-xl font-black border-b border-neutral-800 pb-4 text-white">Homepage Editor</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Hero Title</label>
                  <input 
                    type="text" 
                    value={localConfig.homepage?.heroTitle}
                    onChange={(e) => setLocalConfig({...localConfig, homepage: {...localConfig.homepage, heroTitle: e.target.value}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Hero Subtitle</label>
                  <textarea 
                    value={localConfig.homepage?.heroSubtitle}
                    onChange={(e) => setLocalConfig({...localConfig, homepage: {...localConfig.homepage, heroSubtitle: e.target.value}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 resize-none h-24 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Features (One per line)</label>
                  <textarea 
                    value={localConfig.homepage?.features?.join('\n')}
                    onChange={(e) => setLocalConfig({...localConfig, homepage: {...localConfig.homepage, features: e.target.value.split('\n').filter(f => f.trim())}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 resize-none h-40 text-white"
                    placeholder="Visual Hierarchy Analysis..."
                  />
                </div>
              </div>
            </div>

            {/* About & Social Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 sm:p-10 space-y-8 overflow-hidden">
              <h3 className="text-xl font-black border-b border-neutral-800 pb-4 text-white">About & Social Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">About (English)</label>
                  <textarea 
                    value={localConfig.about?.en}
                    onChange={(e) => setLocalConfig({...localConfig, about: {...localConfig.about!, en: e.target.value}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 resize-none h-32 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">About (Bengali)</label>
                  <textarea 
                    value={localConfig.about?.bn}
                    onChange={(e) => setLocalConfig({...localConfig, about: {...localConfig.about!, bn: e.target.value}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 resize-none h-32 font-['Hind_Siliguri'] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Contact Email</label>
                  <input 
                    type="email" 
                    value={localConfig.contact?.email}
                    onChange={(e) => setLocalConfig({...localConfig, contact: {...localConfig.contact!, email: e.target.value}})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Creator Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 sm:p-10 space-y-8 overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                   </div>
                   <h3 className="text-xl font-black text-white">Creator Profile (Personalize)</h3>
                </div>
                {user?.email?.toLowerCase() === 'ahjoy.me@gmail.com' ? (
                  <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase">Owner access authorized</span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Immutable Profile
                  </span>
                )}
              </div>
              
              {user?.email?.toLowerCase() !== 'ahjoy.me@gmail.com' && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400">
                  This creator profile is pinned to the original creator (<strong>AH JOY</strong>). Only super admins can update creator information.
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Creator Name</label>
                    <input 
                      type="text" 
                      value={localConfig.creator?.name}
                      disabled={user?.email?.toLowerCase() !== 'ahjoy.me@gmail.com'}
                      onChange={(e) => setLocalConfig({...localConfig, creator: {...localConfig.creator!, name: e.target.value}})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-orange-600 text-white disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Portfolio Link</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={localConfig.creator?.portfolio}
                        disabled={user?.email?.toLowerCase() !== 'ahjoy.me@gmail.com'}
                        onChange={(e) => setLocalConfig({...localConfig, creator: {...localConfig.creator!, portfolio: e.target.value}})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 pr-12 outline-none focus:ring-1 focus:ring-orange-600 text-white disabled:opacity-50"
                      />
                      <ExternalLink className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Profile Photo</label>
                  <div className="flex flex-col items-center gap-6 p-6 bg-neutral-950/50 border-2 border-dashed border-neutral-800 rounded-[2rem]">
                    <div className="w-32 h-32 rounded-full border-4 border-neutral-800 overflow-hidden bg-neutral-900 flex items-center justify-center group relative">
                      {localConfig.creator?.avatarUrl ? (
                         <>
                           <img src={localConfig.creator.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                           {user?.email?.toLowerCase() === 'ahjoy.me@gmail.com' && (
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-white animate-bounce" />
                             </div>
                           )}
                         </>
                      ) : (
                         <User className="w-12 h-12 text-neutral-700" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 w-full">
                       {user?.email?.toLowerCase() === 'ahjoy.me@gmail.com' ? (
                         <>
                           <label className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 text-white font-black rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-95">
                              <Upload className="w-4 h-4" />
                              Upload from Device
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                           </label>
                           <p className="text-[10px] text-neutral-600 text-center">Image is stored securely in your private cloud config.</p>
                         </>
                       ) : (
                         <p className="text-xs text-neutral-500 text-center py-2 font-bold bg-neutral-900 rounded-xl border border-neutral-800">Photo modification locked.</p>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <button
               onClick={saveContent}
               disabled={saving}
               className="w-full h-16 rounded-[1.5rem] bg-orange-600 hover:bg-orange-500 text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all sticky bottom-4 z-10"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
              Save All Content Changes
            </button>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                 <h3 className="text-xl font-black text-red-500">AI Model & Security</h3>
                 <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase">Restricted Access</div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    Master GEMINI API Key 
                    <span className="text-[10px] text-neutral-700">(Stored in Firestore Security Config)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={secConfig.geminiApiKey}
                      onChange={(e) => setSecConfig({...secConfig, geminiApiKey: e.target.value})}
                      placeholder="AIza..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-red-600 font-mono text-sm"
                    />
                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    Admin Access PIN
                    <span className="text-[10px] text-neutral-700">(Currently: {secConfig.adminPin || 'Disabled'})</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={secConfig.adminPin || ''}
                      onChange={(e) => setSecConfig({...secConfig, adminPin: e.target.value})}
                      placeholder="e.g. 1234"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-red-600 font-mono text-sm text-white"
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-800" />
                  </div>
                  <p className="text-[10px] text-neutral-600 px-1">This PIN is required every time you access and perform admin actions.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Model Index (Experimental)</label>
                    <select 
                      value={secConfig.modelName}
                      onChange={(e) => setSecConfig({...secConfig, modelName: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 outline-none focus:ring-1 focus:ring-red-600 text-sm"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Heavy)</option>
                      <option value="gemini-flash-latest">Gemini Flash Latest</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Temperature ({secConfig.temperature})</label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1"
                      value={secConfig.temperature}
                      onChange={(e) => setSecConfig({...secConfig, temperature: parseFloat(e.target.value)})}
                      className="w-full accent-red-600 mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
               onClick={saveSecurity}
               disabled={saving}
               className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-red-600/20 active:scale-95 transition-all"
            >
              {saving ? <Loader2 className="animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
              Update AI & Security Infrastructure
            </button>

            <div className="p-6 rounded-2xl bg-red-600/5 border border-red-600/20 space-y-2 text-sm text-red-300">
               <p className="font-bold flex items-center gap-2 underline">Important Note:</p>
               <p>Changing these settings will take effect immediately for all users. The API key is proxied through the server and never exposed to the client.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
