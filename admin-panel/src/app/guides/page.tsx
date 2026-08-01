'use client';

import { deleteUserApi, fetchGuidesApi, updateGuideRateApi, updateUserStatusApi, adjustWalletBalanceApi } from '@/lib/api';
import { Guide, KYCStatus } from '@/lib/types';
import {
  CheckCircle,
  Compass,
  Eye,
  FileText,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  X,
  XCircle,
  Star as StarIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import UserWalletHistorySection from '@/components/UserWalletHistorySection';
import UserTripHistorySection from '@/components/UserTripHistorySection';

function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) return true;
  return false;
}

export default function GuidesPage() {
  const [guidesList, setGuidesList] = useState<Guide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  useEffect(() => {
    fetchGuidesApi().then((data) => {
      setGuidesList(data || []);
    });
  }, []);

  const filteredGuides = guidesList.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.phone.includes(searchTerm) ||
      g.expertise.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (id: string, newStatus: KYCStatus) => {
    setGuidesList((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: newStatus } : g))
    );
    if (selectedGuide && selectedGuide.id === id) {
      setSelectedGuide((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    await updateUserStatusApi(id, newStatus);
  };

  const handleDeleteGuide = async (id: string) => {
    if (confirm('Are you sure you want to delete this guide profile?')) {
      setGuidesList((prev) => prev.filter((g) => g.id !== id));
      if (selectedGuide?.id === id) setSelectedGuide(null);
      await deleteUserApi(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            <span>Guide Management & Verification</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Review guide certifications, verify expertise badges, approve applications, and handle guide rates.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending KYC">Pending KYC Only</option>
            <option value="Active">Active Guides</option>
            <option value="KYC Declined">KYC Declined</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search guide name or expertise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Guide Table */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Guide Name</th>
                <th className="py-4 px-6">Expertise / Specialty</th>
                <th className="py-4 px-6">License ID</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Daily Rate (/day)</th>
                <th className="py-4 px-6 text-center">Platform Fee (%)</th>
                <th className="py-4 px-6">Wallet Balance</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {filteredGuides.map((guide) => (
                <tr key={guide.id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      {isValidImageUrl(guide.documents?.photo) ? (
                        <img
                          src={guide.documents.photo!}
                          alt={guide.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/40 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                          {guide.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block text-sm">{guide.name}</span>
                        <span className="text-[11px] text-dark-textMuted block">📞 {guide.phone}</span>
                        {guide.alternatePhone && (
                          <span className="text-[10px] text-emerald-400 font-semibold block">📱 Alt: {guide.alternatePhone}</span>
                        )}
                      </div>
                    </div>
                  </td>


                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px] inline-block">
                      {guide.expertise}
                    </span>
                  </td>

                  <td className="py-4 px-6 font-mono text-dark-textMuted text-[11px]">
                    {guide.licenseId || 'N/A'}
                  </td>

                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${guide.status === 'Active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : guide.status === 'Pending KYC'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                            : guide.status === 'KYC Declined'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                        }`}
                    >
                      {guide.status === 'Active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : guide.status === 'Pending KYC' ? (
                        <ShieldAlert className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {guide.status}
                    </span>
                  </td>

                  <td className="py-4 px-6 font-black text-emerald-400 text-sm">
                    ₹{guide.dailyRate ? guide.dailyRate.toLocaleString('en-IN') : '2,000'} <span className="text-[10px] font-normal text-dark-textMuted">/day</span>
                  </td>

                  <td className="py-4 px-6 text-center font-bold text-amber-500 text-sm">
                    {guide.platformFee !== undefined ? guide.platformFee : '10'}%
                  </td>

                  <td className="py-4 px-6 font-bold text-white">
                    ₹{guide.walletBalance.toLocaleString('en-IN')}
                  </td>

                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedGuide(guide)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Edit</span>
                    </button>

                    {guide.status === 'Pending KYC' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(guide.id, 'Active')}
                          className="px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-black font-bold text-xs transition-colors"
                          title="Approve Guide"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(guide.id, 'KYC Declined')}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs transition-colors"
                          title="Decline Guide"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteGuide(guide.id)}
                      className="p-1.5 rounded-lg text-dark-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Guide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGuides.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-dark-textMuted">
                    No guide records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Detail & Document Inspection Modal */}
      {selectedGuide && (
        <GuideDetailModal
          guide={selectedGuide}
          onClose={() => setSelectedGuide(null)}
          onUpdateStatus={handleUpdateStatus}
          onSaveRate={async (daily, fee) => {
            setGuidesList((prev) =>
              prev.map((g) => (g.id === selectedGuide.id ? { ...g, dailyRate: daily, platformFee: fee } : g))
            );
            setSelectedGuide((prev) => (prev ? { ...prev, dailyRate: daily, platformFee: fee } : null));
            await updateGuideRateApi(selectedGuide.id, daily, fee);
          }}
          onAdjustBalance={async (amount, reason) => {
            const success = await adjustWalletBalanceApi(selectedGuide.id, amount, reason);
            if (success) {
              setGuidesList((prev) =>
                prev.map((g) => (g.id === selectedGuide.id ? { ...g, walletBalance: g.walletBalance + amount } : g))
              );
              setSelectedGuide((prev) => (prev ? { ...prev, walletBalance: prev.walletBalance + amount } : null));
            }
            return success;
          }}
        />
      )}
    </div>
  );
}

function GuideDetailModal({
  guide,
  onClose,
  onUpdateStatus,
  onSaveRate,
  onAdjustBalance,
}: {
  guide: Guide;
  onClose: () => void;
  onUpdateStatus: (id: string, status: KYCStatus) => void;
  onSaveRate: (dailyRate: number, platformFee: number) => void;
  onAdjustBalance: (amount: number, reason: string) => Promise<boolean>;
}) {
  const [dailyRate, setDailyRate] = useState<number>(guide.dailyRate || 2000);
  const [platformFee, setPlatformFee] = useState<number>(guide.platformFee !== undefined ? guide.platformFee : 10);
  const [rateSavedMsg, setRateSavedMsg] = useState(false);

  const [adjType, setAdjType] = useState<'add' | 'deduct'>('add');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isAdjLoading, setIsAdjLoading] = useState(false);
  const [adjMsg, setAdjMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = () => {
    onSaveRate(Number(dailyRate), Number(platformFee));
    setRateSavedMsg(true);
    setTimeout(() => setRateSavedMsg(false), 2500);
  };

  const handleAdjustWallet = async () => {
    const amountNum = parseFloat(adjAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAdjMsg({ type: 'error', text: 'Please enter a valid positive amount.' });
      return;
    }

    setIsAdjLoading(true);
    setAdjMsg(null);

    const actualAmount = adjType === 'add' ? amountNum : -amountNum;
    const desc = adjReason.trim() || `Manual wallet adjustment (${adjType === 'add' ? 'Added' : 'Deducted'} ₹${amountNum})`;

    const success = await onAdjustBalance(actualAmount, desc);
    setIsAdjLoading(false);

    if (success) {
      setAdjAmount('');
      setAdjReason('');
      setAdjMsg({ type: 'success', text: `Wallet balance updated by ₹${actualAmount.toLocaleString('en-IN')}` });
    } else {
      setAdjMsg({ type: 'error', text: 'Failed to adjust wallet balance.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-10">
          <div className="flex items-center space-x-4">
            {isValidImageUrl(guide.documents?.photo) ? (
              <img
                src={guide.documents.photo!}
                alt={guide.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-black font-black flex items-center justify-center text-xl shadow-lg">
                {guide.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{guide.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${guide.status === 'Active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : guide.status === 'Pending KYC'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                >
                  {guide.status}
                </span>
              </div>
              <span className="text-xs text-dark-textMuted">
                License ID: <span className="text-emerald-400 font-bold">{guide.licenseId || 'N/A'}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* RATE MANAGEMENT SECTION (Directly in Guide View) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-dark-hover/80 to-dark-card border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Guide Per-Day Rate & Platform Fee Setup</span>
                </h3>
                <p className="text-[11px] text-dark-textMuted">
                  Set daily charge and individual platform fee for this certified tour guide.
                </p>
              </div>
              {rateSavedMsg && (
                <span className="text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-lg border border-green-500/30 animate-pulse">
                  ✓ Rates Saved!
                </span>
              )}
            </div>

            <div className="pt-2 flex items-end space-x-3">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-dark-textMuted uppercase block mb-1">
                  Daily Charge (₹/day)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    placeholder="2000"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="text-[11px] font-bold text-dark-textMuted uppercase block mb-1">
                  Platform Fee (%)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-sm">%</span>
                  <input
                    type="number"
                    value={platformFee}
                    onChange={(e) => setPlatformFee(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                    placeholder="10"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
              >
                Save Guide Rates
              </button>
            </div>
          </div>

          {/* MANUAL WALLET BALANCE ADJUSTMENT */}
          <div className="p-5 rounded-2xl bg-dark-hover/60 border border-dark-border/80 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-extrabold">₹</span>
              <span>Manual Wallet Balance Adjustment</span>
            </h3>
            <p className="text-[11px] text-dark-textMuted">
              Manually add money or deduct money from this guide's wallet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-[120px]">
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as 'add' | 'deduct')}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="add">Add Balance (+)</option>
                  <option value="deduct">Deduct Balance (-)</option>
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <input
                  type="number"
                  placeholder="Amount (e.g. 500)"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex-[2] min-w-[200px]">
                <input
                  type="text"
                  placeholder="Reason (e.g., Verified top-up screenshot)"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
                />
              </div>
              <button
                onClick={handleAdjustWallet}
                disabled={isAdjLoading}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                {isAdjLoading ? 'Updating...' : 'Update Balance'}
              </button>
            </div>
            {adjMsg && (
              <p className={`text-[11px] font-semibold ${adjMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {adjMsg.text}
              </p>
            )}
          </div>

          {/* Dedicated Wallet History Section */}
          <UserWalletHistorySection userId={guide.id} userName={guide.name} />

          {/* Dedicated Trip History Section */}
          <UserTripHistorySection userId={guide.id} role="guide" userName={guide.name} />

          {/* Bio & Specialty */}
          <div className="p-4 rounded-xl bg-dark-hover/60 border border-dark-border/80 space-y-2">
            <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Expertise & Bio</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs inline-block">
              {guide.expertise}
            </span>
            <p className="text-xs text-gray-300 leading-relaxed mt-2">{guide.bio}</p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
              <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Primary Phone</span>
              <span className="text-xs font-bold text-white mt-1 block truncate">
                📞 {guide.phone}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
              <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Alternate Phone</span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block truncate">
                📱 {guide.alternatePhone || 'Not provided'}
              </span>
            </div>


            <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
              <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Certification</span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block truncate">
                {guide.licenseId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
              <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Rating</span>
              <span className="text-xs font-bold text-yellow-400 mt-1 block flex items-center">
                <Star className="w-3 h-3 fill-yellow-400 mr-1" />
                {guide.rating} / 5.0
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
              <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Wallet Balance</span>
              <span className="text-xs font-bold text-white mt-1 block">
                ₹{guide.walletBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Documents Gallery (Profile Photo & Aadhar / ID Proof) */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Guide Verification Documents & ID Proof</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(guide.documents).map(([key, url]) => (
                <div key={key} className="p-3 rounded-xl bg-dark-hover/40 border border-dark-border flex flex-col items-center">
                  <span className="text-[10px] font-bold text-dark-textMuted uppercase mb-2">
                    {key === 'photo' ? '👤 Profile Photo' : key === 'licenseCert' ? '📜 Tourism License Cert' : '🆔 Aadhar / ID Proof'}
                  </span>
                  {isValidImageUrl(url) ? (
                    <img src={url!} alt={key} className="w-full h-36 object-cover rounded-lg border border-dark-border hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-36 bg-dark-hover rounded-lg border border-dashed border-dark-border flex flex-col items-center justify-center text-xs text-dark-textMuted p-2 text-center">
                      <span>Not Uploaded / Invalid Path</span>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-dark-border bg-dark-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-dark-textMuted">Change Status:</span>
            <button
              onClick={() => onUpdateStatus(guide.id, 'Active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${guide.status === 'Active'
                  ? 'bg-green-500 text-black'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black'
                } transition-colors`}
            >
              Approve / Set Active
            </button>
            <button
              onClick={() => onUpdateStatus(guide.id, 'KYC Declined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${guide.status === 'KYC Declined'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                } transition-colors`}
            >
              Decline KYC
            </button>
            <button
              onClick={() => onUpdateStatus(guide.id, 'Inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${guide.status === 'Inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-dark-hover text-gray-400 hover:text-white'
                } transition-colors`}
            >
              Deactivate
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-dark-hover hover:bg-dark-border text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
