'use client';

import { useEffect, useState } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Percent,
  IndianRupee,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Voucher } from '@/lib/types';
import {
  fetchVouchersApi,
  createVoucherApi,
  updateVoucherApi,
  deleteVoucherApi,
} from '@/lib/api';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formState, setFormState] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minTripAmount: '0',
    maxDiscountAmount: '',
    isActive: true,
    expiryDate: '',
    usageLimit: '',
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVouchers = async () => {
    setLoading(true);
    const data = await fetchVouchersApi();
    setVouchers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingVoucher(null);
    setFormState({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minTripAmount: '0',
      maxDiscountAmount: '',
      isActive: true,
      expiryDate: '',
      usageLimit: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setFormState({
      code: v.code,
      description: v.description || '',
      discountType: v.discountType,
      discountValue: v.discountValue.toString(),
      minTripAmount: v.minTripAmount.toString(),
      maxDiscountAmount: v.maxDiscountAmount ? v.maxDiscountAmount.toString() : '',
      isActive: v.isActive,
      expiryDate: v.expiryDate ? new Date(v.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: v.usageLimit ? v.usageLimit.toString() : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.code.trim()) {
      showNotification('error', 'Voucher code is required');
      return;
    }
    const val = parseFloat(formState.discountValue);
    if (isNaN(val) || val <= 0) {
      showNotification('error', 'Please enter a valid positive discount value');
      return;
    }
    if (formState.discountType === 'percentage' && val > 100) {
      showNotification('error', 'Percentage discount cannot exceed 100%');
      return;
    }

    setSubmitting(true);
    const payload = {
      code: formState.code.trim().toUpperCase(),
      description: formState.description.trim(),
      discountType: formState.discountType,
      discountValue: val,
      minTripAmount: parseFloat(formState.minTripAmount || '0'),
      maxDiscountAmount: formState.maxDiscountAmount ? parseFloat(formState.maxDiscountAmount) : null,
      isActive: formState.isActive,
      expiryDate: formState.expiryDate ? new Date(formState.expiryDate).toISOString() : null,
      usageLimit: formState.usageLimit ? parseInt(formState.usageLimit, 10) : null,
    };

    if (editingVoucher) {
      const res = await updateVoucherApi(editingVoucher.id, payload);
      if (res.success) {
        showNotification('success', res.message || 'Voucher updated successfully!');
        setIsModalOpen(false);
        loadVouchers();
      } else {
        showNotification('error', res.message || 'Failed to update voucher');
      }
    } else {
      const res = await createVoucherApi(payload);
      if (res.success) {
        showNotification('success', res.message || 'Voucher created successfully!');
        setIsModalOpen(false);
        loadVouchers();
      } else {
        showNotification('error', res.message || 'Failed to create voucher');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (v: Voucher) => {
    const res = await updateVoucherApi(v.id, { isActive: !v.isActive });
    if (res.success) {
      showNotification('success', `Voucher '${v.code}' ${!v.isActive ? 'activated' : 'deactivated'}`);
      loadVouchers();
    } else {
      showNotification('error', res.message || 'Failed to update voucher status');
    }
  };

  const handleDelete = async (v: Voucher) => {
    if (!confirm(`Are you sure you want to delete voucher '${v.code}'?`)) return;
    const res = await deleteVoucherApi(v.id);
    if (res.success) {
      showNotification('success', `Voucher '${v.code}' deleted successfully`);
      loadVouchers();
    } else {
      showNotification('error', res.message || 'Failed to delete voucher');
    }
  };

  // Filter logic
  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? v.isActive
        : !v.isActive;
    return matchesSearch && matchesStatus;
  });

  const totalVouchers = vouchers.length;
  const activeCount = vouchers.filter((v) => v.isActive).length;
  const percentCount = vouchers.filter((v) => v.discountType === 'percentage').length;
  const fixedCount = vouchers.filter((v) => v.discountType === 'fixed').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center space-x-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-semibold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
              : 'bg-red-950/90 text-red-300 border-red-500/50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dark-border pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/20">
              <Ticket className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Voucher Management</h1>
              <p className="text-sm text-gray-400 mt-1">
                Create & configure discount vouchers for Tour Packages and Custom Trips.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-brand-500 text-black font-bold hover:bg-brand-400 transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Voucher</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Vouchers</span>
            <Layers className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-3xl font-black text-white">{totalVouchers}</p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Promos</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{activeCount}</p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Percentage Off</span>
            <Percent className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-blue-400">{percentCount}</p>
        </div>

        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-lg">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fixed Discount</span>
            <IndianRupee className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{fixedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vouchers by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-dark-hover/80 border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto bg-dark-hover p-1 rounded-xl border border-dark-border">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-brand-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Grid List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="text-center py-16 bg-dark-card rounded-2xl border border-dark-border">
          <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-300">No vouchers found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery ? 'Try matching a different search term' : 'Click "Create New Voucher" to add your first promotion.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVouchers.map((v) => {
            const isExpired = v.expiryDate && new Date(v.expiryDate) < new Date();

            return (
              <div
                key={v.id}
                className={`bg-dark-card rounded-2xl border transition-all duration-200 hover:border-brand-500/50 flex flex-col justify-between overflow-hidden shadow-xl ${
                  !v.isActive
                    ? 'border-dark-border opacity-70'
                    : isExpired
                    ? 'border-red-900/50'
                    : 'border-dark-border'
                }`}
              >
                {/* Card Top Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="font-mono font-black text-xl text-brand-500 tracking-wider bg-brand-500/10 px-3.5 py-1.5 rounded-xl border border-brand-500/20">
                      {v.code}
                    </span>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          v.discountType === 'percentage'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₹${v.discountValue} OFF`}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 font-medium leading-relaxed mb-4">
                    {v.description || 'No description provided.'}
                  </p>

                  {/* Conditions & Details */}
                  <div className="space-y-2 text-xs text-gray-400 bg-dark-hover/60 p-3.5 rounded-xl border border-dark-border">
                    <div className="flex items-center justify-between">
                      <span>Applies To:</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Plan & Custom Trip
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Min Order Amount:</span>
                      <span className="font-semibold text-gray-200">
                        {v.minTripAmount > 0 ? `₹${v.minTripAmount}` : 'No minimum'}
                      </span>
                    </div>

                    {v.discountType === 'percentage' && v.maxDiscountAmount && (
                      <div className="flex items-center justify-between">
                        <span>Max Discount Cap:</span>
                        <span className="font-semibold text-gray-200">₹{v.maxDiscountAmount}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Total Usage Count:</span>
                      <span className="font-semibold text-gray-200">
                        {v.usedCount} {v.usageLimit ? `/ ${v.usageLimit} max` : 'times used'}
                      </span>
                    </div>

                    {v.expiryDate && (
                      <div className="flex items-center justify-between">
                        <span>Expiry Date:</span>
                        <span className={`font-semibold ${isExpired ? 'text-red-400 font-bold' : 'text-gray-200'}`}>
                          {new Date(v.expiryDate).toLocaleDateString()} {isExpired ? '(Expired)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-6 py-4 bg-dark-hover/40 border-t border-dark-border flex items-center justify-between">
                  {/* Status Toggle Switch */}
                  <button
                    onClick={() => handleToggleStatus(v)}
                    className={`flex items-center space-x-2 text-xs font-bold transition-colors ${
                      v.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {v.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <span>{v.isActive ? 'Active' : 'Inactive'}</span>
                  </button>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(v)}
                      className="p-2 text-gray-400 hover:text-brand-500 hover:bg-dark-hover rounded-lg transition-colors"
                      title="Edit Voucher"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
                      title="Delete Voucher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Create & Edit Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-dark-card w-full max-w-lg rounded-2xl border border-dark-border shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                  <Ticket className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-dark-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Voucher Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIBE20 or SAVE100"
                  value={formState.code}
                  onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm font-mono font-bold text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on all custom trips"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Discount Type Radio Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Discount Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, discountType: 'percentage' })}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                      formState.discountType === 'percentage'
                        ? 'bg-brand-500/10 text-brand-500 border-brand-500'
                        : 'bg-dark-hover text-gray-400 border-dark-border'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    <span>Percentage (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, discountType: 'fixed' })}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                      formState.discountType === 'fixed'
                        ? 'bg-brand-500/10 text-brand-500 border-brand-500'
                        : 'bg-dark-hover text-gray-400 border-dark-border'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4" />
                    <span>Fixed Price (₹)</span>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={formState.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 150'}
                    value={formState.discountValue}
                    onChange={(e) => setFormState({ ...formState, discountValue: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formState.minTripAmount}
                    onChange={(e) => setFormState({ ...formState, minTripAmount: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {formState.discountType === 'percentage' && (
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Max Discount Cap (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 500 (Leave blank for no cap)"
                    value={formState.maxDiscountAmount}
                    onChange={(e) => setFormState({ ...formState, maxDiscountAmount: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formState.expiryDate}
                    onChange={(e) => setFormState({ ...formState, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={formState.usageLimit}
                    onChange={(e) => setFormState({ ...formState, usageLimit: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-500 bg-dark-hover border-dark-border rounded focus:ring-brand-500"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-semibold text-gray-200 cursor-pointer">
                  Active immediately upon creation
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-dark-border text-sm font-semibold text-gray-400 hover:bg-dark-hover hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-black text-sm font-bold hover:bg-brand-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingVoucher ? 'Update Voucher' : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
