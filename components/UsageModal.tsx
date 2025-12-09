
import React, { useEffect, useState } from 'react';
import { fileSystemService } from '../services/fileSystem';
import { TokenStats } from '../types';

interface UsageModalProps {
  onClose: () => void;
}

const UsageModal: React.FC<UsageModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<TokenStats | null>(null);

  useEffect(() => {
    const data = fileSystemService.getUsageStats();
    setStats(data);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                API Usage & Cost
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {!stats ? (
                <p className="text-center text-slate-500">Loading usage data...</p>
            ) : (
                <div className="space-y-6">
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Total Cost (Est)</p>
                            <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                                ${stats.totalCost.toFixed(3)}
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Tokens</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {stats.totalTokens.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Model</th>
                                    <th className="px-4 py-3 font-medium text-right">Tokens</th>
                                    <th className="px-4 py-3 font-medium text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.entries(stats.modelBreakdown).map(([model, data]) => (
                                    <tr key={model} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{model}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-right">{data.tokens.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-right">${data.cost.toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                        * Estimates based on standard Gemini 1.5 pricing as a proxy for the 2.5 series. Actual billing may vary.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default UsageModal;