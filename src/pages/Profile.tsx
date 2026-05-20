import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Settings, 
  Bell, 
  ShieldCheck, 
  Trash2, 
  CreditCard, 
  Star,
  Globe,
  Moon,
  Smartphone,
  LogOut,
  Loader2,
  ShieldAlert,
  ChevronRight,
  Camera,
  Edit2,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { db, logout } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { compressImage } from '../lib/image';

export function Profile() {
  const { user, profile: globalProfile, t } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(globalProfile);
  const [loading, setLoading] = useState(!globalProfile);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalProfile) {
      setProfile(globalProfile);
      setLoading(false);
    }
  }, [globalProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSaving(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 400, 400, 0.8);
          await updateProfile({ avatarUrl: compressed });
        } catch (err) {
          console.error("Compression failed:", err);
          await updateProfile({ avatarUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const startEditing = (key: string) => {
    setEditingField(key);
    // Use actual profile value without placeholders for editing
    setEditValue((profile as any)[key] || "");
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      title: t('account_role'),
      icon: User,
      fields: [
        { label: t('full_name'), value: profile.fullName, editable: !user?.isAnonymous, key: 'fullName' },
        { label: t('job_title'), value: profile.jobTitle || "Not set", editable: !user?.isAnonymous, key: 'jobTitle' },
        { label: t('bio'), value: profile.bio || "No bio yet", editable: !user?.isAnonymous, key: 'bio' },
        { label: t('email'), value: user?.isAnonymous ? "Temporary Guest" : profile.email, editable: false },
        { label: t('account_role'), value: user?.isAnonymous ? "Guest" : profile.role, editable: false },
      ]
    },
    {
      title: t('current_plan'),
      icon: CreditCard,
      fields: [
        { label: t('current_plan'), value: profile.subscriptionPlan || "Free Tier", editable: false },
      ]
    },
    {
      title: t('preferences'),
      icon: Settings,
      toggles: [
        { label: "Dark Mode", value: profile.darkMode ?? true, key: 'darkMode', icon: Moon },
        { label: "Push Notifications", value: profile.notifications ?? true, key: 'notifications', icon: Bell },
      ],
      selects: [
        { label: "Language", value: profile.languagePreference || 'en', key: 'languagePreference', icon: Globe, options: [{l:'English', v:'en'}, {l:'Bengali', v:'bn'}] }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-600/20 shadow-2xl transition-transform group-hover:scale-105">
            <img 
              src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullName}&background=ea580c&color=fff`} 
              alt="" 
              className={`w-full h-full object-cover ${saving ? 'opacity-50' : ''}`} 
            />
          </div>
          <button 
            onClick={handleAvatarClick}
            disabled={saving}
            className="absolute -bottom-2 -right-2 bg-orange-600 p-2 rounded-xl shadow-lg border border-white/10 hover:bg-orange-500 transition-colors z-10"
          >
            {saving && editingField === null ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*" 
          />
        </div>
        <div>
          <h1 className="text-3xl font-black">{profile.fullName}</h1>
          {profile.jobTitle && (
            <p className="text-orange-500 font-bold text-sm uppercase tracking-tighter mb-1">{profile.jobTitle}</p>
          )}
          <p className="text-neutral-500 font-medium">{profile.email}</p>
        </div>
        
        <div className="flex gap-2">
          <span className="px-4 py-1 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-400 text-xs font-black uppercase tracking-wider">
            {profile.subscriptionPlan || 'Beta Access'}
          </span>
          {profile.role === 'admin' && (
            <span className="px-4 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-black uppercase tracking-wider">
              Creator Admin
            </span>
          )}
        </div>
      </div>

      {user?.isAnonymous && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[2rem] bg-orange-600/5 border-2 border-dashed border-orange-500/20 flex flex-col sm:flex-row items-center gap-6 justify-between text-neutral-100"
        >
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-black text-white flex items-center gap-2 justify-center sm:justify-start">
              <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
              Temporary Guest Session Enabled
            </h4>
            <p className="text-xs text-neutral-400">
              You are signed in as a guest. To securely store your audits, histories, and custom settings permanently, upgrade to an account.
            </p>
            <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-tight">
              (অতিথি সেশনে আছেন। অডিট রিপোর্ট সুরক্ষিত রাখতে অনুগ্রহ করে ইমেল অ্যাকাউন্ট কানেক্ট করুন।)
            </p>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
            className="h-10 px-5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl shrink-0 transition-all active:scale-95 shadow-md hover:scale-105"
          >
            Create Permanent Account
          </button>
        </motion.div>
      )}

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <section.icon className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold uppercase tracking-widest text-xs text-neutral-400">{section.title}</h3>
            </div>

            <div className="space-y-4">
               {section.fields?.map((field, fIdx) => (
                 <div key={fIdx} className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">{field.label}</label>
                    <div className="flex items-center justify-between min-h-[2.5rem]">
                      {editingField === field.key ? (
                        <div className="flex items-center gap-2 w-full">
                          <input 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateProfile({ [field.key as string]: editValue });
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="bg-neutral-800 border border-orange-600/50 rounded-xl px-3 py-2 text-sm text-neutral-200 outline-none w-full"
                          />
                          <button 
                            disabled={saving}
                            onClick={() => updateProfile({ [field.key as string]: editValue })}
                            className="p-2 bg-orange-600 rounded-xl text-white hover:bg-orange-500 disabled:opacity-50"
                          >
                            {saving && editingField === field.key ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button 
                            onClick={() => setEditingField(null)}
                            className="p-2 bg-neutral-800 rounded-xl text-neutral-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-neutral-300">{field.value}</span>
                          {field.editable && (
                            <button 
                              onClick={() => startEditing(field.key!)}
                              className="p-2 text-neutral-500 hover:text-orange-500 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                 </div>
               ))}

               {section.toggles?.map((toggle, tIdx) => (
                 <div key={tIdx} className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                     <toggle.icon className="w-4 h-4 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                     <span className="text-sm font-medium text-neutral-300">{toggle.label}</span>
                   </div>
                   <button 
                    disabled={saving}
                    onClick={() => updateProfile({ [toggle.key]: !toggle.value })}
                    className={`w-12 h-6 rounded-full transition-all relative ${toggle.value ? 'bg-orange-600' : 'bg-neutral-800'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${toggle.value ? 'translate-x-7' : 'translate-x-1'}`} />
                   </button>
                 </div>
               ))}

               {section.selects?.map((select, sIdx) => (
                 <div key={sIdx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <select.icon className="w-4 h-4 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                      <span className="text-sm font-medium text-neutral-300">{select.label}</span>
                    </div>
                    <select 
                      value={select.value}
                      disabled={saving}
                      onChange={(e) => updateProfile({ [select.key]: e.target.value })}
                      className="bg-neutral-800 border border-neutral-700/50 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-200 outline-none focus:ring-2 focus:ring-orange-600/50 transition-all cursor-pointer appearance-none min-w-[100px] text-center uppercase tracking-wider"
                    >
                      {select.options.map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                    </select>
                 </div>
               ))}
            </div>
          </motion.div>
        ))}

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6"
        >
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 text-red-500">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-widest text-xs">{t('danger_zone')}</h3>
          </div>
          
          <div className="space-y-4">
             <button
              onClick={() => logout()}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all group"
             >
               <span className="text-sm font-bold">Log out from device</span>
               <LogOut className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors" />
             </button>

             <button
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all group"
             >
               <span className="text-sm font-bold text-red-500">Delete Account</span>
               <Trash2 className="w-5 h-5 text-red-500" />
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
