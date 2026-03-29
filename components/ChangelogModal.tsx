import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../Icons';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch';
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.5',
    date: '2026-03-29',
    type: 'patch',
    changes: [
      'Fixed drawing inside Magic Wand selections (even transparent ones!)',
      'Improved image import reliability on Android devices',
      'Added automatic mask clipping for all selection tools',
      'Removed legacy Guide feature to streamline selection workflow',
      'Added this Update Log to keep you informed of new features'
    ]
  },
  {
    version: '1.0.4',
    date: '2026-03-28',
    type: 'patch',
    changes: [
      'Enhanced Magic Wand tool with better tolerance control',
      'Improved Lasso tool precision',
      'Added ability to import images directly into selections',
      'Fixed various UI scaling issues on mobile'
    ]
  },
  {
    version: '1.0.3',
    date: '2026-03-25',
    type: 'patch',
    changes: [
      'Added Frame Manager for bulk frame operations',
      'Improved timeline performance with many frames',
      'Added onion skinning customization'
    ]
  }
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Icons.Help size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">What's New</h2>
                  <p className="text-sm text-gray-500 font-medium">Version {CHANGELOG[0].version}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/80 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <Icons.X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {CHANGELOG.map((entry, index) => (
                <div key={entry.version} className="relative">
                  {index !== CHANGELOG.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-100 -mb-8" />
                  )}
                  <div className="flex gap-4">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      index === 0 ? 'bg-blue-500 text-white ring-4 ring-blue-50' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <span className="text-[10px] font-bold">v{entry.version.split('.')[2]}</span>
                    </div>
                    <div className="space-y-3 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${index === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                          Version {entry.version}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">{entry.date}</span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {entry.changes.map((change, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
