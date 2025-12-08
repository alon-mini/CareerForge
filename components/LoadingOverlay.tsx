
import React, { useEffect, useState } from 'react';

const steps = [
  "Analyzing your profile...",
  "Reading job description...",
  "Aligning skills & experience...",
  "Drafting professional resume...",
  "Writing cover letter...",
  "Crafting your interview story...",
  "QA Agent: Reviewing against Job Description...",
  "QA Agent: Surgically refining resume...",
  "Finalizing assets..."
];

const LoadingOverlay: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 2.5s per step * 9 steps = ~22.5s total estimated time
    // This aligns with the latency of two sequential Gemini Pro calls
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Calculate progress percentage
  const progress = Math.min(100, Math.round(((currentStep + 1) / steps.length) * 100));

  return (
    <div className="fixed inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center transition-colors duration-300">
      <div className="max-w-md w-full p-8 flex flex-col items-center">
        
        {/* Header Text */}
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Forging Application</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Please wait while we craft your kit</p>

        {/* Progress Bar Container */}
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
          {/* Animated Gradient Bar */}
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 relative transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer Effect overlay */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>

        {/* Status Text & Percentage */}
        <div className="w-full flex justify-between items-center mt-3">
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400 animate-pulse transition-all duration-300">
            {steps[currentStep]}
          </p>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
            {progress}%
          </span>
        </div>

      </div>
      
      {/* Inline styles for the shimmer animation since tailwind.config isn't accessible here */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
