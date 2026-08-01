'use client';

import React, { useEffect, useState } from 'react';
import { fetchAdminAllTripsApi } from '@/lib/api';
import {
  Car,
  Clock,
  Navigation,
  RefreshCw,
  Search,
  ShieldAlert,
  DollarSign,
  MapPin,
} from 'lucide-react';

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadTrips() {
    setLoading(true);
    try {
      const data = await fetchAdminAllTripsApi();
      setTrips(data || []);
    } catch (e) {
      console.warn('Failed to load admin trips:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
    const interval = setInterval(loadTrips, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Filter & Search Logic
  const filteredTrips = trips.filter((t) => {
    const statusLower = String(t.status || '').toLowerCase();

    let matchesFilter = true;
    if (activeFilter === 'active') {
      matchesFilter =
        statusLower.includes('active') ||
        statusLower.includes('accepted') ||
        statusLower.includes('start') ||
        statusLower.includes('arrived');
    } else if (activeFilter === 'upcoming') {
      matchesFilter =
        statusLower.includes('pending') ||
        statusLower.includes('confirm') ||
        t.bookingType === 'PRE_BOOKED';
    } else if (activeFilter === 'completed') {
      matchesFilter = statusLower.includes('complete') || statusLower.includes('finish');
    } else if (activeFilter === 'cancelled') {
      matchesFilter = statusLower.includes('cancel') || statusLower.includes('decline');
    }

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      String(t.customerName || '').toLowerCase().includes(query) ||
      String(t.driverOrGuideName || '').toLowerCase().includes(query) ||
      String(t.pickupName || '').toLowerCase().includes(query) ||
      String(t.dropName || '').toLowerCase().includes(query) ||
      String(t.id || '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const activeCount = trips.filter((t) => {
    const s = String(t.status || '').toLowerCase();
    return s.includes('active') || s.includes('accepted') || s.includes('start') || s.includes('arrived');
  }).length;

  const totalRevenue = trips.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const getBadgeClass = (statusStr: string) => {
    const s = String(statusStr || '').toLowerCase();
    if (s.includes('active') || s.includes('start') || s.includes('arrived'))
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (s.includes('accepted') || s.includes('confirm'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('complete'))
      return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
    if (s.includes('cancel') || s.includes('decline'))
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card p-6 rounded-2xl border border-dark-border shadow-xl">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-brand-500/10 text-brand-500 rounded-xl">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">User Trips & Live Tracking</h1>
              <p className="text-sm text-dark-textMuted">
                Monitor all tourist bookings, active rides, pre-scheduled tours & completed trips in real-time.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadTrips}
          className="flex items-center space-x-2 px-4 py-2.5 bg-dark-hover hover:bg-dark-border border border-dark-border rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 text-brand-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Trips</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">Total Bookings</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{trips.length}</p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">Active Live Rides</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">{activeCount}</p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">Scheduled Tours</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">
            {trips.filter((t) => t.bookingType === 'PRE_BOOKED').length}
          </p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">Total Booking Value</span>
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-brand-500 mt-2">₹{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border shadow-md">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { key: 'all', label: 'All Trips' },
            { key: 'active', label: 'Live Active' },
            { key: 'upcoming', label: 'Scheduled' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === tab.key
                  ? 'bg-brand-500 text-black shadow-md shadow-brand-500/20'
                  : 'bg-dark-hover text-dark-textMuted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
          <input
            type="text"
            placeholder="Search tourist, driver, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Trips Data Table */}
      <div className="bg-dark-card rounded-2xl border border-dark-border shadow-xl overflow-hidden">
        {loading && filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-dark-textMuted">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
            <p className="text-sm font-medium">Fetching live trips from database...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-dark-textMuted">
            <ShieldAlert className="w-8 h-8 mx-auto text-dark-textMuted mb-3" />
            <p className="text-sm font-medium">No trips matching criteria found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-border bg-dark-hover/50 text-dark-textMuted font-bold uppercase tracking-wider">
                  <th className="p-4">Trip Details</th>
                  <th className="p-4">Tourist (Client)</th>
                  <th className="p-4">Driver / Guide</th>
                  <th className="p-4">Pickup ➔ Drop Point</th>
                  <th className="p-4">Verification OTPs</th>
                  <th className="p-4">Amount & Payment</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-hover/40 transition-colors">
                    {/* Trip Details */}
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{t.title || 'Tour Booking'}</div>
                      <div className="flex items-center space-x-2 text-[11px] text-dark-textMuted mt-0.5">
                        <span className="font-mono text-brand-500">#{String(t.id).substring(0, 8)}</span>
                        <span>•</span>
                        <span className="capitalize">{t.bookingType || 'INSTANT'}</span>
                      </div>
                    </td>

                    {/* Tourist Info */}
                    <td className="p-4">
                      <div className="font-semibold text-white">{t.customerName || 'Tourist Client'}</div>
                      <div className="text-[11px] text-dark-textMuted">{t.customerPhone || 'Verified Account'}</div>
                    </td>

                    {/* Driver / Guide */}
                    <td className="p-4">
                      <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                        <Car className="w-3.5 h-3.5" />
                        <span>{t.driverOrGuideName || 'Assigned Partner'}</span>
                      </div>
                      <div className="text-[11px] text-dark-textMuted capitalize">{t.tripType || 'Cab Service'}</div>
                    </td>

                    {/* Route Locations */}
                    <td className="p-4 max-w-xs">
                      <div className="flex items-center space-x-1 text-white font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span className="truncate">{t.pickupName || 'Pickup Location'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-dark-textMuted text-[11px] truncate mt-0.5">
                        <Navigation className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate">{t.dropName || 'Drop Point'}</span>
                      </div>
                    </td>

                    {/* OTP Security */}
                    <td className="p-4">
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          Start: {t.otp || '8240'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                          End: {t.endOtp || '4321'}
                        </span>
                      </div>
                    </td>

                    {/* Amount & Mode */}
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">₹{Number(t.amount || 0).toLocaleString()}</div>
                      <span className="text-[10px] font-semibold text-dark-textMuted uppercase px-1.5 py-0.5 bg-dark-hover rounded">
                        {t.paymentMode || 'UPI / Wallet'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getBadgeClass(t.status)}`}>
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
