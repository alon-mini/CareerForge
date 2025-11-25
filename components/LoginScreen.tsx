
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (apiKey: string, remember: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    onLogin(apiKey.trim(), remember);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-100 dark:bg-brand-900/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-white/50 dark:border-slate-800 p-8 transition-colors">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-slate-900 dark:bg-white p-3 rounded-xl shadow-lg mb-4">
               {/* Generic SVG Logo */}
               <svg className="w-10 h-10 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">CareerForge Desktop</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-center text-sm">Enter your Gemini API Key to begin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gemini API Key
              </label>
              <input
                type="password"
                id="apiKey"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center">
                <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                    Remember Key
                </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-brand-900/20 active:transform active:scale-[0.98] transition-all duration-200"
            >
              Authenticate
            </button>
          </form>
          
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-brand-600 dark:text-brand-400 hover:underline">Get one from Google AI Studio</a>
          </p>

          <div className="mt-8 text-center">
             <p className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest font-medium">
                Alon Tevet &copy; 2025
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
