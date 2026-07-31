'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  Tag,
} from 'lucide-react';
import { fetchUserWalletHistoryApi, WalletHistoryTransaction } from '@/lib/api';

interface UserWalletHistorySectionProps {
  userId: string;
  userName?: string;
  refreshTrigger?: number;
}

export default function UserWalletHistorySection({ userId, userName, refreshTrigger = 0 }: UserWalletHistorySectionProps) {
  const [transactions, setTransactions] = useState<WalletHistoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    const res = await fetchUserWalletHistoryApi(userId, page, limit, typeFilter, searchTerm);
    setTransactions(res.transactions || []);
    if (res.pagination) {
      setTotalPages(res.pagination.totalPages || 1);
      setTotalRecords(res.pagination.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [userId, page, limit, typeFilter, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  return (
    <div className="space-y-4 bg-dark-hover/30 border border-dark-border/80 p-5 rounded-2xl">
      {/* Section Title & Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dark-border/60 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Wallet History & Audit Ledger</span>
              <span className="px-2 py-0.5 rounded-full bg-dark-border text-dark-textMuted text-[10px] font-bold">
                {totalRecords} records
              </span>
            </h3>
            <p className="text-[11px] text-dark-textMuted">
              Complete credit/debit transaction log for {userName || 'this user'}.
            </p>
          </div>
        </div>

        {/* Refresh & Quick Controls */}
        <button
          onClick={loadHistory}
          disabled={loading}
          className="self-start md:self-auto px-3 py-1.5 rounded-lg bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-textMuted" />
          <input
            type="text"
            placeholder="Search Txn ID, order, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
          />
        </form>

        {/* Filters & Limit */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <div className="flex items-center space-x-1.5 bg-dark-bg border border-dark-border px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-dark-textMuted" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-dark-card text-white">All Types</option>
              <option value="credit" className="bg-dark-card text-white">Credits (+)</option>
              <option value="debit" className="bg-dark-card text-white">Debits (-)</option>
              <option value="topup" className="bg-dark-card text-white">Top-ups</option>
              <option value="withdrawal" className="bg-dark-card text-white">Withdrawals</option>
              <option value="platform_fee" className="bg-dark-card text-white">Platform Fees</option>
              <option value="trip_earning" className="bg-dark-card text-white">Trip Earnings</option>
            </select>
          </div>

          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="bg-dark-bg border border-dark-border text-xs text-white px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value={5} className="bg-dark-card">5 / page</option>
            <option value={10} className="bg-dark-card">10 / page</option>
            <option value={20} className="bg-dark-card">20 / page</option>
            <option value={50} className="bg-dark-card">50 / page</option>
          </select>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="overflow-x-auto rounded-xl border border-dark-border/80 bg-dark-card/60">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Txn ID / Payment Ref</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Reason / Description</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-dark-textMuted">
                  <div className="inline-flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                    <span>Loading wallet history...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                const isCredit = tx.direction === 'Credit';
                const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={tx.id} className="hover:bg-dark-hover/40 transition-colors">
                    <td className="py-3.5 px-4 text-dark-textMuted font-medium text-[11px] whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-dark-textMuted shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300 font-semibold truncate max-w-[140px]">
                      {tx.paymentId || tx.id.slice(0, 8)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCredit
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-3 h-3 mr-1 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 mr-1 text-red-400" />
                        )}
                        {tx.type.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold whitespace-nowrap">
                      <span className={isCredit ? 'text-green-400' : 'text-red-400'}>
                        {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-200 font-medium text-[11px] max-w-[220px] truncate">
                      {tx.description}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-10 text-center text-dark-textMuted text-xs italic">
                  No wallet transactions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-dark-textMuted">
            Showing Page <span className="font-bold text-white">{page}</span> of{' '}
            <span className="font-bold text-white">{totalPages}</span> ({totalRecords} total transactions)
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 rounded-xl bg-dark-bg border border-dark-border text-xs font-semibold text-white hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-xs font-bold text-brand-500 px-2">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-xl bg-dark-bg border border-dark-border text-xs font-semibold text-white hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
