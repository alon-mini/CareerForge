
import React, { useEffect, useState } from 'react';

const steps = [
  "Analyzing your profile...",
  "Reading job description...",
  "Aligning skills & experience...",
  "Drafting professional resume...",
  "Writing cover letter...",
  "Crafting your interview story..."
];

const LoadingOverlay: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center transition-colors duration-300">
      <div className="text-center max-w-md w-full p-8">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Powering Up...</h3>
        <p className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse h-6">
          {steps[currentStep]}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
