
export const translations = {
  en: {
    analyze: "Analyze",
    history: "History",
    about: "About",
    profile: "Profile",
    logout: "Logout",
    audit_tool: "AI-Powered UI/UX Audit",
    upload_cta: "Drop screenshot to start deep audit",
    recent_audits: "Recent Audits",
    preferences: "Preferences",
    danger_zone: "Danger Zone",
    full_name: "Full Name",
    email: "Email Address",
    job_title: "Job Title",
    bio: "Bio",
    account_role: "Account Role",
    current_plan: "Current Plan",
    download: "Download PDF"
  },
  bn: {
    analyze: "অ্যানালাইজ",
    history: "ইতিহাস",
    about: "সম্পর্কে",
    profile: "প্রোফাইল",
    logout: "লগআউট",
    audit_tool: "এআই-চালিত ইউআই/ইউএক্স অডিট",
    upload_cta: "গভীর অডিট শুরু করতে স্ক্রিনশট এখানে নিয়ে আসুন",
    recent_audits: "সাম্প্রতিক অডিট",
    preferences: "পছন্দসমূহ",
    danger_zone: "বিপজ্জনক জোন",
    full_name: "পুরো নাম",
    email: "ইমেইল ঠিকানা",
    job_title: "জব টাইটেল",
    bio: "বায়ো",
    account_role: "অ্যাকাউন্ট রোল",
    current_plan: "বর্তমান প্ল্যান",
    download: "পিডিএফ ডাউনলোড"
  }
};

export type Language = keyof typeof translations;

export function useTranslation(lang: Language = 'en') {
  const t = (key: keyof typeof translations['en']) => {
    return translations[lang][key] || translations['en'][key];
  };
  return { t };
}
