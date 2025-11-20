import React, { useState } from 'react';
import { GeneratedAssets, JobDetails } from '../types';

interface ResultsTabsProps {
  results: GeneratedAssets;
  jobDetails: { title: string; company: string };
}

const ResultsTabs: React.FC<ResultsTabsProps> = ({ results, jobDetails }) => {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter' | 'story' | 'interview' | 'outreach'>('resume');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
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
        htmlContent = results.resumeHtml;
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
          <div className="w-full h-[800px] bg-slate-200 dark:bg-slate-800 overflow-hidden rounded-lg relative group border border-slate-300 dark:border-slate-700">
             {/* Preview scaled down */}
             <iframe 
               srcDoc={results.resumeHtml} 
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
          </div>
        );
      case 'coverLetter':
        return (
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
                    <div className="prose prose-indigo dark:prose-invert max-w-none whitespace-pre-wrap text-indigo-800 dark:text-indigo-300">
                        {results.strategyStory}
                    </div>
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
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{item.question}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium uppercase tracking-wide">Context: {item.context}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Suggested Answer Strategy:</p>
                                    <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {item.suggestedAnswer}
                                    </div>
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
                        <button onClick={() => handleCopy(results.emailKit.linkedInConnection)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                        {results.emailKit.linkedInConnection}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Post-Interview Thank You</h3>
                        <button onClick={() => handleCopy(results.emailKit.followUpEmail)} className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Copy</button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic flex-grow whitespace-pre-wrap">
                        {results.emailKit.followUpEmail}
                    </div>
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

      <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl flex space-x-1 mb-6 overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700">
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

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};

export default ResultsTabs;