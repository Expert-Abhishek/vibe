'use client';

import {
  Users,
  Car,
  Compass,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  initialCustomers,
  initialDrivers,
  initialGuides,
  getDashboardStats,
} from '@/lib/api';

export default function DashboardPage() {
  const stats = getDashboardStats(
    initialCustomers.length,
    initialDrivers.length,
    initialGuides.length
  );

  const pendingDrivers = initialDrivers.filter((d) => d.status === 'Pending KYC').length;
  const pendingGuides = initialGuides.filter((g) => g.status === 'Pending KYC').length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card via-dark-hover to-dark-card p-6 rounded-2xl border border-dark-border shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Welcome back, Admin 👋
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Real-time platform metrics, revenue tracking & pending KYC approvals.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-500 text-xs font-bold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>Platform Active</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <div className="glass-card p-5 rounded-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{stats.totalCustomers}</span>
            <span className="text-xs font-bold text-green-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +14%
            </span>
          </div>
          <p className="text-[11px] text-dark-textMuted mt-2">Active tourist accounts</p>
        </div>

        {/* Total Drivers */}
        <div className="glass-card p-5 rounded-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">
              Total Drivers
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{stats.totalDrivers}</span>
            {pendingDrivers > 0 && (
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {pendingDrivers} Pending
              </span>
            )}
          </div>
          <p className="text-[11px] text-dark-textMuted mt-2">Registered cab partners</p>
        </div>

        {/* Total Guides */}
        <div className="glass-card p-5 rounded-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">
              Total Guides
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{stats.totalGuides}</span>
            {pendingGuides > 0 && (
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {pendingGuides} Pending
              </span>
            )}
          </div>
          <p className="text-[11px] text-dark-textMuted mt-2">Verified local experts</p>
        </div>

        {/* Total Revenue */}
        <div className="glass-card p-5 rounded-2xl transition-all hover:-translate-y-1 border-brand-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-textMuted uppercase tracking-wider">
              Gross Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-black flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-green-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +22.4%
            </span>
          </div>
          <p className="text-[11px] text-dark-textMuted mt-2">Platform booking volume</p>
        </div>
      </div>

      {/* Revenue Graph & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Revenue & Trips Performance</h3>
              <p className="text-xs text-dark-textMuted">Monthly gross earnings in INR</p>
            </div>
            <div className="px-3 py-1 bg-dark-hover border border-dark-border rounded-lg text-xs text-gray-300 font-medium">
              Year 2026
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5C518" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F5C518" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232733" vertical={false} />
                <XAxis dataKey="month" stroke="#8B93A7" fontSize={12} tickLine={false} />
                <YAxis stroke="#8B93A7" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12141A', borderColor: '#232733', borderRadius: '12px', color: '#fff' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F5C518" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Recent Platform Activity</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            <div className="space-y-4">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl bg-dark-hover/70 border border-dark-border/60 flex items-start space-x-3">
                  {act.type === 'kyc_pending' ? (
                    <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  ) : act.type === 'registration' ? (
                    <div className="p-2 rounded-lg bg-blue-400/10 text-blue-400 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-green-400/10 text-green-400 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{act.user}</p>
                    <p className="text-[11px] text-dark-textMuted mt-0.5">{act.detail}</p>
                    <span className="text-[10px] text-gray-500 block mt-1">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(pendingDrivers > 0 || pendingGuides > 0) && (
            <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between">
              <span>{pendingDrivers + pendingGuides} Pending KYC Approvals</span>
              <a href="/drivers" className="underline text-brand-500 font-bold hover:text-white">
                Review Now
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
