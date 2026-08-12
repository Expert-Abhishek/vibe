'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trash2,
  ShieldAlert,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  HelpCircle,
  FileText
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vibe-backend-tlaw.onrender.com';

function DeleteAccountForm() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';

  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletedDetails, setDeletedDetails] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);

  // Auto-populate phone from URL query parameter if passed
  useEffect(() => {
    if (phoneParam) {
      const clean = phoneParam.replace(/\D/g, '').slice(-10);
      if (clean) setPhone(clean);
    }
  }, [phoneParam]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (step !== 'otp' || timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Send Verification OTP to registered phone
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setStep('otp');
        setTimer(60);
        setSuccessMsg(data.message || `4-Digit verification code sent via SMS to +91 ${cleanPhone}`);
      } else {
        setError(data.message || 'No registered user account found for this mobile number.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to connect to backend server. Please check network connection.');
    }
  };

  // Step 2: Verify OTP & Permanently Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 4) {
      setError('Please enter the 4-digit verification code received via SMS.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setDeletedDetails(data.message);
        setStep('success');
      } else {
        setError(data.message || 'Account deletion failed. Invalid OTP code.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Server communication error. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Policy Card Header Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-dark-card to-dark-card border border-red-500/20 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">Google Play Console Data Safety Portal</span>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">Vibzz Account & Data Deletion</h1>
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          In accordance with Google Play Store policies, users can request self-service permanent deletion of their account, profile attributes, and stored data.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
        {/* Error Alert Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs font-bold text-red-400 block uppercase tracking-wider">Action Error</span>
              <p className="text-xs text-red-200 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && step === 'otp' && (
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-start space-x-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs font-bold text-brand-400 block uppercase tracking-wider">SMS Code Dispatched</span>
              <p className="text-xs text-gray-300 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: ENTER PHONE NUMBER */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Registered Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-sm">
                  +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit registered number"
                  className="w-full bg-dark-hover border border-dark-border focus:border-red-500 text-white rounded-xl pl-14 pr-4 py-3 text-sm font-semibold placeholder-gray-500 transition-all outline-none"
                  required
                />
                <Smartphone className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-gray-400">
                A 4-digit verification code will be sent via SMS to verify account ownership before deletion.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-lg shadow-red-900/30 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP & CONFIRM PERMANENT DELETION */}
        {step === 'otp' && (
          <form onSubmit={handleDeleteAccount} className="space-y-5 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Deleting account for: <strong>+91 {phone}</strong></span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  4-Digit SMS Code
                </label>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={timer > 0 || loading}
                  className="text-[11px] font-bold text-brand-500 hover:underline disabled:text-gray-500"
                >
                  {timer > 0 ? `Resend Code (${timer}s)` : 'Resend SMS Code'}
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit OTP code (e.g. 8240)"
                className="w-full bg-dark-hover border border-dark-border focus:border-red-500 text-white rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest placeholder-gray-600 transition-all outline-none"
                required
              />
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="px-4 py-3 rounded-xl border border-dark-border text-gray-400 hover:text-white hover:bg-dark-hover text-xs font-semibold transition-all flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading || otp.length !== 4}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-lg shadow-red-900/40 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: DELETION SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white">Account Deleted Successfully</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {deletedDetails || `Your Vibzz user profile registered under +91 ${phone} has been permanently deleted.`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-hover border border-dark-border text-left space-y-2 text-xs text-gray-400">
              <div className="flex items-center space-x-2 text-gray-300 font-semibold">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Data Purged Status:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-400">
                <li>User profile attributes & authentication credentials purged</li>
                <li>Driver vehicle records & guide profiles unlinked</li>
                <li>Notification push tokens deleted</li>
              </ul>
            </div>

            <Link
              href="/privacy-policy"
              className="inline-flex items-center space-x-2 text-xs font-semibold text-brand-500 hover:underline pt-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Read Official Privacy & Data Policy</span>
            </Link>
          </div>
        )}

        {/* DATA DISCLOSURE FOOTER SUMMARY (Required by Google Play Console) */}
        <div className="pt-4 border-t border-dark-border space-y-3 text-[11px] text-gray-400">
          <div className="font-bold text-gray-300 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-brand-500" />
            <span>Data Retention & Policy Impact Notice</span>
          </div>
          <p className="leading-relaxed">
            Upon submitting account deletion, your personal credentials, stored preferences, vehicle attachments, and notification records are permanently deleted.
            Completed transaction invoices required for statutory tax accounting audits are retained in anonymized format for statutory compliance.
          </p>
          <div className="flex items-center justify-between text-gray-400 text-[10px] pt-1">
            <span>Support: privacy@vibzz.com</span>
            <span>Hotline: +91 96508 30901</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 text-white">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <div className="min-h-screen bg-dark-bg text-gray-100 p-4 md:p-12 flex flex-col justify-center">
        <DeleteAccountForm />
      </div>
    </Suspense>
  );
}
