
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStatus, UserProfile, JobDetails, ApplicationRecord, GeneratedAssets, GenerationOptions } from './types';
import { generateApplicationAssets, refineResume, generateSingleAsset, parseJobPosting, generateMasterProfile } from './services/gemini';
import { authService } from './services/auth';
import { fileSystemService } from './services/fileSystem';
import { updateService } from './services/updateService';
import FileUpload from './components/FileUpload';
import ResultsTabs from './components/ResultsTabs';
import LoadingOverlay from './components/LoadingOverlay';
import LoginScreen from './components/LoginScreen';
import ApplicationHistory from './components/ApplicationHistory';
import ProfileWizard from './components/ProfileWizard';
import UsageModal from './components/UsageModal';

// Hardcoded version to avoid module resolution issues with importing package.json in browser env
const APP_VERSION = '1.0.16';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'applications'>('create');
  const [isAppSaved, setIsAppSaved] = useState(false);
  const [activeTabResult, setActiveTabResult] = useState<string | null>(null);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);
  
  // Generation Options
  const [genOptions, setGenOptions] = useState<GenerationOptions>({
    coverLetter: true,
    strategy: true,
    interviewPrep: true,
    outreach: true
  });

  // Cinematic Loading State
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'drafting' | 'refining' | 'complete'>('idle');
  const [loadingProgress, setLoadingProgress] = useState({ message: 'Starting...', percent: 0 });
  const [activeDraftingMessages, setActiveDraftingMessages] = useState<string[]>([]);
  
  const [state, setState] = useState<AppState>({
    status: AppStatus.IDLE,
    userProfile: null,
    jobDetails: { title: '', company: '', description: '' },
    results: null,
    error: null
  });

  // Initialize Theme
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Check for Updates on Mount
  useEffect(() => {
      const checkUpdate = async () => {
          const info = await updateService.checkForUpdates(APP_VERSION);
          if (info.hasUpdate) {
              setUpdateAvailable({ version: info.latestVersion, url: info.downloadUrl });
          }
      };
      checkUpdate();
  }, []);

  // Toggle Theme
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Cinematic Loading Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (generationPhase === 'drafting') {
      console.log("Phase: Drafting Started");
      setLoadingProgress({ message: "Initializing Agent...", percent: 0 });
      let p = 0;
      let ticks = 0;
      
      const isSingleAsset = activeDraftingMessages.length === 1;
      // Single Asset: 25s (250 ticks). Full Kit: 12s per item * count.
      const totalTicksNeeded = isSingleAsset ? 250 : activeDraftingMessages.length * 120;
      // Single Asset Target: 99%. Full Kit Target: 67% (waiting for judge)
      const targetPercent = isSingleAsset ? 99 : 67;

      interval = setInterval(() => {
        ticks++;
        
        // Creep to target% over totalTicksNeeded
        if (p < targetPercent) {
          p += (targetPercent / totalTicksNeeded); 
          if (p > targetPercent) p = targetPercent;
        }
        
        // Cycle messages every 12 seconds (120 ticks)
        const msgIndex = Math.min(Math.floor(ticks / 120), activeDraftingMessages.length - 1);
        
        setLoadingProgress({ 
          message: activeDraftingMessages[msgIndex] || "Processing...", 
          percent: Math.floor(p) 
        });
      }, 100);

    } else if (generationPhase === 'refining') {
      console.log("Phase: Refining Started");
      setLoadingProgress({ message: "Judge Agent Reviewing...", percent: 67 });
      let p = 67;
      interval = setInterval(() => {
        // Creep to 99% over 45 seconds (450 ticks)
        if (p < 99) {
          p += (32 / 450);
          if (p > 99) p = 99;
        }
        
        let msg = "Surgically Refining HTML...";
        if (p > 85) msg = "Final Polish...";
        else if (p > 75) msg = "Checking Job Alignment...";

        setLoadingProgress({ 
          message: msg, 
          percent: Math.floor(p) 
        });
      }, 100);

    } else if (generationPhase === 'complete') {
      console.log("Phase: Complete");
      setLoadingProgress({ message: "Finalizing...", percent: 100 });
    }

    return () => clearInterval(interval);
  }, [generationPhase, activeDraftingMessages]);


  // Check for stored API Key and Profile on mount
  useEffect(() => {
    const storedKey = authService.getApiKey();
    if (storedKey) {
      setApiKey(storedKey);
      loadUserProfile();
    }
  }, []);

  const loadUserProfile = () => {
    // First try to load from local disk (Source of Truth)
    const diskProfile = fileSystemService.loadProfileFromDisk();
    if (diskProfile) {
      setState(prev => ({
        ...prev,
        userProfile: diskProfile
      }));
    } else {
      // Fallback to localStorage if needed
      const profile = authService.getUserProfile();
      if (profile) {
        setState(prev => ({
          ...prev,
          userProfile: profile
        }));
      }
    }
  };

  const handleLogin = (key: string, remember: boolean) => {
    authService.setApiKey(key, remember);
    setApiKey(key);
    loadUserProfile();
  };

  const handleLogout = () => {
    authService.clearApiKey();
    setApiKey(null);
    setState({
      status: AppStatus.IDLE,
      userProfile: null,
      jobDetails: { title: '', company: '', description: '' },
      results: null,
      error: null
    });
    setIsAppSaved(false);
  };

  const handleFileSelect = (content: string, fileName: string, persist: boolean) => {
    const userProfile = { content, fileName };
    
    // Always save to local storage for session resilience
    authService.saveUserProfile(userProfile);
    
    // If user checked "Remember", save to disk
    if (persist) {
      fileSystemService.saveProfileToDisk(content);
    }

    setState(prev => ({ ...prev, userProfile }));
  };

  const handleSmartPaste = async () => {
      if (!apiKey) return;
      try {
          const text = await navigator.clipboard.readText();
          if (!text) return;
          
          setGenerationPhase('drafting');
          setActiveDraftingMessages(['Analyzing Job Posting...']);
          setState(prev => ({ ...prev, status: AppStatus.PROCESSING }));

          const details = await parseJobPosting(text, apiKey);
          
          setState(prev => ({
              ...prev,
              jobDetails: details,
              status: AppStatus.IDLE
          }));
          setGenerationPhase('idle');
      } catch (e) {
          console.error("Smart paste failed", e);
          setState(prev => ({ ...prev, status: AppStatus.IDLE }));
          setGenerationPhase('idle');
          alert("Failed to analyze clipboard content. Please paste manually.");
      }
  };

  const handleMasterProfileGeneration = async (answers: Record<string, string>) => {
      if (!apiKey) return;
      setShowProfileWizard(false);
      setGenerationPhase('drafting');
      setActiveDraftingMessages(['Forging Master Profile...']);
      setState(prev => ({ ...prev, status: AppStatus.PROCESSING }));

      try {
          const profileContent = await generateMasterProfile(answers, apiKey);
          
          // Save the generated profile
          const userProfile = { content: profileContent, fileName: 'master_resume.md' };
          
          // Save to disk automatically
          fileSystemService.saveProfileToDisk(profileContent);
          authService.saveUserProfile(userProfile);
          
          setState(prev => ({
              ...prev,
              userProfile: userProfile,
              status: AppStatus.IDLE
          }));
          setGenerationPhase('idle');
      } catch (e) {
          console.error("Profile gen failed", e);
          setState(prev => ({ 
              ...prev, 
              status: AppStatus.ERROR, 
              error: "Failed to generate master profile. Please try again." 
          }));
          setGenerationPhase('idle');
      }
  };

  const handleJobChange = (field: keyof JobDetails, value: string) => {
    setState(prev => ({
      ...prev,
      jobDetails: { ...prev.jobDetails, [field]: value }
    }));
  };

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

  // Handler for Active Application Asset Generation
  const handleActiveAssetGeneration = async (assetType: keyof GeneratedAssets) => {
    if (!state.userProfile || !state.jobDetails.title || !apiKey) return;
    
    setGenerationPhase('drafting');
    setActiveDraftingMessages([`Generating ${assetType}...`]);
    setState(prev => ({ ...prev, status: AppStatus.PROCESSING }));

    try {
        const result = await generateSingleAsset(
            assetType as any, 
            state.userProfile, 
            state.jobDetails, 
            apiKey
        );

        const updatedResults = { ...state.results!, [assetType]: result };
        
        handleAssetsUpdate(updatedResults);
        
        // Determine tab to switch to
        const tabId = getTabIdFromAsset(assetType);
        
        setGenerationPhase('complete');
        setTimeout(() => {
             setState(prev => ({ ...prev, status: AppStatus.COMPLETE }));
             setGenerationPhase('idle');
             setActiveTabResult(tabId); // Switch tab
        }, 800);

    } catch (e) {
        console.error("Single asset generation failed", e);
        setState(prev => ({ 
            ...prev, 
            status: AppStatus.COMPLETE, // Go back to view
            error: "Failed to generate asset. Please try again."
        }));
        setGenerationPhase('idle');
    }
  };

  // Handler for History Asset Generation
  const handleHistoryAssetGeneration = async (recordId: string, assetType: keyof GeneratedAssets, recordContext: ApplicationRecord) => {
      if (!apiKey) return;

      // Reconstruct simple objects from record context
      const profile: UserProfile = { content: recordContext.profileContent, fileName: 'History Profile' };
      const job: JobDetails = { title: recordContext.title, company: recordContext.company, description: recordContext.description };

      // Set Loading Overlay (Without changing main view state status to PROCESSING to avoid unmounting History)
      setGenerationPhase('drafting');
      setActiveDraftingMessages([`Forging ${assetType} for ${job.company}...`]);
      // We manually set status to PROCESSING just to show overlay, but careful not to lose view
      // Actually, LoadingOverlay shows if state.status === PROCESSING.
      // We will temporarily switch status, but keep tab as 'applications'
      const prevStatus = state.status;
      setState(prev => ({ ...prev, status: AppStatus.PROCESSING }));

      try {
          const result = await generateSingleAsset(
              assetType as any,
              profile,
              job,
              apiKey
          );

          // Update Record in FileSystem
          const updatedAssets = { ...recordContext.assets, [assetType]: result };
          const updatedRecord = { ...recordContext, assets: updatedAssets };
          fileSystemService.updateApplicationInHistory(updatedRecord);
          
          setGenerationPhase('complete');
          setTimeout(() => {
              setState(prev => ({ ...prev, status: prevStatus })); // Restore previous status (likely IDLE or COMPLETE)
              setGenerationPhase('idle');
              // Force refresh of history is handled by ApplicationHistory component reloading or internal state update
              // Ideally we callback or the component handles the reload.
              // We can return the result here if needed, but the file system is the source of truth.
          }, 800);
          
          return result; // Return for the UI to update immediately
      } catch (e) {
          console.error("History generation failed", e);
          setState(prev => ({ ...prev, status: prevStatus, error: "Failed to generate asset." }));
          setGenerationPhase('idle');
          throw e;
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.userProfile || !state.jobDetails.title || !state.jobDetails.description || !apiKey) {
      return;
    }

    // Prepare loading messages based on selection
    const messages = ["Drafting Resume..."];
    if (genOptions.coverLetter) messages.push("Writing Cover Letter...");
    if (genOptions.strategy) messages.push("Designing Strategy...");
    if (genOptions.interviewPrep) messages.push("Compiling Interview Prep...");
    if (genOptions.outreach) messages.push("Drafting Emails...");
    
    setActiveDraftingMessages(messages);

    // Start Phase 1
    setState(prev => ({ ...prev, status: AppStatus.PROCESSING, error: null }));
    setGenerationPhase('drafting');
    setIsAppSaved(false);

    try {
      console.log("Starting Generation with options:", genOptions);
      
      // Step 1: Initial Generation
      const results = await generateApplicationAssets(
        state.userProfile, 
        state.jobDetails, 
        apiKey,
        genOptions
      );
      
      console.log("Draft Generated. Starting Refinement...");

      // Start Phase 2
      setGenerationPhase('refining');

      // Step 2: Surgical Refinement (LLM as a Judge)
      const refinedHtml = await refineResume(
          results.resumeHtml, 
          state.jobDetails, 
          state.userProfile, 
          apiKey
      );

      const finalResults = {
          ...results,
          resumeHtml: refinedHtml
      };

      setGenerationPhase('complete');
      console.log("Process Complete.");

      setTimeout(() => {
        setState(prev => ({
            ...prev,
            status: AppStatus.COMPLETE,
            results: finalResults
        }));
        setGenerationPhase('idle');
      }, 800);

    } catch (err) {
      console.error("App Error:", err);
      setState(prev => ({
        ...prev,
        status: AppStatus.ERROR,
        error: err instanceof Error ? err.message : "An unknown error occurred."
      }));
      setGenerationPhase('idle');
    }
  };

  const handleAssetsUpdate = (updatedAssets: GeneratedAssets) => {
    console.log("Asset Update Triggered", updatedAssets);
    setState(prev => ({
      ...prev,
      results: updatedAssets
    }));
    // If user edits content, mark as unsaved so they know to save the new version
    setIsAppSaved(false);
  };

  const handleSaveApplication = () => {
    if (!state.results || !state.jobDetails.title) return;

    // CRITICAL FIX: Saving context (Description & Profile) for future generations
    const record: ApplicationRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: state.jobDetails.title,
      company: state.jobDetails.company || 'Unknown Company',
      description: state.jobDetails.description, // Save JD
      profileContent: state.userProfile?.content || "", // Save Profile Context
      assets: state.results,
      overallStatus: 'active',
      stages: [
        {
          id: '1',
          label: 'Applied',
          completed: true,
          current: true,
          date: new Date().toISOString()
        }
      ]
    };

    fileSystemService.saveApplicationToHistory(record);
    
    // Update state to reflect saved status without resetting the view
    setIsAppSaved(true);
  };

  const resetApp = () => {
    setState(prev => ({
        status: AppStatus.IDLE,
        userProfile: prev.userProfile, 
        jobDetails: { title: '', company: '', description: '' },
        results: null,
        error: null
    }));
    setIsAppSaved(false);
    setActiveTabResult(null);
  };

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* UPDATE NOTIFICATION BANNER */}
      {updateAvailable && (
          <div className="bg-gradient-to-r from-indigo-600 to-brand-600 text-white text-sm font-semibold py-2 px-4 text-center cursor-pointer hover:opacity-95 transition-opacity relative z-50">
              <a href={updateAvailable.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">NEW</span>
                  Version {updateAvailable.version} is available! Click here to download.
              </a>
              <button 
                onClick={() => setUpdateAvailable(null)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
          </div>
      )}
      
      {state.status === AppStatus.PROCESSING && (
        <LoadingOverlay message={loadingProgress.message} progress={loadingProgress.percent} />
      )}
      
      {showProfileWizard && (
          <ProfileWizard 
            onClose={() => setShowProfileWizard(false)}
            onSubmit={handleMasterProfileGeneration}
          />
      )}

      {showUsageModal && (
          <UsageModal onClose={() => setShowUsageModal(false)} />
      )}

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">CareerForge</span>
          </div>

          <div className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'create' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Forge New
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'applications' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Applications
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
             onClick={() => setShowUsageModal(true)}
             className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             Usage
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Dark Mode"
          >
             {darkMode ? (
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
             ) : (
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
               </svg>
             )}
          </button>

          <button 
            onClick={handleLogout}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Log Out
          </button>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {state.status === AppStatus.ERROR && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Generation Failed</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300 leading-relaxed">{state.error}</p>
              <button 
                onClick={() => setState(prev => ({ ...prev, status: AppStatus.IDLE, error: null }))}
                className="mt-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:text-red-800 hover:underline decoration-red-300 underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activeTab === 'applications' ? (
          <ApplicationHistory 
            onGenerateMissing={handleHistoryAssetGeneration}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            
            {/* Input Form */}
            <div className={`lg:col-span-4 flex flex-col gap-6 transition-all duration-500 ease-in-out ${state.status === AppStatus.COMPLETE ? 'lg:hidden' : ''}`}>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">New Application</h2>
                <p className="text-slate-500 dark:text-slate-400">Tailor your profile to a specific role.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 space-y-6 transition-colors">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    fileName={state.userProfile?.fileName || null} 
                    onCreateProfile={() => setShowProfileWizard(true)}
                  />

                  <div className="space-y-4">
                    <div className="flex justify-between items-end mb-1.5">
                         <label htmlFor="jobTitle" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                             Target Role
                         </label>
                         <button
                             type="button"
                             onClick={handleSmartPaste}
                             className="text-xs flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                             title="Auto-fill Title, Company, and Description from your clipboard"
                         >
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                             </svg>
                             Auto-Fill from Clipboard
                         </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        id="jobTitle"
                        required
                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-brand-500 transition-all text-sm p-3 placeholder:text-slate-400 dark:text-white"
                        placeholder="e.g. Senior Product Manager"
                        value={state.jobDetails.title}
                        onChange={(e) => handleJobChange('title', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        required
                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-brand-500 transition-all text-sm p-3 placeholder:text-slate-400 dark:text-white"
                        placeholder="e.g. Acme Corp"
                        value={state.jobDetails.company}
                        onChange={(e) => handleJobChange('company', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="jobDesc" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Job Description
                      </label>
                      <div className="relative">
                        <textarea
                          id="jobDesc"
                          rows={8}
                          required
                          className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-brand-500 transition-all text-sm p-3 resize-none placeholder:text-slate-400 dark:text-white"
                          placeholder="Paste the full JD here..."
                          value={state.jobDetails.description}
                          onChange={(e) => handleJobChange('description', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kit Options */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                          Kit Options
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" checked={genOptions.coverLetter} onChange={e => setGenOptions({...genOptions, coverLetter: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Cover Letter</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" checked={genOptions.strategy} onChange={e => setGenOptions({...genOptions, strategy: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Strategy</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" checked={genOptions.interviewPrep} onChange={e => setGenOptions({...genOptions, interviewPrep: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Interview</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" checked={genOptions.outreach} onChange={e => setGenOptions({...genOptions, outreach: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Outreach</span>
                          </label>
                      </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!state.userProfile || !state.jobDetails.title || !state.jobDetails.company || !state.jobDetails.description || state.status === AppStatus.PROCESSING}
                    className="group w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-500 hover:shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-brand-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 dark:focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="mr-2 h-5 w-5 text-slate-400 dark:text-brand-200 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Generate Assets
                  </button>
                </form>
              </div>
            </div>

            {/* Main Content Area */}
            <div className={`transition-all duration-500 ease-in-out ${state.status === AppStatus.COMPLETE ? 'col-span-12' : 'col-span-12 lg:col-span-8'}`}>
              {state.status === AppStatus.COMPLETE && state.results ? (
                <div className="h-full flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{state.jobDetails.title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">@ {state.jobDetails.company}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={resetApp} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 rounded-lg transition-colors">
                          Discard
                        </button>
                        <button 
                          onClick={handleSaveApplication}
                          disabled={isAppSaved}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow transition-all ${
                            isAppSaved 
                              ? 'bg-emerald-600 text-white cursor-default hover:bg-emerald-600' 
                              : 'bg-brand-600 text-white hover:bg-brand-700'
                          }`}
                        >
                          {isAppSaved ? (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Kit Saved
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                              Application Sent
                            </>
                          )}
                        </button>
                      </div>
                  </div>
                  {/* Reuse Active Asset Generation Handler */}
                  <ResultsTabs 
                    results={state.results} 
                    jobDetails={state.jobDetails} 
                    onUpdate={handleAssetsUpdate}
                    onGenerateMissing={handleActiveAssetGeneration}
                    requestedTab={activeTabResult}
                  />
                </div>
              ) : (
                <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl transition-colors">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 transition-colors">
                      <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-2">No Active Application</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs text-center">Upload your profile and details on the left to generate your career assets.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-600">
             CareerForge™ • Alon Tevet © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
