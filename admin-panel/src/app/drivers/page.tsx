'use client';

import { useState, useEffect } from 'react';
import {
  Car,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Trash2,
  X,
  FileText,
  Camera,
  Star,
} from 'lucide-react';
import { initialDrivers, fetchDriversApi, updateUserStatusApi, deleteUserApi } from '@/lib/api';
import { Driver, KYCStatus } from '@/lib/types';

export default function DriversPage() {
  const [driversList, setDriversList] = useState<Driver[]>(initialDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    fetchDriversApi().then((data) => {
      if (data && data.length > 0) {
        setDriversList(data);
      }
    });
  }, []);

  const filteredDrivers = driversList.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (id: string, newStatus: KYCStatus) => {
    setDriversList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
    if (selectedDriver && selectedDriver.id === id) {
      setSelectedDriver((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    await updateUserStatusApi(id, newStatus);
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Are you sure you want to delete this driver profile?')) {
      setDriversList((prev) => prev.filter((d) => d.id !== id));
      if (selectedDriver?.id === id) setSelectedDriver(null);
      await deleteUserApi(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-brand-500" />
            <span>Driver Management & KYC</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Review driver documents, verify vehicle photos, approve KYC applications, and manage driver status.
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
            <option value="Active">Active Drivers</option>
            <option value="KYC Declined">KYC Declined</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
            <input
              type="text"
              placeholder="Search driver or car number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Driver Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Driver Info</th>
                <th className="py-4 px-6">Vehicle Details</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Rating</th>
                <th className="py-4 px-6">Wallet Balance</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-500 font-bold flex items-center justify-center text-xs">
                        {driver.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{driver.name}</span>
                        <span className="text-[11px] text-dark-textMuted">{driver.phone}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className="font-semibold text-gray-200 block">{driver.vehicleModel}</span>
                    <span className="text-[11px] text-brand-500 font-bold uppercase">{driver.vehicleNumber}</span>
                  </td>

                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        driver.status === 'Active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : driver.status === 'Pending KYC'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                          : driver.status === 'KYC Declined'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {driver.status === 'Active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : driver.status === 'Pending KYC' ? (
                        <ShieldAlert className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {driver.status}
                    </span>
                  </td>

                  <td className="py-4 px-6">
                    <span className="font-bold text-yellow-400 flex items-center">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 mr-1" />
                      {driver.rating}
                    </span>
                  </td>

                  <td className="py-4 px-6 font-bold text-white">
                    ₹{driver.walletBalance.toLocaleString('en-IN')}
                  </td>

                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Verify</span>
                    </button>

                    {driver.status === 'Pending KYC' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(driver.id, 'Active')}
                          className="px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-black font-bold text-xs transition-colors"
                          title="Approve Driver KYC"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(driver.id, 'KYC Declined')}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs transition-colors"
                          title="Decline Driver KYC"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="p-1.5 rounded-lg text-dark-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-dark-textMuted">
                    No driver records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Detail & KYC Documents Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-black font-black flex items-center justify-center text-lg shadow-lg">
                  {selectedDriver.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white">{selectedDriver.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedDriver.status === 'Active'
                          ? 'bg-green-500/20 text-green-400'
                          : selectedDriver.status === 'Pending KYC'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {selectedDriver.status}
                    </span>
                  </div>
                  <span className="text-xs text-dark-textMuted">
                    {selectedDriver.vehicleModel} • {selectedDriver.vehicleNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Phone</span>
                  <span className="text-xs font-bold text-white mt-1 block truncate">
                    {selectedDriver.phone}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">License No</span>
                  <span className="text-xs font-bold text-brand-500 mt-1 block truncate">
                    {selectedDriver.licenseNumber || 'Not provided'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Rating</span>
                  <span className="text-xs font-bold text-yellow-400 mt-1 block flex items-center">
                    <Star className="w-3 h-3 fill-yellow-400 mr-1" />
                    {selectedDriver.rating} / 5.0
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Wallet Balance</span>
                  <span className="text-xs font-bold text-white mt-1 block">
                    ₹{selectedDriver.walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* KYC Documents Gallery */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <span>KYC Documents Inspection</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(selectedDriver.docs).map(([key, url]) => (
                    <div key={key} className="p-3 rounded-xl bg-dark-hover/40 border border-dark-border flex flex-col items-center">
                      <span className="text-[10px] font-bold text-dark-textMuted uppercase mb-2">
                        {key === 'photo' ? 'Profile Photo' : key === 'rc' ? 'RC Copy' : key === 'dl' ? 'Driving License' : key === 'insurance' ? 'Insurance' : 'Aadhar Card'}
                      </span>
                      {url ? (
                        <img src={url} alt={key} className="w-full h-28 object-cover rounded-lg border border-dark-border" />
                      ) : (
                        <div className="w-full h-28 bg-dark-hover rounded-lg border border-dashed border-dark-border flex items-center justify-center text-xs text-dark-textMuted">
                          Not Attached
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Car Photos Gallery */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-brand-500" />
                  <span>Vehicle Photos Inspection (4 Angles)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(selectedDriver.carPhotos).map(([angle, url]) => (
                    <div key={angle} className="p-3 rounded-xl bg-dark-hover/40 border border-dark-border flex flex-col items-center">
                      <span className="text-[10px] font-bold text-dark-textMuted uppercase mb-2">
                        {angle} View
                      </span>
                      {url ? (
                        <img src={url} alt={angle} className="w-full h-32 object-cover rounded-lg border border-dark-border" />
                      ) : (
                        <div className="w-full h-32 bg-dark-hover rounded-lg border border-dashed border-dark-border flex items-center justify-center text-xs text-dark-textMuted">
                          No Photo
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
                  onClick={() => handleUpdateStatus(selectedDriver.id, 'Active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedDriver.status === 'Active'
                      ? 'bg-green-500 text-black'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black'
                  } transition-colors`}
                >
                  Approve / Set Active
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedDriver.id, 'KYC Declined')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedDriver.status === 'KYC Declined'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                  } transition-colors`}
                >
                  Decline KYC
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedDriver.id, 'Inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedDriver.status === 'Inactive'
                      ? 'bg-gray-600 text-white'
                      : 'bg-dark-hover text-gray-400 hover:text-white'
                  } transition-colors`}
                >
                  Deactivate
                </button>
              </div>

              <button
                onClick={() => setSelectedDriver(null)}
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
