'use client';

import {
    approveDeductionRequestApi,
    approveTopupRequestApi,
    approveWithdrawalApi,
    fetchDeductionRequestsApi,
    fetchTopupRequestsApi,
    fetchWithdrawalsApi,
    rejectDeductionRequestApi,
    rejectTopupRequestApi,
    rejectWithdrawalApi
} from '@/admin-panel/src/lib/api';
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle,
    Eye,
    MinusCircle,
    RefreshCw,
    Search,
    Wallet,
    X,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface UnifiedTransaction {
    id: string;
    user_id: string;
    user_name: string;
    role: string;
    amount: number;
    type: 'topup' | 'withdrawal' | 'deduction';
    status: string;
    created_at: string;
    details: string;
    raw: any;
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('Pending');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Modal & form states
    const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);

    const loadTransactions = async () => {
        setIsLoading(true);
        try {
            const topupsPromise = fetchTopupRequestsApi(statusFilter);
            const withdrawalsPromise = fetchWithdrawalsApi(statusFilter);
            const deductionsPromise = fetchDeductionRequestsApi(statusFilter);

            const [topups, withdrawals, deductions] = await Promise.all([
                topupsPromise,
                withdrawalsPromise,
                deductionsPromise
            ]);

            const unified: UnifiedTransaction[] = [];

            // Convert Topups
            topups.forEach((t) => {
                unified.push({
                    id: t.id,
                    user_id: t.user_id,
                    user_name: t.user_name || 'Rider',
                    role: t.role || 'tourist',
                    amount: parseFloat(t.amount.toString()),
                    type: 'topup',
                    status: t.status,
                    created_at: t.requested_at,
                    details: 'Proof Screenshot Uploaded',
                    raw: t
                });
            });

            // Convert Withdrawals
            withdrawals.forEach((w) => {
                unified.push({
                    id: w.id,
                    user_id: w.user_id,
                    user_name: w.user_name || 'Partner',
                    role: w.role || 'driver',
                    amount: parseFloat(w.amount.toString()),
                    type: 'withdrawal',
                    status: w.status,
                    created_at: w.created_at,
                    details: w.upi_id ? `UPI: ${w.upi_id}` : (w.account_number ? `Bank A/C: ${w.account_number}` : 'Bank Payout'),
                    raw: w
                });
            });

            // Convert Deductions
            deductions.forEach((d) => {
                unified.push({
                    id: d.id,
                    user_id: d.user_id,
                    user_name: d.user_name || 'Tourist',
                    role: d.role || 'tourist',
                    amount: parseFloat(d.amount.toString()),
                    type: 'deduction',
                    status: d.status,
                    created_at: d.requested_at,
                    details: d.description || 'Wallet Deduction Request',
                    raw: d
                });
            });

            // Sort by requested time (newest first)
            unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTransactions(unified);
        } catch (e) {
            console.error('Error loading transaction requests:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, [statusFilter]);

    const handleApprove = async (tx: UnifiedTransaction) => {
        const confirmMsg = tx.type === 'topup'
            ? 'Are you sure you want to approve this top-up and credit user wallet?'
            : tx.type === 'withdrawal'
                ? 'Mark this withdrawal request as approved/paid? Please transfer funds before cashing out.'
                : 'Are you sure you want to approve this wallet deduction?';

        if (!confirm(confirmMsg)) return;
        setIsProcessing(true);

        let success = false;
        if (tx.type === 'topup') {
            success = await approveTopupRequestApi(tx.id);
        } else if (tx.type === 'withdrawal') {
            success = await approveWithdrawalApi(tx.id);
        } else if (tx.type === 'deduction') {
            success = await approveDeductionRequestApi(tx.id);
        }

        setIsProcessing(false);
        if (success) {
            alert('Transaction approved and processed successfully!');
            setSelectedTx(null);
            loadTransactions();
        } else {
            alert('Failed to approve transaction request.');
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTx) return;
        if (!rejectReason.trim()) {
            alert('Please enter a rejection reason.');
            return;
        }
        setIsProcessing(true);

        let success = false;
        if (selectedTx.type === 'topup') {
            success = await rejectTopupRequestApi(selectedTx.id, rejectReason.trim());
        } else if (selectedTx.type === 'withdrawal') {
            success = await rejectWithdrawalApi(selectedTx.id, rejectReason.trim());
        } else if (selectedTx.type === 'deduction') {
            success = await rejectDeductionRequestApi(selectedTx.id, rejectReason.trim());
        }

        setIsProcessing(false);
        if (success) {
            alert('Transaction request rejected.');
            setSelectedTx(null);
            setRejectReason('');
            setShowRejectForm(false);
            loadTransactions();
        } else {
            alert('Failed to reject transaction request.');
        }
    };

    const filteredTransactions = transactions.filter((tx) => {
        // Type filter
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

        // Search term
        const query = searchTerm.toLowerCase();
        return (
            tx.user_name.toLowerCase().includes(query) ||
            tx.user_id.toLowerCase().includes(query) ||
            tx.details.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-brand-500" />
                        <span>Master Transaction Ledger & Settlements</span>
                    </h1>
                    <p className="text-xs text-dark-textMuted mt-1">
                        Manage top-ups, withdrawals, and tourist deductions/adjustments in a single table. Approve or decline pending queue items.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-bold"
                    >
                        <option value="Pending">Pending Reviews</option>
                        <option value="Approved">Approved Settlements</option>
                        <option value="Rejected">Rejected/Cancelled</option>
                    </select>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-bold"
                    >
                        <option value="all">All Request Types</option>
                        <option value="topup">Top-Ups Only</option>
                        <option value="withdrawal">Withdrawals Only</option>
                        <option value="deduction">Deductions Only</option>
                    </select>

                    {/* Search bar */}
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
                        <input
                            type="text"
                            placeholder="Search by name, ID or details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Unified Table Section */}
            <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
                {isLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-4">
                        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                        <p className="text-xs text-dark-textMuted font-bold">Synchronizing master transactions ledger...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                                    <th className="py-4 px-6">Request Type</th>
                                    <th className="py-4 px-6">User details</th>
                                    <th className="py-4 px-6">Role</th>
                                    <th className="py-4 px-6">Amount</th>
                                    <th className="py-4 px-6">Details / Memo</th>
                                    <th className="py-4 px-6">Date & Time</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border/60">
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-dark-hover/40 transition-colors">
                                        {/* Request Type */}
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase ${tx.type === 'topup'
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                : tx.type === 'withdrawal'
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {tx.type === 'topup' && <ArrowDownLeft className="w-3 h-3 text-blue-400" />}
                                                {tx.type === 'withdrawal' && <ArrowUpRight className="w-3 h-3 text-amber-400" />}
                                                {tx.type === 'deduction' && <MinusCircle className="w-3 h-3 text-red-400" />}
                                                <span>{tx.type}</span>
                                            </span>
                                        </td>

                                        {/* User Details */}
                                        <td className="py-4 px-6">
                                            <div>
                                                <span className="font-bold text-white block">{tx.user_name}</span>
                                                <span className="text-[10px] text-dark-textMuted font-mono">ID: {tx.user_id}</span>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="py-4 px-6">
                                            <span className="capitalize px-2 py-0.5 rounded-md bg-dark-hover border border-dark-border font-semibold text-[10px] text-gray-300">
                                                {tx.role}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td className={`py-4 px-6 font-black text-sm ${tx.type === 'topup' ? 'text-blue-400' : tx.type === 'withdrawal' ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                            {tx.type === 'topup' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                        </td>

                                        {/* Details */}
                                        <td className="py-4 px-6 text-gray-300 max-w-xs truncate">
                                            {tx.details}
                                        </td>

                                        {/* Requested Time */}
                                        <td className="py-4 px-6 text-dark-textMuted">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.status === 'Approved'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : tx.status === 'Rejected'
                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>

                                        {/* Action buttons */}
                                        <td className="py-4 px-6 text-right">
                                            {tx.status === 'Pending' ? (
                                                <div className="flex items-center justify-end space-x-2">
                                                    {tx.type === 'topup' && (
                                                        <button
                                                            onClick={() => setSelectedTx(tx)}
                                                            className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Inspect Screenshot</span>
                                                        </button>
                                                    )}

                                                    {tx.type !== 'topup' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTx(tx);
                                                                    setShowRejectForm(true);
                                                                }}
                                                                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-bold transition-all text-xs inline-flex items-center space-x-1"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                <span>Reject</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprove(tx)}
                                                                className="px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500 hover:text-black text-green-400 font-bold transition-all text-xs inline-flex items-center space-x-1"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                <span>Approve & Settle</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-dark-textMuted font-bold uppercase italic tracking-wider">
                                                    {tx.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-dark-textMuted">
                                            No transaction ledger records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inspect Screenshot & Processing Modal (Only for Topup Proof) */}
            {selectedTx && selectedTx.type === 'topup' && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-dark-border flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top-Up Proof Inspection</h2>
                                <p className="text-[10px] text-dark-textMuted mt-0.5">
                                    Verify screenshot submitted by {selectedTx.user_name} (₹{selectedTx.amount.toLocaleString('en-IN')})
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTx(null);
                                    setShowRejectForm(false);
                                    setRejectReason('');
                                }}
                                className="p-1 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 flex-1">
                            <div className="w-full h-80 rounded-xl overflow-hidden border border-dark-border bg-dark-bg flex items-center justify-center">
                                {selectedTx.raw?.screenshot_url ? (
                                    <img
                                        src={selectedTx.raw?.screenshot_url}
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
                                    <span className="text-dark-textMuted font-bold">User Name:</span> {selectedTx.user_name}
                                </div>
                                <div>
                                    <span className="text-dark-textMuted font-bold">User ID:</span> {selectedTx.user_id}
                                </div>
                                <div>
                                    <span className="text-dark-textMuted font-bold">User Role:</span> {selectedTx.role}
                                </div>
                                <div>
                                    <span className="text-dark-textMuted font-bold">Amount requested:</span> ₹{selectedTx.amount}
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
                                        setSelectedTx(null);
                                        setShowRejectForm(false);
                                        setRejectReason('');
                                    }}
                                    className="px-4 py-2 bg-dark-hover hover:bg-dark-border text-white text-xs font-bold rounded-xl"
                                >
                                    Close
                                </button>
                            </div>

                            {selectedTx.status === 'Pending' && (
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
                                                onClick={handleReject}
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
                                                onClick={() => handleApprove(selectedTx)}
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

            {/* Reject Modal for Withdrawals & Deductions */}
            {showRejectForm && selectedTx && selectedTx.type !== 'topup' && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleReject} className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-dark-border flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reject Request</h2>
                                <p className="text-[10px] text-dark-textMuted mt-0.5">
                                    Rejection will return the status of this {selectedTx.type} request (₹{selectedTx.amount.toLocaleString('en-IN')}) as Rejected.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTx(null);
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
                                placeholder="e.g. Invalid Details or verification failed"
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
                                    setSelectedTx(null);
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
                                {isProcessing ? 'Processing...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
