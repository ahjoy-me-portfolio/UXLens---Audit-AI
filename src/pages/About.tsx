import React, { useState } from 'react';
import { 
  Info, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
  Target, 
  ShieldCheck,
  Globe,
  Smartphone,
  Layout as LayoutIcon,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConfig } from '../hooks/useConfig';

export function About() {
  const { config } = useConfig();
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: { en: "How does UXLens AI work?", bn: "ইউএক্লেন্স এআই কিভাবে কাজ করে?" },
      a: { 
        en: "UXLens uses advanced Gemini AI models to analyze screenshots of websites or apps. It follows established design principles and accessibility standards to provide actionable feedback.",
        bn: "ইউএক্লেন্স উন্নত জেমিনি এআই মডেল ব্যবহার করে আপনার স্ক্রিনশট বিশ্লেষণ করে এবং ডিজাইনের নীতি অনুযায়ী ফিডব্যাক দেয়।"
      }
    },
    {
      q: { en: "What designs can I upload?", bn: "আমি কি ধরনের ডিজাইন আপলোড করতে পারি?" },
      a: { 
        en: "You can upload Landing Pages, Mobile Apps (iOS/Android), Dashboards, Forms, and E-commerce designs. It works best with high-resolution screenshots.",
        bn: "আপনি ল্যান্ডিং পেজ, মোবাইল অ্যাপ, ড্যাশবোর্ড এবং ই-কমার্স ডিজাইন আপলোড করতে পারেন।"
      }
    },
    {
      q: { en: "Is my design data secure?", bn: "আমার ডিজাইন কি নিরাপদ?" },
      a: { 
        en: "Yes, we prioritize your privacy. Uploaded images are used only for analysis and are not used for training models without your consent.",
        bn: "হ্যাঁ, আমরা আপনার গোপনীয়তাকে গুরুত্ব দিই।"
      }
    }
  ];

  const features = [
    { icon: LayoutIcon, t: { en: "UI Analysis", bn: "ইউআই বিশ্লেষণ" }, d: { en: "Deep dive into visual elements and hierarchy.", bn: "ভিজ্যুয়াল এলিমেন্ট এবং হায়ারার্কি বিশ্লেষণ।" } },
    { icon: Target, t: { en: "UX Strategy", bn: "ইউএক্স কৌশল" }, d: { en: "Actionable steps to improve user flow.", bn: "ইউজার ফ্লো উন্নত করার কার্যকর পদক্ষেপ।" } },
    { icon: Search, t: { en: "Accessibility", bn: "অ্যাক্সেসিবিলিটি" }, d: { en: "Ensure your designs are inclusive for everyone.", bn: "সবার জন্য ডিজাইন অন্তর্ভুক্তমূলক নিশ্চিত করা।" } },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-20 pb-20">
      {/* Header */}
      <section className="text-center space-y-6 pt-12">
        <div className="flex justify-center mb-4">
           <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === 'en' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('bn')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === 'bn' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}
              >
                বাংলা
              </button>
            </div>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black">{language === 'en' ? 'About The Tool' : 'টুলটি সম্পর্কে'}</h1>
        <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          {language === 'en' ? config?.about?.en : config?.about?.bn}
        </p>
      </section>

      {/* Categories */}
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center mx-auto text-orange-500">
               <f.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">{language === 'en' ? f.t.en : f.t.bn}</h3>
            <p className="text-neutral-500 text-sm">{language === 'en' ? f.d.en : f.d.bn}</p>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <HelpCircle className="w-8 h-8 text-orange-600" />
          <h2 className="text-3xl font-black">{language === 'en' ? 'FAQ' : 'প্রশ্ন এবং উত্তর'}</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900/30">
               <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-800/50 transition-colors"
               >
                 <span className="font-bold">{language === 'en' ? faq.q.en : faq.q.bn}</span>
                 {openFaq === i ? <ChevronUp /> : <ChevronDown />}
               </button>
               <AnimatePresence>
                 {openFaq === i && (
                   <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 text-neutral-400 text-sm leading-relaxed"
                   >
                     {language === 'en' ? faq.a.en : faq.a.bn}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Creator Profile - Protected Section */}
      <section className="relative overflow-hidden p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-br from-orange-600 to-orange-800 text-white group">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-48 h-48 rounded-3xl overflow-hidden border-8 border-white/10 shadow-2xl skew-x-1 group-hover:skew-x-0 transition-transform duration-500">
            <img src={config?.creator?.avatarUrl} alt="AH JOY" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500" />
          </div>
          
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div>
              <p className="text-orange-200 text-sm font-black uppercase tracking-widest mb-1">Meet the Creator</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{config?.creator?.name}</h2>
            </div>
            
            <p className="text-orange-100/80 text-lg leading-relaxed max-w-xl">
              A world-class Senior Product Designer & Full-Stack Engineer passionate about bridging the gap between aesthetics and functionality.
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
               <a 
                href={config?.creator?.portfolio} 
                target="_blank" 
                rel="noreferrer" 
                className="px-8 py-3 rounded-2xl bg-white text-orange-700 font-black flex items-center gap-2 hover:bg-neutral-100 shadow-xl transition-all active:scale-95"
               >
                 View Portfolio
                 <ExternalLink className="w-4 h-4" />
               </a>
               <div className="px-6 py-3 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 text-white font-bold text-sm">
                 SaaS Architect & Security Expert
               </div>
            </div>
          </div>
        </div>
        
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </section>
    </div>
  );
}
