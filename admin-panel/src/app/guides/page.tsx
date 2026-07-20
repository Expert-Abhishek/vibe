'use client';

import { useState } from 'react';
import {
  Compass,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Trash2,
  X,
  FileText,
  Star,
} from 'lucide-react';
import { initialGuides } from '@/lib/api';
import { Guide, KYCStatus } from '@/lib/types';

export default function GuidesPage() {
  const [guidesList, setGuidesList] = useState<Guide[]>(initialGuides);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const filteredGuides = guidesList.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.phone.includes(searchTerm) ||
      g.expertise.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: KYCStatus) => {
    setGuidesList((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: newStatus } : g))
    );
    if (selectedGuide && selectedGuide.id === id) {
      setSelectedGuide((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleDeleteGuide = (id: string) => {
    if (confirm('Are you sure you want to delete this guide profile?')) {
      setGuidesList((prev) => prev.filter((g) => g.id !== id));
      if (selectedGuide?.id === id) setSelectedGuide(null);
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
            Review tourist guide certifications, verify expertise badges, approve applications, and handle guide status.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
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
              placeholder="Search by guide name or expertise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Guide Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Guide Name</th>
                <th className="py-4 px-6">Expertise / Specialty</th>
                <th className="py-4 px-6">License ID</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Rating</th>
                <th className="py-4 px-6">Wallet Balance</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {filteredGuides.map((guide) => (
                <tr key={guide.id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs">
                        {guide.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{guide.name}</span>
                        <span className="text-[11px] text-dark-textMuted">{guide.phone}</span>
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
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        guide.status === 'Active'
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

                  <td className="py-4 px-6">
                    <span className="font-bold text-yellow-400 flex items-center">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 mr-1" />
                      {guide.rating}
                    </span>
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
                      <span>View & Verify</span>
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center text-lg shadow-lg">
                  {selectedGuide.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white">{selectedGuide.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedGuide.status === 'Active'
                          ? 'bg-green-500/20 text-green-400'
                          : selectedGuide.status === 'Pending KYC'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {selectedGuide.status}
                    </span>
                  </div>
                  <span className="text-xs text-dark-textMuted">
                    License: {selectedGuide.licenseId || 'N/A'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuide(null)}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Bio & Specialty */}
              <div className="p-4 rounded-xl bg-dark-hover/60 border border-dark-border/80 space-y-2">
                <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Expertise & Bio</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs inline-block">
                  {selectedGuide.expertise}
                </span>
                <p className="text-xs text-gray-300 leading-relaxed mt-2">{selectedGuide.bio}</p>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Phone</span>
                  <span className="text-xs font-bold text-white mt-1 block truncate">
                    {selectedGuide.phone}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Certification</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block truncate">
                    {selectedGuide.licenseId}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Rating</span>
                  <span className="text-xs font-bold text-yellow-400 mt-1 block flex items-center">
                    <Star className="w-3 h-3 fill-yellow-400 mr-1" />
                    {selectedGuide.rating} / 5.0
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Wallet Balance</span>
                  <span className="text-xs font-bold text-white mt-1 block">
                    ₹{selectedGuide.walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Documents Gallery */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Guide Verification Documents</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(selectedGuide.documents).map(([key, url]) => (
                    <div key={key} className="p-3 rounded-xl bg-dark-hover/40 border border-dark-border flex flex-col items-center">
                      <span className="text-[10px] font-bold text-dark-textMuted uppercase mb-2">
                        {key === 'photo' ? 'Profile Photo' : key === 'licenseCert' ? 'Tourism License Cert' : 'ID Proof'}
                      </span>
                      {url ? (
                        <img src={url} alt={key} className="w-full h-36 object-cover rounded-lg border border-dark-border" />
                      ) : (
                        <div className="w-full h-36 bg-dark-hover rounded-lg border border-dashed border-dark-border flex items-center justify-center text-xs text-dark-textMuted">
                          Not Uploaded
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
                  onClick={() => handleUpdateStatus(selectedGuide.id, 'Active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedGuide.status === 'Active'
                      ? 'bg-green-500 text-black'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black'
                  } transition-colors`}
                >
                  Approve / Set Active
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedGuide.id, 'KYC Declined')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedGuide.status === 'KYC Declined'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                  } transition-colors`}
                >
                  Decline KYC
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedGuide.id, 'Inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedGuide.status === 'Inactive'
                      ? 'bg-gray-600 text-white'
                      : 'bg-dark-hover text-gray-400 hover:text-white'
                  } transition-colors`}
                >
                  Deactivate
                </button>
              </div>

              <button
                onClick={() => setSelectedGuide(null)}
                className="px-5 py-2 rounded-xl bg-dark-hover hover:bg-dark-border text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
