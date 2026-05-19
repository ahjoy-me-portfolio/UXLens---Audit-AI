import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon,
  Search,
  Calendar,
  ChevronRight,
  Star,
  Trash2,
  FileText,
  Loader2,
  Download,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { AnalysisReport } from '../types';

export function History() {
  const { user, t } = useAuth();
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  const downloadPDF = async (report: AnalysisReport) => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Create a temporary hidden container for clean export
      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'absolute';
      exportContainer.style.left = '-9999px';
      exportContainer.style.top = '0';
      exportContainer.style.width = '800px';
      exportContainer.style.backgroundColor = '#ffffff';
      exportContainer.style.color = '#1a1a1a';
      exportContainer.style.fontFamily = '"Inter", "Segoe UI", Roboto, sans-serif';
      
      const result = getParsedResult(report);
      const rawContent = language === 'en' ? result.en : result.bn;
      
      // Clean up markdown for display
      const formattedContent = rawContent
        .replace(/### (.*)/g, '<h3 style="color: #ea580c; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: 800; border-bottom: 1px solid #f3f4f6; pb-2;">$1</h3>')
        .replace(/## (.*)/g, '<h2 style="color: #111827; font-size: 22px; margin-top: 30px; margin-bottom: 15px; font-weight: 900;">$1</h2>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #111827;">$1</strong>')
        .replace(/^- (.*)/gm, '<li style="margin-bottom: 8px; padding-left: 5px;">$1</li>')
        .split('\n\n').map(p => p.trim().startsWith('<h') || p.trim().startsWith('<li') ? p : `<p style="margin-bottom: 15px; line-height: 1.6;">${p}</p>`).join('');

      exportContainer.innerHTML = `
        <!-- Header -->
        <div style="background: #0a0a0a; padding: 40px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
            <div>
              <h1 style="font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -0.02em;">UXLens <span style="color: #ea580c;">AI</span></h1>
              <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Professional UI/UX Audit Report</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #9ca3af;">REPORT ID</div>
              <div style="font-size: 14px; font-weight: 700; font-family: monospace; color: #ea580c;">#${report.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
             <div style="display: flex; flex-direction: column; justify-content: center;">
                <div style="margin-bottom: 20px;">
                  <label style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase;">Design Name</label>
                  <div style="font-size: 20px; font-weight: 700;">${report.imageName}</div>
                </div>
                <div style="margin-bottom: 20px;">
                  <label style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase;">Design Category</label>
                  <div style="font-size: 16px; font-weight: 600; color: #d1d5db;">${report.designType}</div>
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase;">Audit Date</label>
                  <div style="font-size: 14px; color: #9ca3af;">${formatDate(report.createdAt)}</div>
                </div>
             </div>
             <div style="border-radius: 16px; overflow: hidden; border: 4px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
                <img src="${report.imageUrl}" crossorigin="anonymous" style="width: 100%; height: auto; display: block;" />
             </div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 60px 50px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 40px; background: #fff7ed; padding: 20px; border-left: 4px solid #ea580c; border-radius: 0 12px 12px 0;">
            <div style="font-size: 24px;">🎯</div>
            <div>
              <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #7c2d12;">Expert Insight Overview</h4>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: #9a3412;">An analysis of your design's usability, accessibility, and visual hierarchy.</p>
            </div>
          </div>

          <div style="font-size: 15px; color: #374151;">
            ${formattedContent}
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 50px; padding: 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12px; color: #6b7280;">
            &copy; ${new Date().getFullYear()} UXLens AI. Generated for <strong>${user?.email}</strong>.
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #ea580c;">
             EXPERIENCE DRIVEN AUDIT
          </div>
        </div>
      `;
      
      document.body.appendChild(exportContainer);
      
      // Wait for image to load
      const img = exportContainer.querySelector('img');
      if (img) {
        await new Promise((resolve) => {
          if (img.complete) resolve(true);
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
        });
      }

      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.setProperties({
        title: `UXLens Audit - ${report.imageName}`,
        subject: 'Design Analysis Report',
        author: 'UXLens AI'
      });
      
      pdf.save(`${report.imageName.replace(/\s+/g, '_')}_audit.pdf`);
      
      document.body.removeChild(exportContainer);
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisReport[];
      setReports(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, report: AnalysisReport) => {
    e.stopPropagation();
    const docRef = doc(db, 'reports', report.id);
    await updateDoc(docRef, { isFavorite: !report.isFavorite });
  };

  const deleteReport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this report?")) {
      await deleteDoc(doc(db, 'reports', id));
      if (selectedReport?.id === id) setSelectedReport(null);
    }
  };

  const filteredReports = reports.filter(r => 
    r.imageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.designType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getParsedResult = (r: AnalysisReport) => {
    return {
      en: r.feedback.split('---BENGALI_VERSION---')[0].replace('---ENGLISH_VERSION---', '').trim(),
      bn: r.feedback.split('---BENGALI_VERSION---')[1]?.trim()
    };
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (typeof date?.toDate === 'function') return date.toDate().toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
        <p className="text-neutral-500">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
            <HistoryIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your History</h1>
            <p className="text-neutral-500">Review and manage your past design audits.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl w-full md:w-80 outline-none focus:ring-2 focus:ring-orange-600 transition-all"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Report List */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredReports.length === 0 ? (
            <div className="p-8 rounded-3xl border-2 border-dashed border-neutral-800 text-center text-neutral-600">
              <FileText className="w-10 h-10 mx-auto mb-4 opacity-10" />
              <p>No reports found.</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layoutId={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  selectedReport?.id === report.id 
                    ? 'bg-neutral-800 border-orange-600 shadow-xl' 
                    : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                    <img src={report.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                       <h3 className="font-bold text-sm truncate">{report.imageName}</h3>
                       <button 
                        onClick={(e) => toggleFavorite(e, report)}
                        className={`shrink-0 ${report.isFavorite ? 'text-yellow-500' : 'text-neutral-600 hover:text-yellow-500'}`}
                       >
                         <Star className={`w-4 h-4 ${report.isFavorite ? 'fill-current' : ''}`} />
                       </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-bold uppercase text-neutral-400">
                        {report.designType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-neutral-500 text-[10px]">
                      <Calendar className="w-3 h-3" />
                      {formatDate(report.createdAt)}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 mt-auto transition-colors ${selectedReport?.id === report.id ? 'text-orange-500' : 'text-neutral-700'}`} />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden"
            >
              <div className="aspect-[21/9] bg-neutral-950 overflow-hidden relative">
                <img src={selectedReport.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-black">{selectedReport.imageName}</h2>
                    <p className="text-neutral-400 text-sm">{selectedReport.designType}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadPDF(selectedReport)}
                      disabled={isExporting}
                      className="p-3 rounded-2xl bg-orange-600 text-white hover:bg-orange-500 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                      title={t('download')}
                    >
                      {isExporting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      <span className="text-xs font-bold uppercase hidden sm:inline">
                        {isExporting ? 'Generating...' : t('download')}
                      </span>
                    </button>
                    <button 
                      onClick={(e) => deleteReport(e, selectedReport.id)}
                      className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-neutral-800 flex justify-end gap-2 bg-neutral-950/50">
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

              <div className="p-8 prose prose-invert prose-neutral max-w-none">
                <div className="markdown-body">
                  <ReactMarkdown>
                    {language === 'en' ? getParsedResult(selectedReport).en : getParsedResult(selectedReport).bn}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-3xl text-neutral-600 bg-neutral-900/20">
              <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-neutral-700" />
              </div>
              <p className="font-medium text-lg">Select a report to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
