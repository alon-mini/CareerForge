
import React, { useState, useEffect } from 'react';
import { AppState, AppStatus, UserProfile, JobDetails, ApplicationRecord } from './types';
import { generateApplicationAssets } from './services/gemini';
import { authService } from './services/auth';
import { fileSystemService } from './services/fileSystem';
import FileUpload from './components/FileUpload';
import ResultsTabs from './components/ResultsTabs';
import LoadingOverlay from './components/LoadingOverlay';
import LoginScreen from './components/LoginScreen';
import ApplicationHistory from './components/ApplicationHistory';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'applications'>('create');
  const [isAppSaved, setIsAppSaved] = useState(false);
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

  const handleJobChange = (field: keyof JobDetails, value: string) => {
    setState(prev => ({
      ...prev,
      jobDetails: { ...prev.jobDetails, [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.userProfile || !state.jobDetails.title || !state.jobDetails.description || !apiKey) {
      return;
    }

    setState(prev => ({ ...prev, status: AppStatus.PROCESSING, error: null }));
    setIsAppSaved(false);

    try {
      const results = await generateApplicationAssets(state.userProfile, state.jobDetails, apiKey);
      setState(prev => ({
        ...prev,
        status: AppStatus.COMPLETE,
        results
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: AppStatus.ERROR,
        error: err instanceof Error ? err.message : "An unknown error occurred."
      }));
    }
  };

  const handleSaveApplication = () => {
    if (!state.results || !state.jobDetails.title) return;

    const record: ApplicationRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: state.jobDetails.title,
      company: state.jobDetails.company || 'Unknown Company',
      assets: state.results
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
  };

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      {state.status === AppStatus.PROCESSING && <LoadingOverlay />}

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
          {/* Theme Toggle */}
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
          <ApplicationHistory />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            
            {/* Left Sidebar / Input Form */}
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
                  />

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="jobTitle" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Target Role
                      </label>
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
                  {/* CRITICAL UPDATE: Passing jobDetails prop for correct PDF file naming */}
                  <ResultsTabs results={state.results} jobDetails={state.jobDetails} />
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
    </div>
  );
}

export default App;
