'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  MapPin,
  UserCheck,
  CreditCard,
  Bell,
  HelpCircle,
  Clock,
  CheckCircle2,
  Download,
  Printer
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const lastUpdated = 'February 6, 2026';

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-dark-card via-dark-hover to-dark-card border border-dark-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Policy Document</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Transparency on how the Vibzz platform collects, processes, protects, and handles personal data for Tourists, Drivers, and Tour Guides.
          </p>
        </div>

        <div className="flex items-center space-x-3 z-10 self-stretch md:self-auto justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-gray-300 hover:text-white hover:bg-dark-card text-xs font-semibold transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Policy</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Table of Contents Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sticky top-24">
            <p className="px-3 text-xs font-bold text-dark-textMuted uppercase tracking-wider mb-3">
              Table of Contents
            </p>
            <nav className="space-y-1">
              {[
                { id: 'overview', label: '1. Overview & Scope', icon: FileText },
                { id: 'information-collected', label: '2. Information We Collect', icon: Eye },
                { id: 'location-data', label: '3. Location & GPS Tracking', icon: MapPin },
                { id: 'how-we-use-data', label: '4. How We Use Information', icon: UserCheck },
                { id: 'financial-security', label: '5. Financial & Wallet Security', icon: CreditCard },
                { id: 'data-sharing', label: '6. Data Sharing & Security', icon: Lock },
                { id: 'user-rights', label: '7. Data Retention & Rights', icon: Bell },
                { id: 'contact-support', label: '8. Privacy Enquiries', icon: HelpCircle },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-brand-500 text-black font-bold shadow-md shadow-brand-500/20'
                        : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-dark-border text-center">
              <span className="text-[11px] text-dark-textMuted flex items-center justify-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                <span>Last Modified: {lastUpdated}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Document Body */}
        <div className="lg:col-span-3 space-y-8">
          {/* 1. Overview & Scope */}
          <section id="overview" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">1. Overview & Scope</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Vibzz (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Vibzz Tourist Mobile Application, Driver Partner Mobile Application, Guide Partner Portal, and Super Admin Management Dashboard. This Privacy Policy governs the collection, usage, processing, and protection of personal data belonging to tourists, cab drivers, auto drivers, and verified tour guides (&quot;Users&quot;).
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              By registering, accessing, or using the Vibzz mobile applications or web platforms, users acknowledge that they have read, understood, and consented to the data practices described in this document.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section id="information-collected" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">2. Information We Collect</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-dark-hover/50 border border-dark-border/80 space-y-2">
                <h3 className="text-brand-500 font-bold text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tourist User Data</span>
                </h3>
                <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                  <li>Full Name & Contact Phone Number</li>
                  <li>Account Authentication Details & Verification OTPs</li>
                  <li>Pickup & Destination Locations</li>
                  <li>Booking History, Tour Package Preferences & Reviews</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-dark-hover/50 border border-dark-border/80 space-y-2">
                <h3 className="text-brand-500 font-bold text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Driver & Guide Partner Data</span>
                </h3>
                <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                  <li>Government-issued ID Proofs (DL, Aadhaar, Commercial RC)</li>
                  <li>Vehicle Specifications, Registration & Plate Numbers</li>
                  <li>Profile Photograph & Online Duty Status</li>
                  <li>Bank Account / UPI Payout Credentials</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Location & GPS Tracking */}
          <section id="location-data" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">3. Location & GPS Tracking Disclosure</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Vibzz collects precise location data (latitude, longitude, and heading) to provide seamless ride-matching and real-time navigation:
            </p>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-1">
                <span className="text-xs font-bold text-brand-500 uppercase tracking-wider block">
                  Driver & Guide Background Location (Duty Mode)
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  When Duty Status is turned ON (&quot;Online&quot;), the Vibzz Driver app collects real-time background location updates. This enables nearby tourists to locate available drivers, enables accurate ETA calculations, and powers live trip tracking on the tourist map. Location tracking automatically stops when Duty Status is turned OFF.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-hover/50 border border-dark-border space-y-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Tourist Foreground Location
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Collected while the application is in active use to pinpoint pickup spots, suggest nearby tourist destinations, and verify arrival at destination checkpoints.
                </p>
              </div>
            </div>
          </section>

          {/* 4. How We Use Information */}
          <section id="how-we-use-data" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">4. How We Use Collected Data</h2>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300">
              <li className="p-3.5 rounded-xl bg-dark-hover/40 border border-dark-border/60 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Facilitating trip requests, dispatching rides to nearby online captains.</span>
              </li>
              <li className="p-3.5 rounded-xl bg-dark-hover/40 border border-dark-border/60 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Verifying dual 4-digit OTPs (Start OTP & End OTP) for ride security.</span>
              </li>
              <li className="p-3.5 rounded-xl bg-dark-hover/40 border border-dark-border/60 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Processing wallet recharges, commission settlements, and daily driver payouts.</span>
              </li>
              <li className="p-3.5 rounded-xl bg-dark-hover/40 border border-dark-border/60 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Emergency SOS alerts, customer support resolution, and safety monitoring.</span>
              </li>
            </ul>
          </section>

          {/* 5. Financial & Wallet Security */}
          <section id="financial-security" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">5. Financial & Wallet Security</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              All financial transactions within the Vibzz platform—including Razorpay online payments, driver wallet top-ups, cash receipts, and admin payout approvals—are secured using industry-standard 256-bit encryption. Sensitive payment tokens and credentials are never stored in plain text.
            </p>
          </section>

          {/* 6. Data Sharing & Security */}
          <section id="data-sharing" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">6. Data Sharing & Disclosure</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Vibzz strictly respects user privacy. We <strong className="text-white">do not sell or rent</strong> personal information to third-party advertisers. Data is shared exclusively with:
            </p>
            <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Assigned Captains / Passengers:</strong> Sharing name, phone number, vehicle number, and pickup location necessary to execute active bookings.</li>
              <li><strong className="text-white">Payment Gateways & SMS Services:</strong> Fast2SMS for OTP verification and Razorpay for payment processing.</li>
              <li><strong className="text-white">Legal Obligations:</strong> Compliance with law enforcement queries or regulatory directives.</li>
            </ul>
          </section>

          {/* 7. Data Retention & Rights */}
          <section id="user-rights" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">7. User Rights & Account Deletion</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Users retain full rights to request access to their profile data, rectify errors, or request complete account deletion. Upon account deletion approval, all personal identification records, vehicle logs, and trip history are permanently anonymized or removed, subject to legal audit retention requirements.
            </p>
          </section>

          {/* 8. Contact Support */}
          <section id="contact-support" className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-dark-border">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">8. Privacy Enquiries & Support</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              For any questions, concerns, or data requests regarding this Privacy Policy or platform security, please contact the Vibzz Administration Team:
            </p>
            <div className="p-4 rounded-xl bg-dark-hover/60 border border-dark-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-brand-500 uppercase tracking-wider block">Vibzz Data Protection Officer</span>
                <span className="text-sm font-semibold text-white">Email: privacy@vibzz.com | Support Hotline: +91 96508 30901</span>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/20 font-bold">
                Available Mon - Sat (9 AM - 7 PM)
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
