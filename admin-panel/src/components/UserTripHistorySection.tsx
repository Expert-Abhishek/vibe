'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  RefreshCw,
  Search,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Tag,
} from 'lucide-react';
import { fetchAdminAllTripsApi } from '@/lib/api';

interface UserTripHistorySectionProps {
  userId: string;
  role?: 'tourist' | 'driver' | 'guide';
  userName?: string;
}

export default function UserTripHistorySection({
  userId,
  role = 'tourist',
  userName,
}: UserTripHistorySectionProps) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTripHistory = async () => {
    setLoading(true);
    try {
      const allTrips = await fetchAdminAllTripsApi();
      const userTrips = (allTrips || []).filter((t: any) => {
        const cId = String(t.customerId || '');
        const dId = String(t.driverId || '');
        const name = String(userName || '').toLowerCase();
        const dName = String(t.driverOrGuideName || '').toLowerCase();
        const cName = String(t.customerName || '').toLowerCase();
        const uId = String(userId);

        if (role === 'tourist') {
          return cId === uId || (name && cName.includes(name));
        } else {
          return dId === uId || (name && dName.includes(name));
        }
      });
      setTrips(userTrips);
    } catch (e) {
      console.warn('Error loading user trip history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripHistory();
  }, [userId, role]);

  const filteredTrips = trips.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      String(t.title || '').toLowerCase().includes(q) ||
      String(t.pickupName || '').toLowerCase().includes(q) ||
      String(t.dropName || '').toLowerCase().includes(q) ||
      String(t.id || '').toLowerCase().includes(q) ||
      String(t.status || '').toLowerCase().includes(q)
    );
  });

  const getBadgeClass = (statusStr: string) => {
    const s = String(statusStr || '').toLowerCase();
    if (s.includes('active') || s.includes('start') || s.includes('arrived'))
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s.includes('accepted') || s.includes('confirm'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (s.includes('complete'))
      return 'bg-brand-500/10 text-brand-400 border-brand-500/30';
    if (s.includes('cancel') || s.includes('decline'))
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="space-y-4 bg-dark-hover/30 border border-dark-border/80 p-5 rounded-2xl">
      {/* Section Title & Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dark-border/60 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Trip & Booking History</span>
              <span className="px-2 py-0.5 rounded-full bg-dark-border text-dark-textMuted text-[10px] font-bold">
                {trips.length} trips
              </span>
            </h3>
            <p className="text-[11px] text-dark-textMuted">
              Complete trip log, route checkpoints, OTP verification & payments for {userName || 'this user'}.
            </p>
          </div>
        </div>

        {/* Refresh & Search Bar */}
        <div className="flex items-center space-x-3">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search route, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={loadTripHistory}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Trips Table */}
      <div className="rounded-xl border border-dark-border overflow-hidden">
        {loading && filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-dark-textMuted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-500 mb-2" />
            <p className="text-xs font-medium">Loading trip history...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-dark-textMuted">
            <Car className="w-6 h-6 mx-auto text-dark-textMuted mb-2 opacity-50" />
            <p className="text-xs font-medium">No trip records found for this user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-border bg-dark-hover/60 text-dark-textMuted font-bold uppercase tracking-wider">
                  <th className="p-3">Trip Title</th>
                  <th className="p-3">Partner / Client</th>
                  <th className="p-3">Route (Pickup ➔ Drop)</th>
                  <th className="p-3">OTPs</th>
                  <th className="p-3">Fare</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-hover/30 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white text-xs">{t.title || 'Tour Booking'}</div>
                      <div className="text-[10px] text-dark-textMuted font-mono mt-0.5">
                        #{String(t.id).substring(0, 8)} • {t.bookingType || 'INSTANT'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-gray-200">
                        {role === 'tourist' ? t.driverOrGuideName || 'Assigned Partner' : t.customerName || 'Tourist Client'}
                      </div>
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="flex items-center space-x-1 text-white text-xs truncate">
                        <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                        <span className="truncate">{t.pickupName || 'Pickup Location'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-dark-textMuted text-[10px] truncate mt-0.5">
                        <Navigation className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        <span className="truncate">{t.dropName || 'Drop Location'}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          S: {t.otp || '8240'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          E: {t.endOtp || '4321'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-white text-xs">₹{Number(t.amount || 0).toLocaleString()}</div>
                      <div className="text-[9px] text-dark-textMuted uppercase">{t.paymentMode || 'UPI'}</div>
                    </td>

                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(t.status)}`}>
                        {t.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
