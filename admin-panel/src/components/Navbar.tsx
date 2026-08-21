'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, RefreshCw, X, ArrowUpRight, Image as ImageIcon, FileText } from 'lucide-react';
import Link from 'next/link';
import { fetchTopupRequestsApi, fetchWithdrawalsApi, fetchDeductionRequestsApi } from '@/lib/api';

interface NavbarProps {
  onRefresh?: () => void;
}

export default function Navbar({ onRefresh }: NavbarProps) {
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingDeductions, setPendingDeductions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newAlert, setNewAlert] = useState<{ id: string; text: string; link: string } | null>(null);
  
  const prevTopupsRef = useRef<string[]>([]);
  const prevDeductionsRef = useRef<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    try {
      const topups = await fetchTopupRequestsApi('Pending');
      const withdrawals = await fetchWithdrawalsApi('Pending');
      const deductions = await fetchDeductionRequestsApi('Pending');
      
      setPendingTopups(topups || []);
      setPendingWithdrawals(withdrawals || []);
      setPendingDeductions(deductions || []);

      // Check if there are new topups
      const currentTopupIds = (topups || []).map((t: any) => t.id);
      const newTopups = (topups || []).filter((t: any) => !prevTopupsRef.current.includes(t.id));
      
      if (newTopups.length > 0 && prevTopupsRef.current.length > 0) {
        const latest = newTopups[0];
        setNewAlert({
          id: latest.id,
          text: `🔔 Top-Up Request: ${latest.user_name} uploaded payment proof for ₹${latest.amount}!`,
          link: '/transactions?type=topup'
        });
        setTimeout(() => setNewAlert(null), 8000);
      }
      prevTopupsRef.current = currentTopupIds;

      // Check if there are new deductions (Driver accepted ride)
      const currentDedIds = (deductions || []).map((d: any) => d.id);
      const newDeductions = (deductions || []).filter((d: any) => !prevDeductionsRef.current.includes(d.id));

      if (newDeductions.length > 0 && prevDeductionsRef.current.length > 0) {
        const latestDed = newDeductions[0];
        setNewAlert({
          id: latestDed.id,
          text: `🚕 Driver Accepted Trip: ${latestDed.user_name} platform fee deduction of ₹${latestDed.amount} is pending approval!`,
          link: '/transactions?type=deduction'
        });
        setTimeout(() => setNewAlert(null), 8000);
      }
      prevDeductionsRef.current = currentDedIds;
    } catch (e) {
      console.warn('Error fetching alerts in Navbar:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 8 seconds for real-time notifications
    const interval = setInterval(fetchAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalNotifications = pendingTopups.length + pendingWithdrawals.length + pendingDeductions.length;

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

      {/* Floating Real-time Toast Banner */}
      {newAlert && (
        <div className="fixed top-20 right-6 bg-brand-500 text-black border border-yellow-600 rounded-xl p-4 shadow-2xl z-50 flex items-start justify-between gap-4 max-w-md animate-bounce">
          <div className="text-xs font-black leading-snug">
            <p>{newAlert.text}</p>
            <Link 
              href={newAlert.link} 
              onClick={() => setNewAlert(null)} 
              className="mt-2 inline-block px-3 py-1 bg-black text-brand-500 text-[10px] uppercase font-black tracking-wider rounded-lg"
            >
              Review Now
            </Link>
          </div>
          <button onClick={() => setNewAlert(null)} className="p-1 hover:bg-black/10 rounded-lg text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {onRefresh && (
          <button
            onClick={() => {
              onRefresh();
              fetchAlerts();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-hover hover:bg-dark-border text-xs text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
            <span>Sync</span>
          </button>
        )}

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative cursor-pointer p-2 rounded-xl hover:bg-dark-hover text-gray-300"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 flex items-center justify-center text-[7px] text-black font-extrabold">
                  {totalNotifications}
                </span>
              </>
            )}
          </div>

          {showDropdown && (
            <div className="absolute right-0 mt-2.5 w-80 bg-dark-card border border-dark-border rounded-2xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-dark-border flex items-center justify-between font-bold text-white text-[11px] uppercase tracking-wider">
                <span>Platform Alerts Queue</span>
                <span className="bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full text-[9px]">
                  {totalNotifications} Pending
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-dark-border/40">
                {pendingDeductions.map((item) => (
                  <Link 
                    key={item.id} 
                    href="/transactions?type=deduction"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-start gap-3 p-3.5 hover:bg-dark-hover/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">🚕 Driver Trip Platform Fee</span>
                      <span className="text-[10px] text-dark-textMuted mt-0.5 block">
                        {item.user_name} ({item.role}) • ₹{item.amount} pending approval
                      </span>
                    </div>
                  </Link>
                ))}

                {pendingTopups.map((item) => (
                  <Link 
                    key={item.id} 
                    href="/transactions?type=topup"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-start gap-3 p-3.5 hover:bg-dark-hover/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">💵 Top-up Screenshot Approval</span>
                      <span className="text-[10px] text-dark-textMuted mt-0.5 block">
                        {item.user_name} (ID: {item.user_id}) requested ₹{item.amount}
                      </span>
                    </div>
                  </Link>
                ))}

                {pendingWithdrawals.map((item) => (
                  <Link 
                    key={item.id} 
                    href="/transactions?type=withdrawal"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-start gap-3 p-3.5 hover:bg-dark-hover/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">💸 Bank Withdrawal Cashout</span>
                      <span className="text-[10px] text-dark-textMuted mt-0.5 block">
                        {item.user_name} (UPI: {item.upi_id || 'Bank'}) requested ₹{item.amount}
                      </span>
                    </div>
                  </Link>
                ))}

                {totalNotifications === 0 && (
                  <div className="py-8 text-center text-dark-textMuted font-semibold italic text-[11px]">
                    No pending alerts at the moment.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Avatar */}
        <div className="flex items-center space-x-3 pl-3 border-l border-dark-border">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-black flex items-center justify-center font-bold text-sm shadow-md">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-white">Administrator</span>
            <span className="block text-[10px] text-green-400 font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1 animate-pulse"></span>
              Live Sync
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
