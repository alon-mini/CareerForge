
import React, { useState } from 'react';
import { GeneratedAssets, JobDetails, InterviewQuestion } from '../types';

interface ResultsTabsProps {
  results: GeneratedAssets;
  jobDetails: { title: string; company: string };
  onUpdate?: (updatedAssets: GeneratedAssets) => void;
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

const ResultsTabs: React.FC<ResultsTabsProps> = ({ results, jobDetails, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter' | 'story' | 'interview' | 'outreach'>('resume');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('original');

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
        htmlContent = getThemedHtml(); // Use the themed version
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
    { id: 'outreach', label: 'Outreach' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return (
          <div className="w-full h-[800px] bg-slate-200 dark:bg-slate-800 overflow-hidden rounded-lg relative group border border-slate-300 dark:border-slate-700 flex flex-col">
             {/* Toolbar for Resume Tab */}
             <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                 <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex items-center">
                    <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">Skin:</span>
                    <select 
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer p-1"
                    >
                        {Object.entries(THEMES).map(([key, theme]) => (
                            <option key={key} value={key}>{theme.name}</option>
                        ))}
                    </select>
                 </div>
             </div>

             {isEditing ? (
                 <div className="w-full h-full flex flex-col mt-14">
                     <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-800 dark:text-yellow-200 text-center border-b border-yellow-100 dark:border-yellow-900/30">
                         ⚠️ Editing Raw HTML. Be careful not to break the structure.
                     </div>
                     <textarea 
                        className="flex-grow w-full p-4 font-mono text-xs bg-slate-900 text-slate-300 outline-none resize-none"
                        value={results.resumeHtml}
                        onChange={(e) => updateField('resumeHtml', e.target.value)}
                        spellCheck={false}
                     />
                 </div>
             ) : (
                <>
                    <iframe 
                        srcDoc={getThemedHtml()} 
                        title="Resume Preview" 
                        className="w-full h-full bg-white shadow-sm"
                    />
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
                </>
             )}
          </div>
        );
      case 'coverLetter':
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
                   onClick={() => handleCopy(results.coverLetter)}
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
                                                    const newPrep = [...results.interviewPrep];
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
                                                    const newPrep = [...results.interviewPrep];
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
                                                const newPrep = [...results.interviewPrep];
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
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">LinkedIn Connect</h3>
                        {!isEditing && <button onClick={() => handleCopy(results.emailKit.linkedInConnection)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>}
                    </div>
                    {isEditing ? (
                        <textarea 
                            className="flex-grow p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm resize-none"
                            value={results.emailKit.linkedInConnection}
                            onChange={(e) => updateField('emailKit', { ...results.emailKit, linkedInConnection: e.target.value })}
                        />
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                            {results.emailKit.linkedInConnection}
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Post-Interview Thank You</h3>
                        {!isEditing && <button onClick={() => handleCopy(results.emailKit.followUpEmail)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>}
                    </div>
                    {isEditing ? (
                        <textarea 
                            className="flex-grow p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm resize-none"
                            value={results.emailKit.followUpEmail}
                            onChange={(e) => updateField('emailKit', { ...results.emailKit, followUpEmail: e.target.value })}
                        />
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                            {results.emailKit.followUpEmail}
                        </div>
                    )}
                </div>
            </div>
        )
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
        <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl flex space-x-1 overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700 flex-grow max-w-2xl">
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
        
        {onUpdate && (
            <div className="ml-4 flex items-center">
                 <button
                    onClick={() => setIsEditing(!isEditing)}
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
                     {isEditing ? 'Editing' : 'Edit Mode'}
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
