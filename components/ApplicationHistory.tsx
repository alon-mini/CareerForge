import React, { useEffect, useState } from 'react';
import { ApplicationRecord } from '../types';
import { fileSystemService } from '../services/fileSystem';
import ResultsTabs from './ResultsTabs';

const ApplicationHistory: React.FC = () => {
  const [history, setHistory] = useState<ApplicationRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const records = fileSystemService.loadApplicationHistory();
    setHistory(records);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 dark:text-slate-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No History Yet</h3>
        <p className="text-sm">Applications you mark as "Sent" will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Sent Applications</h2>
      
      {history.map((app) => (
        <div 
          key={app.id} 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300"
        >
          <button
            onClick={() => toggleExpand(app.id)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
                {app.company.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {app.title} <span className="text-slate-400 font-normal text-base">at</span> {app.company}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applied on {new Date(app.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className={`transform transition-transform duration-300 ${expandedId === app.id ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedId === app.id && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="h-[600px]">
                {/* Pass title/company to ResultsTabs so PDF download works nicely from history too */}
                <ResultsTabs 
                    results={app.assets} 
                    jobDetails={{ title: app.title, company: app.company }} 
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ApplicationHistory;