'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, CheckCircle, XCircle, Search, RefreshCw, X } from 'lucide-react';
import { fetchWithdrawalsApi, approveWithdrawalApi, rejectWithdrawalApi, WithdrawalRequest } from '@/lib/api';

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states for rejection
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    fetchWithdrawalsApi(statusFilter).then((data) => {
      setRequests(data || []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!confirm('Mark this withdrawal request as approved/paid? Please transfer funds to the user UPI address before marking.')) return;
    setIsProcessing(true);
    const success = await approveWithdrawalApi(id);
    setIsProcessing(false);
    if (success) {
      alert('Withdrawal request approved successfully!');
      loadRequests();
    } else {
      alert('Failed to approve withdrawal request.');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setIsProcessing(true);
    const success = await rejectWithdrawalApi(selectedReq.id, rejectReason.trim());
    setIsProcessing(false);
    if (success) {
      alert('Withdrawal request rejected and balance refunded.');
      setSelectedReq(null);
      setRejectReason('');
      setShowRejectForm(false);
      loadRequests();
    } else {
      alert('Failed to reject withdrawal request.');
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.upi_id && r.upi_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-brand-500" />
            <span>Withdrawals & Bank Settlements</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Approve cashout requests submitted by drivers, guides, and tourists. Mark as approved after cashing out to their target UPI IDs.
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
            <option value="Approved">Approved Settlements</option>
            <option value="Rejected">Rejected Settlements</option>
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search by name, ID or UPI..."
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
            <p className="text-xs text-dark-textMuted font-bold">Fetching withdrawals queue...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">User details</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Withdraw Amount</th>
                  <th className="py-4 px-6">UPI Address</th>
                  <th className="py-4 px-6">Requested Time</th>
                  <th className="py-4 px-6">Status</th>
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

                    <td className="py-4 px-6 font-mono text-gray-300">
                      {req.upi_id || 'Bank Transfer (details in profile)'}
                    </td>

                    <td className="py-4 px-6 text-dark-textMuted">
                      {new Date(req.created_at).toLocaleString()}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : req.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setShowRejectForm(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-bold transition-all text-xs inline-flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500 hover:text-black text-green-400 font-bold transition-all text-xs inline-flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve / Pay</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-dark-textMuted font-semibold uppercase italic">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-dark-textMuted">
                      No withdrawal requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectForm && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleReject} className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reject Withdrawal</h2>
                <p className="text-[10px] text-dark-textMuted mt-0.5">
                  Refund will return ₹{parseFloat(selectedReq.amount.toString()).toLocaleString('en-IN')} to {selectedReq.user_name}'s wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className="p-1 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-red-400">Rejection Reason</label>
              <input
                type="text"
                placeholder="e.g. Invalid UPI ID or verification failed"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="p-4 border-t border-dark-border bg-dark-card flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-dark-hover hover:bg-dark-border text-white text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-bold rounded-xl shadow-lg"
              >
                {isProcessing ? 'Processing...' : 'Confirm Reject & Refund'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
