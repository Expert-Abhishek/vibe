'use client';

import { useState, useEffect } from 'react';
import { QrCode, Upload, CheckCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { fetchPaymentSettingsApi, updatePaymentSettingsApi, PaymentSettings } from '@/lib/api';

export default function PaymentSettingsPage() {
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentSettings, setCurrentSettings] = useState<PaymentSettings | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setIsLoading(true);
    fetchPaymentSettingsApi().then((data) => {
      if (data) {
        setUpiId(data.upi_id);
        setQrCodeUrl(data.qr_code_url);
        setCurrentSettings(data);
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setQrCodeUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setMessage({ type: 'error', text: 'UPI ID is required.' });
      return;
    }
    if (!qrCodeUrl.trim()) {
      setMessage({ type: 'error', text: 'Please upload a QR Code image.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const success = await updatePaymentSettingsApi(upiId.trim(), qrCodeUrl.trim());
    setIsSaving(false);

    if (success) {
      setMessage({ type: 'success', text: 'Payment settings updated successfully!' });
      setCurrentSettings({
        upi_id: upiId.trim(),
        qr_code_url: qrCodeUrl.trim()
      });
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <QrCode className="w-6 h-6 text-brand-500" />
          <span>Payment & Top-Up Settings</span>
        </h1>
        <p className="text-xs text-dark-textMuted mt-1">
          Configure the official QR code image and UPI ID shown to customers, drivers, and guides for manual wallet top-ups.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-dark-border shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">Edit Payment Details</h2>
          
          <form onSubmit={handleSave} className="space-y-5">
            {/* UPI ID */}
            <div className="space-y-2">
              <label htmlFor="upiId" className="block text-[11px] font-bold uppercase tracking-wider text-dark-textMuted">
                UPI ID (Virtual Payment Address)
              </label>
              <input
                id="upiId"
                type="text"
                placeholder="e.g. vibe.pay@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-textMuted focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* QR Code Upload */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-dark-textMuted">
                Upload QR Code Image
              </label>
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dark-border border-dashed rounded-xl cursor-pointer bg-dark-bg hover:bg-dark-hover/40 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-brand-500 mb-2" />
                    <p className="text-xs text-gray-300 font-bold">Click to upload QR code</p>
                    <p className="text-[10px] text-dark-textMuted mt-1">PNG, JPG or JPEG format</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
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

        {/* Live Preview & Verification */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="glass-card rounded-2xl p-6 border border-dark-border shadow-xl flex flex-col items-center justify-center text-center">
            <h2 className="text-sm font-bold text-white mb-4 self-start flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-brand-500" />
              <span>Live Edit Preview</span>
            </h2>
            
            <div className="bg-white p-3 rounded-xl shadow-inner mb-4 flex items-center justify-center w-40 h-40 border border-gray-200">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <QrCode className="w-10 h-10 mb-2 animate-pulse" />
                  <span className="text-[9px] font-semibold uppercase">Pending Upload</span>
                </div>
              )}
            </div>

            <div className="w-full bg-dark-bg p-3 rounded-xl border border-dark-border text-left">
              <span className="text-[9px] text-dark-textMuted uppercase font-bold block mb-0.5">Target UPI ID (Edit)</span>
              <span className="text-xs font-bold text-white font-mono break-all">{upiId || 'Not Configured'}</span>
            </div>
          </div>

          {/* Current Saved Configuration */}
          {currentSettings && (
            <div className="glass-card rounded-2xl p-6 border border-dark-border/80 shadow-md flex flex-col items-center justify-center text-center opacity-75 hover:opacity-100 transition-opacity">
              <h2 className="text-xs font-bold text-dark-textMuted mb-3 self-start uppercase tracking-wider">
                Currently Live on App
              </h2>
              
              <div className="bg-white p-3 rounded-xl shadow-inner mb-3 flex items-center justify-center w-36 h-36 border border-gray-200">
                <img
                  src={currentSettings.qr_code_url}
                  alt="Live QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="w-full bg-dark-bg/50 p-2.5 rounded-xl border border-dark-border/50 text-left">
                <span className="text-[9px] text-dark-textMuted uppercase font-bold block mb-0.5">Live UPI ID</span>
                <span className="text-xs font-semibold text-gray-300 font-mono break-all">{currentSettings.upi_id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
