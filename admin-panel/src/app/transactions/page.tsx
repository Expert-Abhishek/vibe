'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  SlidersHorizontal,
  X,
  Building2,
  FileText
} from 'lucide-react';
import {
  fetchAllTransactionsApi,
  approveTopupRequestApi,
  rejectTopupRequestApi,
  approveWithdrawalApi,
  rejectWithdrawalApi,
  approveDeductionRequestApi,
  rejectDeductionRequestApi,
  adjustWalletBalanceApi,
  UnifiedTransaction,
} from '@/lib/api';
import { PreviewableImage } from '@/components/ImagePreviewModal';

function TransactionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialType = (searchParams.get('type') as 'all' | 'topup' | 'withdrawal' | 'deduction') || 'all';

  const [typeFilter, setTypeFilter] = useState<'all' | 'topup' | 'withdrawal' | 'deduction'>(initialType);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  
  const [stats, setStats] = useState({
    pendingTopupsCount: 0,
    pendingTopupsSum: 0,
    pendingWithdrawalsCount: 0,
    pendingWithdrawalsSum: 0,
    pendingDeductionsCount: 0,
    pendingDeductionsSum: 0,
  });

  // Modal States
  const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual Adjustment Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualAction, setManualAction] = useState<'credit' | 'debit'>('credit');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const loadData = () => {
    setIsLoading(true);
    fetchAllTransactionsApi(typeFilter, statusFilter).then((res) => {
      setTransactions(res.transactions || []);
      setStats(res.stats);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter]);

  const handleTypeChange = (newType: 'all' | 'topup' | 'withdrawal' | 'deduction') => {
    setTypeFilter(newType);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', newType);
    router.replace(`/transactions?${params.toString()}`);
  };

  // Actions
  const handleApprove = async (tx: UnifiedTransaction) => {
    const confirmMsg =
      tx.type === 'topup'
        ? `Approve Top-Up of ₹${tx.amount} and credit ${tx.user_name}'s wallet?`
        : tx.type === 'withdrawal'
        ? `Mark Withdrawal of ₹${tx.amount} as approved & transferred to UPI/Bank?`
        : `Approve Deduction of ₹${tx.amount} and deduct from ${tx.user_name}'s wallet?`;

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
      alert(`${tx.type.toUpperCase()} transaction approved successfully!`);
      setSelectedTx(null);
      loadData();
    } else {
      alert(`Failed to approve ${tx.type} transaction.`);
    }
  };

  const handleReject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      alert(`${selectedTx.type.toUpperCase()} transaction rejected.`);
      setSelectedTx(null);
      setRejectReason('');
      setShowRejectForm(false);
      loadData();
    } else {
      alert(`Failed to reject ${selectedTx.type} transaction.`);
    }
  };

  const handleManualAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserId.trim() || !manualAmount || parseFloat(manualAmount) <= 0) {
      alert('Please enter a valid User ID and positive amount.');
      return;
    }

    const amountNum = parseFloat(manualAmount) * (manualAction === 'debit' ? -1 : 1);
    const desc = manualDescription.trim() || `Manual ${manualAction.toUpperCase()} by Admin`;

    setIsProcessing(true);
    const success = await adjustWalletBalanceApi(manualUserId.trim(), amountNum, desc);
    setIsProcessing(false);

    if (success) {
      alert(`Successfully ${manualAction === 'credit' ? 'credited' : 'deducted'} ₹${Math.abs(amountNum)} for user ${manualUserId}!`);
      setShowManualModal(false);
      setManualUserId('');
      setManualAmount('');
      setManualDescription('');
      loadData();
    } else {
      alert('Failed to update wallet balance. Please verify User ID.');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const query = searchTerm.toLowerCase();
    return (
      t.user_name.toLowerCase().includes(query) ||
      t.user_id.toLowerCase().includes(query) ||
      (t.upi_id && t.upi_id.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-brand-500" />
            <span>Wallet Operations & Transactions</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Single control hub for Top-Ups (Credit), Withdrawals (Payouts), and Customer Deductions (Debits).
          </p>
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-black font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-brand-500/20 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Manual Wallet Update</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" /> Pending Top-Ups (Credit)
            </span>
            <div className="text-xl font-black text-white font-mono">
              ₹{stats.pendingTopupsSum.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-dark-textMuted">{stats.pendingTopupsCount} requests awaiting verification</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold text-sm">
            +
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> Pending Withdrawals (Payouts)
            </span>
            <div className="text-xl font-black text-white font-mono">
              ₹{stats.pendingWithdrawalsSum.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-dark-textMuted">{stats.pendingWithdrawalsCount} cashout requests queued</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
            -
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Pending Deductions (Customer Pay)
            </span>
            <div className="text-xl font-black text-white font-mono">
              ₹{stats.pendingDeductionsSum.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-dark-textMuted">{stats.pendingDeductionsCount} payment deductions pending</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
            ₹
          </div>
        </div>
      </div>

      {/* Control Bar: Query Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border">
        
        {/* Category Query Filter Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-dark-bg rounded-xl border border-dark-border overflow-x-auto">
          <button
            onClick={() => handleTypeChange('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-brand-500 text-black shadow-md shadow-brand-500/20'
                : 'text-gray-400 hover:text-white hover:bg-dark-hover'
            }`}
          >
            All Operations
          </button>

          <button
            onClick={() => handleTypeChange('topup')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              typeFilter === 'topup'
                ? 'bg-green-500 text-black shadow-md shadow-green-500/20'
                : 'text-gray-400 hover:text-green-400 hover:bg-dark-hover'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Top-Ups (Add Money)</span>
          </button>

          <button
            onClick={() => handleTypeChange('withdrawal')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              typeFilter === 'withdrawal'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-400 hover:text-blue-400 hover:bg-dark-hover'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdrawals (Payout)</span>
          </button>

          <button
            onClick={() => handleTypeChange('deduction')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              typeFilter === 'deduction'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-gray-400 hover:text-amber-400 hover:bg-dark-hover'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Deductions (Customer Pay)</span>
          </button>
        </div>

        {/* Status & Search Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-dark-textMuted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
            >
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved / Processed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search user, ID or UPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

      </div>

      {/* Main Unified Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-xs text-dark-textMuted font-bold">Fetching transaction query ledger...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">User Details</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Operation Type</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Target / Proof Details</th>
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {filteredTransactions.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-dark-hover/40 transition-colors">
                    
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

                    {/* Operation Type Badge */}
                    <td className="py-4 px-6">
                      {tx.type === 'topup' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 font-bold text-[10px]">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>Top-Up (Credit)</span>
                        </span>
                      )}
                      {tx.type === 'withdrawal' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px]">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Withdrawal (Payout)</span>
                        </span>
                      )}
                      {tx.type === 'deduction' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px]">
                          <FileText className="w-3 h-3" />
                          <span>Deduction (Debit)</span>
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 font-bold font-mono text-sm">
                      <span className={tx.type === 'topup' ? 'text-green-400' : tx.type === 'withdrawal' ? 'text-blue-400' : 'text-amber-400'}>
                        {tx.type === 'topup' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Target / Proof Details */}
                    <td className="py-4 px-6 text-gray-300 max-w-xs truncate">
                      {tx.type === 'topup' && (
                        tx.screenshot_url ? (
                          <span className="text-brand-500 font-semibold flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Screenshot Uploaded
                          </span>
                        ) : 'Manual Payment Proof'
                      )}
                      {tx.type === 'withdrawal' && (
                        <span className="font-mono text-gray-300">
                          {tx.upi_id || tx.account_number || 'Bank Account Details'}
                        </span>
                      )}
                      {tx.type === 'deduction' && (
                        <span className="italic text-gray-400">
                          {tx.description || 'Customer Wallet Payment'}
                        </span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-4 px-6 text-dark-textMuted text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'Approved'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : tx.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Process</span>
                      </button>
                    </td>

                  </tr>
                ))}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-dark-textMuted">
                      No {typeFilter === 'all' ? '' : typeFilter} transaction records found for "{statusFilter}" status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect & Action Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Inspection: {selectedTx.type.toUpperCase()} OPERATION</span>
                </h2>
                <p className="text-[10px] text-dark-textMuted mt-0.5">
                  User: {selectedTx.user_name} (₹{selectedTx.amount.toLocaleString('en-IN')})
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

            {/* Modal Content depending on type */}
            <div className="p-6 space-y-4 flex-1">
              
              {/* Type-Specific Details */}
              {selectedTx.type === 'topup' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-300 block">Payment Proof Screenshot:</span>
                  <div className="w-full h-72 rounded-xl overflow-hidden border border-dark-border bg-dark-bg flex items-center justify-center">
                    {selectedTx.screenshot_url ? (
                      <PreviewableImage
                        src={selectedTx.screenshot_url}
                        alt="Top-up proof"
                        title={`Topup Payment Proof Screenshot - ₹${selectedTx.amount}`}
                        className="w-full h-full object-contain"
                        wrapperClassName="w-full h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-dark-textMuted text-xs">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <span>No image attachment provided</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTx.type === 'withdrawal' && (
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-2 text-xs text-gray-300">
                  <div className="font-bold text-white uppercase text-[11px] mb-1">Target Account / Settlement Details</div>
                  <div><span className="text-dark-textMuted font-bold">UPI ID:</span> <span className="font-mono text-brand-500">{selectedTx.upi_id || 'Not provided'}</span></div>
                  {selectedTx.account_number && (
                    <div><span className="text-dark-textMuted font-bold">Bank Account:</span> <span className="font-mono">{selectedTx.account_number}</span></div>
                  )}
                  {selectedTx.ifsc_code && (
                    <div><span className="text-dark-textMuted font-bold">IFSC Code:</span> <span className="font-mono">{selectedTx.ifsc_code}</span></div>
                  )}
                </div>
              )}

              {selectedTx.type === 'deduction' && (
                <div className="space-y-3">
                  <div className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-2 text-xs text-gray-300">
                    <div className="font-bold text-amber-400 uppercase text-[11px] flex items-center justify-between">
                      <span>Platform Fee / Deduction Details</span>
                      {(selectedTx.rawItem as any)?.current_wallet_balance !== undefined && (
                        <span className="text-gray-400 font-mono lowercase text-[10px]">
                          wallet bal: ₹{Number((selectedTx.rawItem as any).current_wallet_balance).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 leading-relaxed font-medium">{selectedTx.description || 'Platform Fee deduction for accepted trip.'}</p>
                    
                    {/* Driver & Vehicle Metadata */}
                    <div className="pt-2 border-t border-dark-border/50 grid grid-cols-2 gap-2 text-[11px]">
                      {(selectedTx.rawItem as any)?.user_phone && (
                        <div>
                          <span className="text-dark-textMuted font-bold">Driver Phone: </span>
                          <span className="text-white font-mono">{(selectedTx.rawItem as any).user_phone}</span>
                        </div>
                      )}
                      {(selectedTx.rawItem as any)?.vehicle_number && (
                        <div>
                          <span className="text-dark-textMuted font-bold">Vehicle: </span>
                          <span className="text-white">{(selectedTx.rawItem as any).vehicle_number} ({(selectedTx.rawItem as any).vehicle_model || 'Cab'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTx.screenshot_url && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-300 block">Attached Receipt / Screenshot:</span>
                      <div className="w-full h-48 rounded-xl overflow-hidden border border-dark-border bg-dark-bg flex items-center justify-center">
                        <PreviewableImage
                          src={selectedTx.screenshot_url}
                          alt="Deduction receipt"
                          title={`Deduction Attached Receipt - Txn #${selectedTx.id}`}
                          className="w-full h-full object-contain"
                          wrapperClassName="w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Common Details Card */}
              <div className="p-3 bg-dark-bg rounded-xl border border-dark-border space-y-1 text-xs text-gray-300">
                <div><span className="text-dark-textMuted font-bold">User Name:</span> {selectedTx.user_name}</div>
                <div><span className="text-dark-textMuted font-bold">User ID:</span> <span className="font-mono">{selectedTx.user_id}</span></div>
                <div><span className="text-dark-textMuted font-bold">Role:</span> <span className="capitalize font-bold text-white">{selectedTx.role}</span></div>
                <div><span className="text-dark-textMuted font-bold">Amount to Deduct:</span> <span className="text-amber-400 font-bold font-mono">₹{selectedTx.amount}</span></div>
                <div><span className="text-dark-textMuted font-bold">Status:</span> {selectedTx.status}</div>
                {selectedTx.reject_reason && (
                  <div className="text-red-400"><span className="font-bold">Rejection Reason:</span> {selectedTx.reject_reason}</div>
                )}
              </div>

              {/* Reject Reason Form */}
              {showRejectForm && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-red-400">Rejection Reason</label>
                  <input
                    type="text"
                    placeholder="Enter reason for rejecting request..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-dark-border bg-dark-card flex items-center justify-between gap-3">
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
                        {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
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
                        {isProcessing
                          ? 'Processing...'
                          : selectedTx.type === 'topup'
                          ? 'Approve & Credit'
                          : selectedTx.type === 'withdrawal'
                          ? 'Approve & Pay Out'
                          : 'Approve & Deduct'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Direct Manual Wallet Balance Adjustment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleManualAdjustSubmit} className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-500" />
                  <span>Manual Wallet Balance Update</span>
                </h2>
                <p className="text-[10px] text-dark-textMuted mt-0.5">
                  Directly add or deduct money from any user's wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-textMuted mb-1">
                  User ID (UUID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-white font-mono placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-textMuted mb-1">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualAction('credit')}
                    className={`py-2 rounded-xl font-bold text-xs transition-all border ${
                      manualAction === 'credit'
                        ? 'bg-green-500/20 text-green-400 border-green-500/40'
                        : 'bg-dark-bg text-gray-400 border-dark-border hover:text-white'
                    }`}
                  >
                    + Add Money (Credit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualAction('debit')}
                    className={`py-2 rounded-xl font-bold text-xs transition-all border ${
                      manualAction === 'debit'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-dark-bg text-gray-400 border-dark-border hover:text-white'
                    }`}
                  >
                    - Deduct Money (Debit)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-textMuted mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3.5 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-white font-mono placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-textMuted mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer manual topup adjustment"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-dark-border bg-dark-card flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 bg-dark-hover text-white text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20"
              >
                {isProcessing ? 'Updating...' : 'Update Wallet Balance'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-xs text-dark-textMuted font-bold">Loading Wallet Transactions...</p>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
