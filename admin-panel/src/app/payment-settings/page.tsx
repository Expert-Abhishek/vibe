'use client';

import { useState, useEffect } from 'react';
import { QrCode, Link2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchPaymentSettingsApi, updatePaymentSettingsApi, PaymentSettings } from '@/lib/api';

export default function PaymentSettingsPage() {
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPaymentSettingsApi().then((data) => {
      if (data) {
        setUpiId(data.upi_id);
        setQrCodeUrl(data.qr_code_url);
      }
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || !qrCodeUrl.trim()) {
      setMessage({ type: 'error', text: 'Both fields are required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const success = await updatePaymentSettingsApi(upiId.trim(), qrCodeUrl.trim());
    setIsSaving(false);

    if (success) {
      setMessage({ type: 'success', text: 'Payment settings updated successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update payment settings. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-xs text-dark-textMuted font-bold">Loading payment settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <QrCode className="w-6 h-6 text-brand-500" />
          <span>Payment & Top-Up Settings</span>
        </h1>
        <p className="text-xs text-dark-textMuted mt-1">
          Configure the official QR code and UPI ID shown to customers, drivers, and guides for manual wallet top-ups.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-dark-border shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">Edit Payment Details</h2>
          
          <form onSubmit={handleSave} className="space-y-5">
            {/* UPI ID */}
            <div className="space-y-2">
              <label htmlFor="upiId" className="block text-[11px] font-bold uppercase tracking-wider text-dark-textMuted">
                UPI ID (Virtual Payment Address)
              </label>
              <div className="relative">
                <input
                  id="upiId"
                  type="text"
                  placeholder="e.g. vibe.pay@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* QR Code URL */}
            <div className="space-y-2">
              <label htmlFor="qrCodeUrl" className="block text-[11px] font-bold uppercase tracking-wider text-dark-textMuted">
                QR Code Image URL
              </label>
              <div className="relative">
                <input
                  id="qrCodeUrl"
                  type="text"
                  placeholder="https://example.com/qr-code.png"
                  value={qrCodeUrl}
                  onChange={(e) => setQrCodeUrl(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-dark-textMuted">
                Specify a static QR code image link, or use the QR Code Generator format to dynamically generate one.
              </p>
            </div>

            {/* Notifications */}
            {message && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-xs font-semibold">{message.text}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-black font-bold text-xs rounded-xl shadow-lg shadow-brand-500/15 hover:shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Payment Settings</span>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border shadow-xl flex flex-col items-center justify-center text-center">
          <h2 className="text-sm font-bold text-white mb-4 self-start">QR Code Preview</h2>
          
          <div className="bg-white p-4 rounded-xl shadow-inner mb-4 flex items-center justify-center w-48 h-48 border border-gray-200">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="UPI QR Code Preview"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <QrCode className="w-12 h-12 mb-2" />
                <span className="text-[10px] font-semibold uppercase">No QR URL</span>
              </div>
            )}
          </div>

          <div className="w-full bg-dark-bg p-3.5 rounded-xl border border-dark-border text-left">
            <span className="text-[10px] text-dark-textMuted uppercase font-bold block mb-1">Target UPI ID</span>
            <span className="text-xs font-bold text-white font-mono break-all">{upiId || 'Not Configured'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
