'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vibe-backend-tlaw.onrender.com';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';

  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

  // Auto-populate phone from URL query param
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

  // Step 1: Send OTP to registered mobile number
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
        setError(data.message || 'No account registered with this phone number. Please check your number.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to connect to backend server. Please try again.');
    }
  };

  // Step 2: Verify OTP and update password in backend DB
  const handleVerifyAndUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 4) {
      setError('Please enter the 4-digit OTP code received via SMS.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setVerifiedUser({ phone: cleanPhone });
        setStep('success');
        setSuccessMsg(data.message || 'Password reset successfully in backend database!');
      } else {
        setError(data.message || 'Invalid or expired 4-digit OTP code. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Server error while resetting password. Please try again.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-[#12141A]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-xl">
            V
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Vibzz Account Security</h1>
            <p className="text-xs text-gray-400">Official Web Password Recovery Portal</p>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-sm">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && step !== 'success' && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-emerald-400 text-sm">
            <span className="text-lg">✅</span>
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* STEP 1: Enter Registered Phone */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Registered Mobile Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-amber-400 font-bold text-sm select-none">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#1A1D26] border border-white/15 focus:border-amber-400 text-white rounded-xl pl-14 pr-4 py-3.5 text-base font-semibold tracking-wider outline-none transition-all placeholder:text-gray-600"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Make sure to enter the mobile number registered with your Vibzz account. We will verify your account and send a 4-digit OTP.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center space-x-2 ${
                loading || phone.length !== 10
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Account...</span>
                </>
              ) : (
                <>
                  <span>Send 4-Digit Verification OTP</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter 4-Digit OTP and Set New Password */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyAndUpdatePassword} className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Verifying <strong className="text-white">+91 {phone}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError(null);
                }}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Change Number
              </button>
            </div>

            {/* 4-Digit OTP Code */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                4-Digit Verification OTP Code
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="• • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#1A1D26] border border-amber-400/50 focus:border-amber-400 text-amber-400 rounded-xl px-4 py-3.5 text-center text-2xl font-black tracking-[0.5em] outline-none transition-all placeholder:text-gray-700"
                autoFocus
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 4 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#1A1D26] border border-white/15 focus:border-amber-400 text-white rounded-xl px-4 pr-12 py-3.5 text-sm font-medium outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-xs text-gray-400 hover:text-white"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1A1D26] border border-white/15 focus:border-amber-400 text-white rounded-xl px-4 py-3.5 text-sm font-medium outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 4 || !newPassword || !confirmPassword}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center space-x-2 ${
                loading || otp.length !== 4 || !newPassword || !confirmPassword
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password in Backend...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Update Password</span>
                  <span>✓</span>
                </>
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={timer > 0 || loading}
                onClick={() => handleSendOtp()}
                className={`text-xs font-semibold ${
                  timer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-amber-400 hover:underline'
                }`}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : 'Did not receive code? Resend OTP via SMS'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Password Reset Successful Confirmation */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-3xl mx-auto animate-bounce">
              ✓
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Password Updated!</h2>
              <p className="text-sm text-gray-300 mt-2">
                Your password for account <strong className="text-amber-400">+91 {verifiedUser?.phone || phone}</strong> has been successfully updated in the database.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 leading-relaxed">
              🔐 You can now log in securely using your mobile number and your new password across the mobile application and web portals.
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/"
                className="block w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-400/20"
              >
                Go to Dashboard Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
