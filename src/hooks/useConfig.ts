import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AppConfig {
  appName: string;
  tagline: string;
  logoUrl?: string;
  logoText?: string;
  homepage?: {
    heroTitle?: string;
    heroSubtitle?: string;
    description?: string;
    features?: string[];
  };
  about?: {
    en: string;
    bn: string;
    faqs?: { q: string, a: string }[];
  };
  creator?: {
    name: string;
    portfolio: string;
    avatarUrl: string;
  };
  contact?: {
    email: string;
  };
  socialLinks?: Record<string, string>;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: "UXLens AI",
  tagline: "Upload any design. Get instant professional UI/UX feedback.",
  logoText: "UXLens",
  homepage: {
    heroTitle: "Expert UI/UX Feedback in Seconds",
    heroSubtitle: "Analyze your designs with the power of world-class creative directors.",
    description: "UXLens AI analyzes website, mobile app, dashboard, and UI design screenshots and provides professional UI/UX critique.",
    features: [
      "Visual Hierarchy Analysis",
      "Accessibility & Inclusion Audit",
      "Microcopy & UX Writing Critique",
      "Layout & Spacing Optimization"
    ]
  },
  about: {
    en: "UXLens AI is specialized tool for designers.",
    bn: "ইউএক্লেন্স এআই একটি বিশেষজ্ঞ সরঞ্জাম।"
  },
  creator: {
    name: "AH JOY",
    portfolio: "https://ahjoy.framer.website/",
    avatarUrl: "/input_file_2.png" // Using the uploaded image as default
  }
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'appConfig', 'main');
    
    // Initial fetch to seed if missing
    getDoc(docRef).then(async (d) => {
      try {
        if (!d.exists()) {
          console.log('Seeding initial app config...');
          await setDoc(docRef, DEFAULT_CONFIG);
          setConfig(DEFAULT_CONFIG);
        }
      } catch (e) {
        console.warn('Initial config fetch/seed failed (likely permission issue or network):', e);
      }
    });

    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as AppConfig);
      }
      setLoading(false);
    }, (err) => {
      console.error('Config snapshot error:', err);
      setLoading(false);
    });
  }, []);

  return { config, loading };
}
