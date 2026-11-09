import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-300 cursor-pointer shadow-xs border select-none
        ${isDark 
          ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-inner' 
          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
        } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun size={15} className="text-amber-400 animate-spin-slow transition-transform" />
        ) : (
          <Moon size={15} className="text-blue-600 transition-transform" />
        )}
      </div>

      {showLabel && (
        <span className="uppercase tracking-wider text-[11px]">
          {isDark ? 'Light Ops' : 'Dark Ops'}
        </span>
      )}
    </button>
  );
}
