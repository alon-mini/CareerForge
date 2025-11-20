
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (content: string, fileName: string, persist: boolean) => void;
  fileName: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, fileName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rememberProfile, setRememberProfile] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt') && !file.name.endsWith('.markdown')) {
      alert("Please upload a Markdown (.md) or Text (.txt) file.");
      return;
    }
    const text = await file.text();
    onFileSelect(text, file.name, rememberProfile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Your Profile
        </label>
        {fileName && (
          <button 
            onClick={(e) => {
               e.stopPropagation();
               fileInputRef.current?.click();
            }}
            className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300"
          >
            Change
          </button>
        )}
      </div>
      
      <div
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center py-8 px-6
          ${isDragging 
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 scale-[1.02]' 
            : fileName 
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/20' 
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {fileName ? (
          <div className="flex items-center w-full">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mr-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{fileName}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ready to process</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-sm transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Upload Profile
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Drag & drop markdown or text file
            </p>
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".md,.txt,.markdown"
          onChange={handleFileChange}
        />
      </div>

      {!fileName && (
        <div className="mt-3 flex items-center">
          <input
            id="remember-profile"
            type="checkbox"
            checked={rememberProfile}
            onChange={(e) => setRememberProfile(e.target.checked)}
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded"
          />
          <label htmlFor="remember-profile" className="ml-2 block text-xs text-slate-500 dark:text-slate-400">
            Remember this profile for future sessions (saves to disk)
          </label>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
