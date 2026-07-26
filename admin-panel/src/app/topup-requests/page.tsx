'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, CheckCircle, XCircle, Search, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { fetchTopupRequestsApi, approveTopupRequestApi, rejectTopupRequestApi, TopupRequest } from '@/lib/api';

export default function TopupRequestsPage() {
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [selectedReq, setSelectedReq] = useState<TopupRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    fetchTopupRequestsApi(statusFilter).then((data) => {
      setRequests(data || []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this top-up and credit user wallet?')) return;
    setIsProcessing(true);
    const success = await approveTopupRequestApi(id);
    setIsProcessing(false);
    if (success) {
      alert('Top-up request approved and wallet credited!');
      setSelectedReq(null);
      loadRequests();
    } else {
      alert('Failed to approve top-up request.');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setIsProcessing(true);
    const success = await rejectTopupRequestApi(id, rejectReason.trim());
    setIsProcessing(false);
    if (success) {
      alert('Top-up request rejected.');
      setSelectedReq(null);
      setRejectReason('');
      setShowRejectForm(false);
      loadRequests();
    } else {
      alert('Failed to reject top-up request.');
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-brand-500" />
            <span>Wallet Top-Up Screenshot Approvals</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Verify manual payment screenshots submitted by users. Approved requests credit the wallet instantly.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved Transactions</option>
            <option value="Rejected">Rejected Transactions</option>
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search by user name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-xs text-dark-textMuted font-bold">Fetching top-up ledger...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">User Details</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Top-Up Amount</th>
                  <th className="py-4 px-6">Time Initiated</th>
                  <th className="py-4 px-6">Status</th>
                  {statusFilter === 'Rejected' && <th className="py-4 px-6">Rejection Reason</th>}
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-dark-hover/40 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-bold text-white block">{req.user_name}</span>
                        <span className="text-[10px] text-dark-textMuted font-mono">ID: {req.user_id}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-dark-hover border border-dark-border font-semibold text-[10px] text-gray-300">
                        {req.role}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-bold text-brand-500 text-sm">
                      ₹{parseFloat(req.amount.toString()).toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-6 text-dark-textMuted">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : req.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    {statusFilter === 'Rejected' && (
                      <td className="py-4 px-6 text-red-400 font-semibold italic text-xs max-w-xs truncate">
                        {req.reject_reason || 'N/A'}
                      </td>
                    )}

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Screenshot</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={statusFilter === 'Rejected' ? 8 : 7} className="py-12 text-center text-dark-textMuted">
                      No top-up request records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Screenshot & Processing Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top-Up Proof Inspection</h2>
                <p className="text-[10px] text-dark-textMuted mt-0.5">
                  Verify screenshot submitted by {selectedReq.user_name} (₹{parseFloat(selectedReq.amount.toString()).toLocaleString('en-IN')})
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className="p-1 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 flex-1">
              <div className="w-full h-80 rounded-xl overflow-hidden border border-dark-border bg-dark-bg flex items-center justify-center">
                {selectedReq.screenshot_url ? (
                  <img
                    src={selectedReq.screenshot_url}
                    alt="Payment screenshot proof"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-dark-textMuted">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <span>No screenshot attachment found</span>
                  </div>
                )}
              </div>

              {/* Status details */}
              <div className="p-3 bg-dark-bg rounded-xl border border-dark-border space-y-1.5 text-xs text-gray-300">
                <div>
                  <span className="text-dark-textMuted font-bold">User Name:</span> {selectedReq.user_name}
                </div>
                <div>
                  <span className="text-dark-textMuted font-bold">User ID:</span> {selectedReq.user_id}
                </div>
                <div>
                  <span className="text-dark-textMuted font-bold">User Role:</span> {selectedReq.role}
                </div>
                <div>
                  <span className="text-dark-textMuted font-bold">Amount requested:</span> ₹{selectedReq.amount}
                </div>
              </div>

              {/* Reject Reason input form */}
              {showRejectForm && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-red-400">Rejection Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Invalid screenshot or Transaction ID mismatch"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-dark-border bg-dark-card flex items-center justify-between gap-3 flex-wrap">
              <div>
                <button
                  onClick={() => {
                    setSelectedReq(null);
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 bg-dark-hover hover:bg-dark-border text-white text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>

              {selectedReq.status === 'Pending' && (
                <div className="flex items-center space-x-2">
                  {showRejectForm ? (
                    <>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="px-3 py-2 bg-dark-hover text-gray-300 text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(selectedReq.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20"
                      >
                        {isProcessing ? 'Rejecting...' : 'Reject Top-up'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-bold rounded-xl"
                      >
                        Reject...
                      </button>
                      <button
                        onClick={() => handleApprove(selectedReq.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-black text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25"
                      >
                        {isProcessing ? 'Approving...' : 'Approve & Credit'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
