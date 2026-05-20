import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { db } from '../lib/firebase';
import { triggerAuthModal } from '../components/AuthModal';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '../lib/image';

const DESIGN_TYPES = [
  "Landing Page", 
  "Mobile App (iOS)", 
  "Mobile App (Android)",
  "Dashboard/SaaS", 
  "Form/Checkout", 
  "E-Commerce",
  "Portfolio",
  "Other"
];

export function Home() {
  const { user, profile, t } = useAuth();
  const { config } = useConfig();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [designType, setDesignType] = useState(DESIGN_TYPES[0]);
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState<'en' | 'bn'>(
    (profile?.languagePreference as 'en' | 'bn') || 'en'
  );

  React.useEffect(() => {
    if (profile?.languagePreference) {
      setLanguage(profile.languagePreference as 'en' | 'bn');
    }
  }, [profile?.languagePreference]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large (Max 5MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Determine backend URL dynamically based on environment (with support for WebView/APK environments)
      let apiEndpoint = '/api/analyze';
      const isWebView = !window.location.origin.startsWith('http');

      if (isWebView) {
        if (config?.serverUrl) {
          const base = config.serverUrl.replace(/\/$/, "");
          apiEndpoint = `${base}/api/analyze`;
        } else {
          // Only use server fallback for non-web environments (apps, file://, etc.)
          apiEndpoint = 'https://ais-pre-jmrhyhvyturvrunupucp43-818821653045.asia-east1.run.app/api/analyze';
        }
      }

      console.log(`Connecting to analysis endpoint: ${apiEndpoint}`);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, designType, goal }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data.result);
      console.log("Analysis successful, preparing to save to history...");

      // Save to history if logged in
      if (user) {
        try {
          // Compress image for storage to stay under 1MB limit
          // We target a conservative size for storage
          const storageImage = await compressImage(image, 1000, 1000, 0.6);
          const newReport = {
            userId: user.uid,
            imageUrl: storageImage,
            imageName: `Analysis - ${new Date().toLocaleDateString()}`,
            feedback: data.result,
            isFavorite: false,
            designType
          };

          if (user.uid.startsWith('local_')) {
            const localSaved = JSON.parse(localStorage.getItem('local_reports') || '[]');
            const localReport = {
              id: 'local_rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              ...newReport,
              createdAt: new Date().toISOString()
            };
            localSaved.unshift(localReport);
            localStorage.setItem('local_reports', JSON.stringify(localSaved));
            console.log("Report saved to local storage successfully.");
          } else {
            await addDoc(collection(db, 'reports'), {
              ...newReport,
              createdAt: serverTimestamp()
            });
            console.log("Report saved to Cloud Firestore successfully.");
          }
        } catch (saveErr) {
          console.error("Failed to save report:", saveErr);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const parsedResult = result ? {
    en: result.split('---BENGALI_VERSION---')[0].replace('---ENGLISH_VERSION---', '').trim(),
    bn: result.split('---BENGALI_VERSION---')[1]?.trim()
  } : null;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-400 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered UX Audit</span>
        </motion.div>
        
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-tight"
          >
            {language === 'bn' ? 'সেকেন্ডের মধ্যে বিশেষজ্ঞ ইউআই/ইউএক্স ফিডব্যাক' : (config?.homepage?.heroTitle || 'Expert UI/UX Feedback in Seconds')}
          </motion.h1>
        
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto"
          >
            {language === 'bn' 
              ? 'বিশ্বসেরা ক্রিয়েটিভ ডিরেক্টরদের শক্তি দিয়ে আপনার ডিজাইনগুলি বিশ্লেষণ করুন।' 
              : (config?.homepage?.heroSubtitle || 'Analyze your designs with the power of world-class creative directors.')}
          </motion.p>
      </section>

      {/* Main Tool */}
      <section className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Left: Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-8"
        >
          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 overflow-hidden ${
              image ? 'border-orange-600' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/30'
            }`}
          >
            {image ? (
              <>
                <img src={image} alt="Upload" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm group-hover:blur-0 transition-all" />
                <div className="relative z-10 bg-neutral-950/80 p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/10 backdrop-blur-sm">
                  <CheckCircle2 className="w-8 h-8 text-orange-500" />
                  <span className="text-sm font-medium">Click to change image</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-neutral-400 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Drop image or click to upload</p>
                  <p className="text-xs text-neutral-500 mt-1">Supports PNG, JPG, WebP (Max 5MB)</p>
                </div>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2 uppercase tracking-wider">Design Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DESIGN_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setDesignType(type)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      designType === type 
                        ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2 uppercase tracking-wider">What is your goal? (Optional)</label>
              <textarea 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Help me improve the conversion rate of this landing page..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all placeholder:text-neutral-700 resize-none h-24"
              />
            </div>

            {!user && (
              <div className="p-4 rounded-2xl bg-orange-600/5 border border-orange-600/10 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-400">
                  <button onClick={triggerAuthModal} className="text-orange-500 font-bold hover:underline">Sign in</button> to save this analysis to your history and favorites.
                </p>
              </div>
            )}

            <button
              onClick={startAnalysis}
              disabled={!image || analyzing}
              className={`w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                !image || analyzing
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xl shadow-orange-600/20 active:scale-[0.98]'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>{language === 'bn' ? 'অ্যানালাইসিস করা হচ্ছে...' : 'Analyzing Design...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{language === 'bn' ? 'পেশাদার ফিডব্যাক পান' : 'Get Professional Feedback'}</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right: Output */}
        <div className="space-y-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-display"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
                {error.includes("UNAVAILABLE") || error.includes("high demand") || error.includes("503") ? (
                  <button 
                    onClick={startAnalysis}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all uppercase tracking-widest"
                  >
                    Retry Analysis
                  </button>
                ) : null}
              </motion.div>
            )}

            {analyzing ? (
              <motion.div
                key="analyzing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[400px] text-center space-y-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-orange-600/20 border-t-orange-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold">Lensy is thinking...</h3>
                <p className="text-neutral-500 max-w-xs">Our AI Creative Director is busy auditing layout, hierarchy, and accessibility.</p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result-display"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl "
              >
                {/* Result Header */}
                <div className="p-6 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
                  {/* ... rest of result header ... */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">The Lensy Audit</h3>
                      <p className="text-xs text-neutral-500">Professional UI/UX Feedback</p>
                    </div>
                  </div>
                  
                  <div className="flex bg-neutral-800 rounded-xl p-1">
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setLanguage('bn')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'bn' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>

                {/* Result Content */}
                <div className="p-8 prose prose-invert prose-neutral max-w-none">
                  <div className="markdown-body">
                    <ReactMarkdown>{language === 'en' ? (parsedResult?.en || "") : (parsedResult?.bn || "")}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ) : !error ? (
              <motion.div
                key="placeholder-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-neutral-800 rounded-3xl text-neutral-600"
              >
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>Upload a screenshot on the left to see the audit results.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      {/* Dynamic Features Section */}
      {config?.homepage?.features && config.homepage.features.length > 0 && (
        <section className="pt-20 border-t border-neutral-900">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black mb-4">Why Designers Love Lensy</h2>
            <p className="text-neutral-500">Get better feedback than your lead designer, in a fraction of the time.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.homepage.features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-neutral-900/30 border border-neutral-800 hover:border-orange-600/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">Systematic auditing based on modern SaaS and design standards.</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
