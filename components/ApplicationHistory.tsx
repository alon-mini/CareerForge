
import React, { useEffect, useState } from 'react';
import { ApplicationRecord, RecruitmentStage, ApplicationStatus, GeneratedAssets } from '../types';
import { fileSystemService } from '../services/fileSystem';
import ResultsTabs from './ResultsTabs';

interface ApplicationHistoryProps {
  onGenerateMissing: (recordId: string, assetType: keyof GeneratedAssets, recordContext: ApplicationRecord) => Promise<any>;
}

const ApplicationHistory: React.FC<ApplicationHistoryProps> = ({ onGenerateMissing }) => {
  const [history, setHistory] = useState<ApplicationRecord[]>([]);
  const [sortType, setSortType] = useState<'time' | 'az' | 'progress'>('time');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState<string>('');
  const [addingStageTo, setAddingStageTo] = useState<string | null>(null);
  const [tabOverrides, setTabOverrides] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const records = fileSystemService.loadApplicationHistory();
    const migrated = records.map(r => ({
      ...r,
      overallStatus: r.overallStatus || 'active',
      stages: r.stages || [{ id: '1', label: 'Applied', completed: true, current: true, date: r.date }]
    }));
    setHistory(migrated);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setAddingStageTo(null);
    setNewStageName('');
  };

  const updateRecord = (updatedRecord: ApplicationRecord) => {
    setHistory(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    fileSystemService.updateApplicationInHistory(updatedRecord);
  };

  const setOverallStatus = (record: ApplicationRecord, status: ApplicationStatus) => {
    const updated = { ...record, overallStatus: status };
    updateRecord(updated);
  };

  const addNewStage = (record: ApplicationRecord, label: string) => {
    if (!label.trim()) return;

    const newStage: RecruitmentStage = {
      id: Date.now().toString(),
      label: label.trim(),
      completed: false,
      current: false 
    };

    const updated = { ...record, stages: [...record.stages, newStage] };
    updateRecord(updated);
  };
  
  const setStageCurrent = (record: ApplicationRecord, stageIndex: number) => {
    const updatedStages = record.stages.map((s, idx) => ({
      ...s,
      completed: idx < stageIndex, 
      current: idx === stageIndex,
      date: idx === stageIndex && !s.date ? new Date().toISOString() : s.date
    }));

    let status = record.overallStatus;
    if (status === 'rejected' || status === 'ghosted') {
        status = 'active';
    }

    updateRecord({ ...record, stages: updatedStages, overallStatus: status });
  };

  const handleManualAddStage = (record: ApplicationRecord) => {
     if (!newStageName.trim()) return;
     addNewStage(record, newStageName);
     setNewStageName('');
     setAddingStageTo(null);
  }

  const handleDelete = (id: string) => {
      if (confirm("Are you sure you want to delete this application? This cannot be undone.")) {
          fileSystemService.deleteApplicationFromHistory(id);
          setHistory(prev => prev.filter(app => app.id !== id));
      }
  }

  // Map asset keys to ResultTabs keys
  const getTabIdFromAsset = (asset: keyof GeneratedAssets): string => {
      switch(asset) {
          case 'resumeHtml': return 'resume';
          case 'coverLetter': return 'coverLetter';
          case 'strategyStory': return 'story';
          case 'interviewPrep': return 'interview';
          case 'emailKit': return 'outreach';
          default: return 'resume';
      }
  }

  const handleGenerateInHistory = async (record: ApplicationRecord, assetType: keyof GeneratedAssets) => {
      try {
          const result = await onGenerateMissing(record.id, assetType, record);
          const updatedAssets = { ...record.assets, [assetType]: result };
          const updatedRecord = { ...record, assets: updatedAssets };
          updateRecord(updatedRecord);
          const tabId = getTabIdFromAsset(assetType);
          setTabOverrides(prev => ({ ...prev, [record.id]: tabId }));
      } catch (e) {
          // Error handling done in parent
      }
  };

  const handleAssetsUpdate = (record: ApplicationRecord, newAssets: GeneratedAssets) => {
      const updatedRecord = { ...record, assets: newAssets };
      updateRecord(updatedRecord);
  };

  const getSortedHistory = () => {
    const sorted = [...history];
    switch (sortType) {
        case 'az':
            return sorted.sort((a, b) => a.company.localeCompare(b.company));
        case 'progress':
            // Prioritize Active/Hired first, then by depth of stage
            return sorted.sort((a, b) => {
                 const getScore = (r: ApplicationRecord) => {
                    if (r.overallStatus === 'rejected') return -1;
                    if (r.overallStatus === 'ghosted') return 0;
                    // Active or Hired
                    const idx = r.stages.findIndex(s => s.current);
                    return (idx === -1 ? 0 : idx) + 1; // +1 to stay above 0
                 };
                 // Higher score first
                 return getScore(b) - getScore(a);
            });
        case 'time':
        default:
             return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  };

  const getStatusBadge = (app: ApplicationRecord) => {
    const currentStageIndex = app.stages.findIndex(s => s.current);
    const currentStageLabel = app.stages[currentStageIndex]?.label || "Unknown";
    
    let label = currentStageLabel;
    let style = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

    if (app.overallStatus === 'rejected') {
        label = "Rejected";
        style = "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    } else if (app.overallStatus === 'hired') {
        label = "Hired";
        style = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
    } else if (app.overallStatus === 'ghosted') {
        label = "No Response";
        style = "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    } else {
        // Active Status
        if (currentStageIndex === 0) {
             label = "Applied";
             style = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
        } else {
             label = currentStageLabel;
             style = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
        }
    }

    return { label, style };
  };

  const sortedHistory = getSortedHistory();

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
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Application Tracker</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {history.length} Applications
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Sort by:</label>
            <select 
                value={sortType} 
                onChange={(e) => setSortType(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 transition-shadow shadow-sm"
            >
                <option value="time">Time (Default)</option>
                <option value="az">A-Z (Company)</option>
                <option value="progress">Progress</option>
            </select>
          </div>
      </div>
      
      {sortedHistory.map((app) => {
        const badge = getStatusBadge(app);
        
        return (
          <div 
            key={app.id} 
            className={`
                bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm transition-all duration-300
                ${app.overallStatus === 'rejected' ? 'opacity-75 border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-700'}
            `}
          >
            {/* CARD HEADER */}
            <button
              onClick={() => toggleExpand(app.id)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none group"
            >
              <div className="flex items-center gap-4">
                <div className={`
                    h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm
                    ${app.overallStatus === 'rejected' 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' 
                        : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }
                `}>
                  {app.company.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {app.title} <span className="text-slate-400 font-normal text-base">at</span> {app.company}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badge.style}`}>
                          {badge.label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Applied {new Date(app.date).toLocaleDateString()}
                      </span>
                  </div>
                </div>
              </div>
              
              <div className={`transform transition-transform duration-300 text-slate-400 ${expandedId === app.id ? 'rotate-180 text-brand-500' : ''}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* EXPANDED CONTENT */}
            {expandedId === app.id && (
              <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                
                {/* --- TRACKER UI --- */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-start gap-8">
                        
                        {/* Status Controls */}
                        <div className="w-full md:w-64 flex-shrink-0 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Application Status</h4>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => setOverallStatus(app, 'active')}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${app.overallStatus === 'active' ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${app.overallStatus === 'active' ? 'bg-brand-500' : 'bg-slate-300'}`}></div>
                                    In Progress
                                </button>
                                <button 
                                    onClick={() => setOverallStatus(app, 'ghosted')}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${app.overallStatus === 'ghosted' ? 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${app.overallStatus === 'ghosted' ? 'bg-slate-500' : 'bg-slate-300'}`}></div>
                                    No Response
                                </button>
                                <button 
                                    onClick={() => setOverallStatus(app, 'hired')}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${app.overallStatus === 'hired' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${app.overallStatus === 'hired' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    Offer / Hired
                                </button>
                                <button 
                                    onClick={() => setOverallStatus(app, 'rejected')}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${app.overallStatus === 'rejected' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${app.overallStatus === 'rejected' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                    Rejected
                                </button>
                            </div>

                            {/* DELETE BUTTON - Only visible when rejected */}
                            {app.overallStatus === 'rejected' && (
                                <button 
                                    onClick={() => handleDelete(app.id)}
                                    className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 dark:bg-slate-900 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/30 transition-all shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Application
                                </button>
                            )}
                        </div>

                        {/* Interactive Timeline */}
                        <div className="flex-grow">
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recruitment Pipeline</h4>
                             </div>
                             
                             <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-6">
                                {app.stages.map((stage, idx) => (
                                    <div key={stage.id} className="relative group">
                                        {/* Dot on Timeline */}
                                        <div 
                                            className={`
                                                absolute -left-[21px] top-1.5 w-4 h-4 rounded-full border-2 box-content bg-white dark:bg-slate-900 cursor-pointer transition-colors
                                                ${stage.current 
                                                    ? 'border-brand-500 ring-4 ring-brand-100 dark:ring-brand-900/30' 
                                                    : stage.completed 
                                                        ? 'border-emerald-500 bg-emerald-500' 
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }
                                            `}
                                            onClick={() => setStageCurrent(app, idx)}
                                        >
                                            {stage.completed && !stage.current && (
                                                <svg className="w-2.5 h-2.5 text-white absolute top-0.5 left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>

                                        <div className="flex items-start justify-between">
                                            <div onClick={() => setStageCurrent(app, idx)} className="cursor-pointer">
                                                <h5 className={`text-sm font-semibold transition-colors ${stage.current ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {stage.label}
                                                </h5>
                                                {stage.date && (
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {new Date(stage.date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {stage.current && app.overallStatus === 'active' && (
                                                <span className="text-[10px] font-bold uppercase text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                                                    Current Stage
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Add Stage Button */}
                                <div className="relative pt-2">
                                    <div className="absolute -left-[20px] top-3.5 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                    
                                    {addingStageTo === app.id ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={newStageName}
                                                onChange={(e) => setNewStageName(e.target.value)}
                                                placeholder="e.g. Home Assignment"
                                                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none w-48"
                                                onKeyDown={(e) => e.key === 'Enter' && handleManualAddStage(app)}
                                            />
                                            <button 
                                                onClick={() => handleManualAddStage(app)}
                                                className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => setAddingStageTo(null)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setAddingStageTo(app.id)}
                                            className="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors ml-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add custom stage
                                        </button>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* --- ORIGINAL KIT --- */}
                <div className="p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Application Kit</h4>
                  <div className="h-[600px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <ResultsTabs 
                        results={app.assets} 
                        jobDetails={{ title: app.title, company: app.company }} 
                        onUpdate={(newAssets) => handleAssetsUpdate(app, newAssets)}
                        onGenerateMissing={(assetType) => handleGenerateInHistory(app, assetType)}
                        requestedTab={tabOverrides[app.id]}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ApplicationHistory;
