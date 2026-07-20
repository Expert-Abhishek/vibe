'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onRefresh?: () => void;
}

export default function Navbar({ onRefresh }: NavbarProps) {
  return (
    <header className="h-16 bg-dark-card/90 backdrop-blur-md border-b border-dark-border px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Global Search Bar */}
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
        <input
          type="text"
          placeholder="Search drivers, customers, bookings..."
          className="w-full pl-10 pr-4 py-2 bg-dark-hover/70 border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-hover hover:bg-dark-border text-xs text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
            <span>Sync</span>
          </button>
        )}

        <div className="relative cursor-pointer p-2 rounded-xl hover:bg-dark-hover text-gray-300">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
        </div>

        {/* Admin Avatar */}
        <div className="flex items-center space-x-3 pl-3 border-l border-dark-border">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-black flex items-center justify-center font-bold text-sm shadow-md">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-white">Administrator</span>
            <span className="block text-[10px] text-green-400 font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1"></span>
              Live Sync
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
