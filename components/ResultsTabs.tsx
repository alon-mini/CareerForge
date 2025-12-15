
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedAssets, JobDetails, InterviewQuestion } from '../types';

interface ResultsTabsProps {
  results: GeneratedAssets;
  jobDetails: { title: string; company: string };
  onUpdate?: (updatedAssets: GeneratedAssets) => void;
  onGenerateMissing?: (assetType: keyof GeneratedAssets) => void;
  requestedTab?: string | null;
}

const THEMES: Record<string, { name: string; css: string }> = {
  original: { 
    name: 'Original', 
    css: '' 
  },
  modern: { 
    name: 'Modern Blue', 
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
      body { font-family: 'Inter', sans-serif !important; color: #1e293b !important; }
      h1 { color: #1e40af !important; letter-spacing: -0.5px; }
      h2, h3 { color: #2563eb !important; }
      .sidebar { background-color: #f8fafc !important; border-right: none !important; }
      ul li::before { color: #3b82f6 !important; }
      a { color: #2563eb !important; }
    ` 
  },
  serif: { 
    name: 'Executive Serif', 
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap');
      body { font-family: 'Merriweather', serif !important; color: #0f172a !important; }
      h1 { font-family: 'Merriweather', serif !important; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 0.5rem; letter-spacing: 1px; }
      h2 { color: #334155 !important; font-family: 'Merriweather', serif !important; font-style: italic; border-bottom: 1px solid #e2e8f0; }
      h3 { font-family: 'Merriweather', serif !important; }
      .sidebar { background-color: transparent !important; border-right: 1px solid #e2e8f0 !important; }
    ` 
  },
  minimal: { 
    name: 'Tech Minimalist', 
    css: `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
      body { font-family: 'JetBrains Mono', monospace !important; font-size: 9pt !important; color: #000 !important; }
      h1 { text-transform: lowercase; color: #000 !important; letter-spacing: -1px; }
      h2 { text-transform: uppercase; font-size: 10pt !important; background: #000; color: #fff !important; padding: 2px 6px; display: inline-block; }
      h3 { font-weight: 700 !important; }
      .sidebar { border-right: 1px dashed #94a3b8 !important; }
      ul { list-style-type: square !important; }
    ` 
  }
};

const ResultsTabs: React.FC<ResultsTabsProps> = ({ results, jobDetails, onUpdate, onGenerateMissing, requestedTab }) => {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter' | 'story' | 'interview' | 'outreach' | 'intel'>('resume');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('original');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Switch tab when requested by parent
  useEffect(() => {
    if (requestedTab) {
        setActiveTab(requestedTab as any);
    }
  }, [requestedTab]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Helper to safely update parent state
  const updateField = (field: keyof GeneratedAssets, value: any) => {
    if (onUpdate) {
      onUpdate({
        ...results,
        [field]: value
      });
    }
  };

  const getThemedHtml = () => {
    const theme = THEMES[selectedTheme];
    if (!theme || !theme.css) return results.resumeHtml;

    // Inject the theme CSS before the closing head tag
    return results.resumeHtml.replace(
        '</head>', 
        `<style>${theme.css}</style></head>`
    );
  };

  const toggleEditMode = () => {
      const iframe = iframeRef.current;
      
      // If turning OFF editing (Saving)
      if (isEditing) {
          if (iframe && iframe.contentDocument) {
              // Disable editing in DOM
              iframe.contentDocument.body.contentEditable = "false";
              const editorStyle = iframe.contentDocument.getElementById('editor-styles');
              if (editorStyle) editorStyle.remove();

              // Capture NEW content
              console.log("Saving changes from WYSIWYG Editor...");
              const newHtml = iframe.contentDocument.documentElement.outerHTML;
              updateField('resumeHtml', newHtml);
          }
          setIsEditing(false);
      } 
      // If turning ON editing
      else {
          setIsEditing(true);
          // Effects inside the iframe will be handled by the useEffect below to ensure style injection
      }
  };

  // Manage WYSIWYG injection when editing state changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || activeTab !== 'resume' || !isEditing) return;

    const enableEditing = () => {
        if (!iframe.contentDocument || !iframe.contentDocument.body) return;
        
        iframe.contentDocument.body.contentEditable = "true";
        iframe.contentDocument.body.style.outline = "none";
        
        // Add visual cue for editing inside the iframe if not already there
        if (!iframe.contentDocument.getElementById('editor-styles')) {
            const style = iframe.contentDocument.createElement('style');
            style.id = "editor-styles";
            style.innerHTML = `
                *[contenteditable]:hover { outline: 1px dashed #3b82f6; cursor: text; }
                *[contenteditable]:focus { outline: 2px solid #3b82f6; background-color: rgba(59, 130, 246, 0.05); }
            `;
            iframe.contentDocument.head.appendChild(style);
        }
    };

    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        enableEditing();
    } else {
        iframe.onload = enableEditing;
    }
  }, [isEditing, activeTab]);


  const handleDownloadPdf = async () => {
    // Use Electron's native PDF generation via IPC
    if (!(window as any).require) {
        alert("PDF download is only available in the desktop application.");
        return;
    }

    const { ipcRenderer } = (window as any).require('electron');
    
    let htmlContent = "";
    let filename = "Document.pdf";

    // Clean company name for filename
    const safeCompany = jobDetails.company.replace(/[^a-z0-9]/gi, '_');

    if (activeTab === 'resume') {
        // If editing, grab current state from DOM, otherwise use stored state
        if (isEditing && iframeRef.current?.contentDocument) {
             htmlContent = iframeRef.current.contentDocument.documentElement.outerHTML;
        } else {
             htmlContent = getThemedHtml();
        }
        filename = `Resume_${safeCompany}.pdf`;
    } else if (activeTab === 'coverLetter') {
        filename = `CoverLetter_${safeCompany}.pdf`;
        htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Cover Letter</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
                    body {
                        font-family: 'Merriweather', Georgia, serif;
                        line-height: 1.6;
                        color: #1a202c;
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 25mm;
                        font-size: 11pt;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page { size: A4; margin: 0; }
                    p { margin-bottom: 1em; }
                    .content { white-space: pre-wrap; }
                </style>
            </head>
            <body><div class="content">${results.coverLetter}</div></body>
            </html>
        `;
    }

    try {
        await ipcRenderer.invoke('export-pdf', htmlContent, filename);
    } catch (e) {
        console.error("Failed to export PDF", e);
        alert("Failed to save PDF.");
    }
  };

  const tabs = [
    { id: 'resume', label: 'Resume' },
    { id: 'coverLetter', label: 'Cover Letter' },
    { id: 'story', label: 'Strategy' },
    { id: 'interview', label: 'Interview Prep' },
    { id: 'outreach', label: 'Outreach' },
    { id: 'intel', label: 'Recon Dossier' } // New Tab
  ];

  const MissingContentPlaceholder = ({ label, assetKey, message }: { label: string, assetKey: keyof GeneratedAssets, message?: string }) => (
      <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-slate-500 dark:text-slate-400 mb-4 text-center max-w-sm">
              {message || `You chose not to generate the ${label} during the initial forge.`}
          </p>
          {onGenerateMissing ? (
              <button 
                onClick={() => onGenerateMissing(assetKey)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Generate {label} Now
              </button>
          ) : (
              <p className="text-xs text-slate-400">Generation unavailable in this view.</p>
          )}
      </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return (
          <div className={`w-full h-[800px] bg-slate-200 dark:bg-slate-800 overflow-hidden rounded-lg relative group border border-slate-300 dark:border-slate-700 flex flex-col ${isEditing ? 'ring-2 ring-brand-500' : ''}`}>
             {/* Toolbar for Resume Tab */}
             <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                 <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex items-center">
                    <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">Skin:</span>
                    <select 
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer p-1"
                        disabled={isEditing}
                    >
                        {Object.entries(THEMES).map(([key, theme]) => (
                            <option key={key} value={key}>{theme.name}</option>
                        ))}
                    </select>
                 </div>
                 {isEditing && (
                    <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1.5 rounded font-bold shadow-sm">
                        ✎ Visual Editor Active
                    </div>
                 )}
             </div>

             {/* 
                 We use a single iframe. 
                 When isEditing is true, we manipulate its DOM to be contentEditable.
                 IMPORTANT: We do NOT set srcDoc to undefined during edit mode, as that unloads the DOM.
                 We keep it as getThemedHtml(). Since getThemedHtml() value doesn't change when we just toggle edit mode,
                 React won't re-render the iframe, preserving the DOM we are about to edit.
             */}
            <iframe 
                ref={iframeRef}
                srcDoc={getThemedHtml()} 
                title="Resume Preview" 
                className="w-full h-full bg-white shadow-sm"
            />

            {!isEditing && (
                <div className="absolute top-4 right-4">
                    <button 
                        onClick={handleDownloadPdf}
                        className="flex items-center px-4 py-2 bg-slate-900 dark:bg-brand-600 text-white rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-brand-500 transition-all"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                    </button>
                </div>
            )}
          </div>
        );
      case 'coverLetter':
        if (!results.coverLetter) return <MissingContentPlaceholder label="Cover Letter" assetKey="coverLetter" />;
        return isEditing ? (
            <textarea
                className="w-full h-[600px] p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-serif leading-relaxed outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                value={results.coverLetter}
                onChange={(e) => updateField('coverLetter', e.target.value)}
            />
        ) : (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 min-h-[600px] whitespace-pre-wrap font-serif leading-relaxed text-slate-800 dark:text-slate-200 relative">
             <div className="absolute top-4 right-4 flex space-x-2">
                <button 
                   onClick={() => handleCopy(results.coverLetter!)}
                   className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                   title="Copy Text"
                >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                </button>
                <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    Download PDF
                </button>
             </div>
             {results.coverLetter}
          </div>
        );
      case 'story':
        if (!results.strategyStory) return <MissingContentPlaceholder label="Strategy" assetKey="strategyStory" />;
        return (
            <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-3">The Narrative Arc</h3>
                    {isEditing ? (
                         <textarea
                            className="w-full h-[400px] bg-transparent border-0 outline-none text-indigo-800 dark:text-indigo-300 resize-none"
                            value={results.strategyStory}
                            onChange={(e) => updateField('strategyStory', e.target.value)}
                        />
                    ) : (
                        <div className="prose prose-indigo dark:prose-invert max-w-none whitespace-pre-wrap text-indigo-800 dark:text-indigo-300">
                            {results.strategyStory}
                        </div>
                    )}
                </div>
            </div>
        );
      case 'interview':
        if (!results.interviewPrep) return <MissingContentPlaceholder label="Interview Prep" assetKey="interviewPrep" />;
        return (
            <div className="space-y-6">
                {results.interviewPrep.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                            </div>
                            <div className="space-y-4 w-full">
                                {isEditing ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Question</label>
                                            <input 
                                                className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                                value={item.question}
                                                onChange={(e) => {
                                                    const newPrep = [...(results.interviewPrep || [])];
                                                    newPrep[idx] = { ...newPrep[idx], question: e.target.value };
                                                    updateField('interviewPrep', newPrep);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Context</label>
                                            <input 
                                                className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm"
                                                value={item.context}
                                                onChange={(e) => {
                                                    const newPrep = [...(results.interviewPrep || [])];
                                                    newPrep[idx] = { ...newPrep[idx], context: e.target.value };
                                                    updateField('interviewPrep', newPrep);
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{item.question}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium uppercase tracking-wide">Context: {item.context}</p>
                                    </div>
                                )}
                                
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Suggested Answer Strategy:</p>
                                    {isEditing ? (
                                        <textarea 
                                            className="w-full h-24 p-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 text-sm"
                                            value={item.suggestedAnswer}
                                            onChange={(e) => {
                                                const newPrep = [...(results.interviewPrep || [])];
                                                newPrep[idx] = { ...newPrep[idx], suggestedAnswer: e.target.value };
                                                updateField('interviewPrep', newPrep);
                                            }}
                                        />
                                    ) : (
                                        <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {item.suggestedAnswer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
      case 'outreach':
        if (!results.emailKit) return <MissingContentPlaceholder label="Outreach Kit" assetKey="emailKit" />;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">LinkedIn Connect</h3>
                        {!isEditing && <button onClick={() => handleCopy(results.emailKit!.linkedInConnection)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>}
                    </div>
                    {isEditing ? (
                        <textarea 
                            className="flex-grow p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm resize-none"
                            value={results.emailKit!.linkedInConnection}
                            onChange={(e) => updateField('emailKit', { ...results.emailKit!, linkedInConnection: e.target.value })}
                        />
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                            {results.emailKit!.linkedInConnection}
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Post-Interview Thank You</h3>
                        {!isEditing && <button onClick={() => handleCopy(results.emailKit!.followUpEmail)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>}
                    </div>
                    {isEditing ? (
                        <textarea 
                            className="flex-grow p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm resize-none"
                            value={results.emailKit!.followUpEmail}
                            onChange={(e) => updateField('emailKit', { ...results.emailKit!, followUpEmail: e.target.value })}
                        />
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                            {results.emailKit!.followUpEmail}
                        </div>
                    )}
                </div>
            </div>
        );
      case 'intel':
        if (!results.companyIntel) return <MissingContentPlaceholder label="Company Intel" assetKey="companyIntel" message="Generate a comprehensive intelligence dossier to prep for your interview." />;
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Culture Vibe */}
                    <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                         </div>
                         <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Culture Vibe</h3>
                         <p className="text-lg font-medium leading-relaxed">{results.companyIntel.cultureVibe}</p>
                    </div>
                    
                    {/* Recent Initiative */}
                    <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
                         </div>
                         <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Latest Initiative</h3>
                         <p className="text-lg font-medium leading-relaxed">{results.companyIntel.recentInitiatives}</p>
                    </div>
                </div>

                {/* Key Values */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Core Values / Motto</h3>
                    <div className="flex flex-wrap gap-3">
                        {results.companyIntel.keyValues.map((val, idx) => (
                            <span key={idx} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Interview Gold */}
                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Insider Talking Points
                    </h3>
                    <ul className="space-y-3">
                        {results.companyIntel.interviewTalkingPoints.map((point, idx) => (
                            <li key={idx} className="flex gap-3 text-indigo-900 dark:text-indigo-200 text-sm">
                                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2"></span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Feedback Toast */}
      {copyFeedback && (
          <div className="fixed bottom-8 right-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-fade-in">
              {copyFeedback}
          </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl flex space-x-1 overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700 flex-grow max-w-3xl">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                        flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        
        {onUpdate && activeTab !== 'intel' && (
            <div className="ml-4 flex items-center">
                 <button
                    onClick={toggleEditMode}
                    className={`
                        relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                        ${isEditing ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}
                    `}
                 >
                    <span className="sr-only">Toggle Edit Mode</span>
                    <span
                        aria-hidden="true"
                        className={`
                            pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                            ${isEditing ? 'translate-x-6' : 'translate-x-0'}
                        `}
                    />
                 </button>
                 <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                     {isEditing ? 'Direct Edit' : 'Edit Mode'}
                 </span>
            </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};

export default ResultsTabs;
