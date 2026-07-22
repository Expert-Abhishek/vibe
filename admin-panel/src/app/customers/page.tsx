'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  Wallet,
  X,
  Phone,
  Mail,
  Car,
  Compass,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { initialCustomers, fetchCustomersApi } from '@/lib/api';
import { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomersApi().then((data) => {
      setCustomersList(data || []);
    });
  }, []);

  const filteredCustomers = customersList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Customer Management</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            View registered tourist profiles, trip histories, and wallet balances.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-textMuted" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden border border-dark-border shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-dark-hover/80 text-dark-textMuted font-bold border-b border-dark-border uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Joined Date</th>
                <th className="py-4 px-6">Trips</th>
                <th className="py-4 px-6">Wallet Balance</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-xs">
                        {customer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{customer.name}</span>
                        <span className="text-[11px] text-dark-textMuted">{customer.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 font-medium text-gray-300">{customer.phone}</td>

                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        customer.status === 'Active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {customer.status === 'Active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {customer.status}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-dark-textMuted">{customer.dateJoined}</td>

                  <td className="py-4 px-6 font-bold text-white">{customer.totalTripsCount} rides</td>

                  <td className="py-4 px-6 font-bold text-brand-500">
                    ₹{customer.walletBalance.toLocaleString('en-IN')}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-black font-bold transition-all text-xs inline-flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Details</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-dark-textMuted">
                    No customers found matching your search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail View Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-black font-black flex items-center justify-center text-lg shadow-lg">
                  {selectedCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedCustomer.name}</h2>
                  <span className="text-xs text-dark-textMuted">Customer ID: {selectedCustomer.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
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
                  <span className="text-xs font-bold text-white mt-1 block flex items-center">
                    <Phone className="w-3 h-3 mr-1 text-brand-500" />
                    {selectedCustomer.phone}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Email</span>
                  <span className="text-xs font-bold text-white mt-1 block truncate flex items-center">
                    <Mail className="w-3 h-3 mr-1 text-brand-500" />
                    {selectedCustomer.email}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Wallet Balance</span>
                  <span className="text-xs font-bold text-brand-500 mt-1 block flex items-center">
                    <Wallet className="w-3 h-3 mr-1" />
                    ₹{selectedCustomer.walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                  <span className="text-[10px] text-dark-textMuted uppercase font-bold block">Total Spent</span>
                  <span className="text-xs font-bold text-green-400 mt-1 block">
                    ₹{selectedCustomer.totalSpent.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Trip History Section */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                  <Car className="w-4 h-4 text-brand-500" />
                  <span>Trip & Booking History</span>
                </h3>

                <div className="space-y-3">
                  {selectedCustomer.recentTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-4 rounded-xl bg-dark-hover/40 border border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {trip.type === 'cab' ? (
                            <Car className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Compass className="w-4 h-4 text-emerald-400" />
                          )}
                          <span className="text-xs font-bold text-white">{trip.title}</span>
                        </div>
                        <p className="text-[11px] text-dark-textMuted">
                          Assigned: {trip.driverOrGuideName || 'N/A'} • {trip.date} • {trip.paymentMode}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-3">
                        <span className="text-xs font-bold text-brand-500">
                          ₹{trip.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">
                          {trip.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {selectedCustomer.recentTrips.length === 0 && (
                    <p className="text-xs text-dark-textMuted italic py-4 text-center">
                      No trip history recorded yet for this customer.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-dark-border bg-dark-card flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
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
