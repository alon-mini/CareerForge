
import React, { useState } from 'react';

interface ProfileWizardProps {
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => void;
}

const ProfileWizard: React.FC<ProfileWizardProps> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    currentTitle: '',
    pitch: '',
    skills: '',
    experience: '',
    education: '',
    languages: ''
  });

  const handleChange = (field: string, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Basics & Contact</h3>
            <p className="text-sm text-slate-500">Let's start with who you are.</p>
            <input 
              placeholder="Full Name" 
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              value={answers.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
                <input 
                placeholder="Email" 
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                value={answers.email}
                onChange={e => handleChange('email', e.target.value)}
                />
                <input 
                placeholder="Phone" 
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                value={answers.phone}
                onChange={e => handleChange('phone', e.target.value)}
                />
            </div>
            <input 
              placeholder="LinkedIn URL" 
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              value={answers.linkedin}
              onChange={e => handleChange('linkedin', e.target.value)}
            />
            <input 
              placeholder="Current Job Title (e.g. Senior Backend Engineer)" 
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              value={answers.currentTitle}
              onChange={e => handleChange('currentTitle', e.target.value)}
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Identity & Pitch</h3>
            <p className="text-sm text-slate-500">What makes you unique? Briefly describe your core value.</p>
            <textarea 
              rows={6}
              placeholder="E.g. I combine strong data engineering skills with a background in finance. I focus on building automated pipelines that save costs..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
              value={answers.pitch}
              onChange={e => handleChange('pitch', e.target.value)}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Technical Skills</h3>
            <p className="text-sm text-slate-500">List your top tools, languages, and methodologies (comma separated).</p>
            <textarea 
              rows={6}
              placeholder="E.g. Python, React, AWS, Docker, Agile, Scrum, Figma, SQL..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
              value={answers.skills}
              onChange={e => handleChange('skills', e.target.value)}
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Experience</h3>
            <p className="text-sm text-slate-500">Paste your recent work history. Don't worry about formatting, the AI will fix it. Include Company, Role, Dates, and key achievements.</p>
            <textarea 
              rows={10}
              placeholder="Google - Senior Dev (2020-2024): Led team of 5, launched X feature... &#10;Amazon - Junior Dev (2018-2020): Fixed bugs in..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
              value={answers.experience}
              onChange={e => handleChange('experience', e.target.value)}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Education & Languages</h3>
            <p className="text-sm text-slate-500">Degrees, certifications, and languages spoken.</p>
            <textarea 
              rows={4}
              placeholder="Education: BS Computer Science, Stanford (2018). &#10;Languages: English (Native), Spanish (Conversational)."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
              value={answers.education}
              onChange={e => handleChange('education', e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Master Profile</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
                <div className="mb-6 flex space-x-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    ))}
                </div>
                {renderStep()}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                <button 
                    onClick={prevStep} 
                    disabled={step === 1}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
                >
                    Back
                </button>
                {step < 5 ? (
                    <button 
                        onClick={nextStep}
                        className="px-6 py-2 bg-slate-900 dark:bg-brand-600 text-white rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-brand-500"
                    >
                        Next
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/30"
                    >
                        Generate Profile
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProfileWizard;
