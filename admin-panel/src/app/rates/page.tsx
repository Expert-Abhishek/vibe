'use client';

import { useState } from 'react';
import {
  IndianRupee,
  Car,
  Compass,
  Save,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { initialDriverRates, initialGuideRates } from '@/lib/api';
import { DriverRateConfig, GuideRateConfig } from '@/lib/types';

export default function RatesPage() {
  const [activeTab, setActiveTab] = useState<'driver' | 'guide'>('driver');

  const [driverRates, setDriverRates] = useState<DriverRateConfig[]>(initialDriverRates);
  const [guideRates, setGuideRates] = useState<GuideRateConfig[]>(initialGuideRates);

  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const handleDriverRateChange = (
    id: string,
    field: 'dayRate' | 'addonRatePerHour',
    val: number
  ) => {
    setDriverRates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleGuideRateChange = (id: string, val: number) => {
    setGuideRates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dayRate: val } : item))
    );
  };

  const handleSaveDriverRates = () => {
    setSavedNotification('Driver & Vehicle pricing updated successfully!');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handleSaveGuideRates = () => {
    setSavedNotification('Guide daily pricing updated successfully!');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Save Toast Banner */}
      {savedNotification && (
        <div className="fixed top-20 right-6 z-50 bg-green-500 text-black px-4 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-brand-500" />
            <span>Rate & Pricing Control</span>
          </h1>
          <p className="text-xs text-dark-textMuted mt-1">
            Configure daily rates & hourly add-on charges for drivers and daily charges for tour guides.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="bg-dark-card p-1.5 rounded-xl border border-dark-border flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'driver'
                ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20'
                : 'text-gray-400 hover:text-white hover:bg-dark-hover'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Driver Rates (/day + /hr addon)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-white hover:bg-dark-hover'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Guide Rates (/day only)</span>
          </button>
        </div>
      </div>

      {/* DRIVER RATES TAB */}
      {activeTab === 'driver' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <span className="text-gray-200">
                Driver rates include a <strong className="text-white">Per Day Base Rate</strong> for full day bookings + an <strong className="text-white">Hourly Add-On Rate</strong> for extra hours.
              </span>
            </div>
            <button
              onClick={handleSaveDriverRates}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Driver Pricing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {driverRates.map((rate) => (
              <div key={rate.id} className="glass-card rounded-2xl p-5 border border-dark-border hover:border-brand-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img src={rate.image} alt={rate.vehicleName} className="w-14 h-14 rounded-xl object-cover border border-dark-border" />
                      <div>
                        <h3 className="text-base font-bold text-white">{rate.vehicleName}</h3>
                        <span className="text-[11px] text-dark-textMuted font-medium">{rate.capacity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Inputs */}
                  <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                    {/* Day Rate */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-dark-textMuted flex items-center mb-1">
                        <Calendar className="w-3 h-3 mr-1 text-brand-500" />
                        /Day Charge (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          value={rate.dayRate}
                          onChange={(e) => handleDriverRateChange(rate.id, 'dayRate', Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Hourly Addon Rate */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-dark-textMuted flex items-center mb-1">
                        <Clock className="w-3 h-3 mr-1 text-brand-500" />
                        Addon Rate / Hour (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          value={rate.addonRatePerHour}
                          onChange={(e) => handleDriverRateChange(rate.id, 'addonRatePerHour', Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-dark-border/60 flex items-center justify-between text-[11px] text-dark-textMuted">
                  <span>Category Code: <strong className="text-gray-300">{rate.vehicleType}</strong></span>
                  <span className="text-brand-500 font-bold">₹{rate.dayRate}/day + ₹{rate.addonRatePerHour}/hr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GUIDE RATES TAB */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-200">
                Guide rates are set strictly as <strong className="text-white">Per Day Daily Charges</strong> (no hourly add-ons for guides).
              </span>
            </div>
            <button
              onClick={handleSaveGuideRates}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Guide Pricing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guideRates.map((rate) => (
              <div key={rate.id} className="glass-card rounded-2xl p-5 border border-dark-border hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <div>
                  <img src={rate.image} alt={rate.category} className="w-full h-36 rounded-xl object-cover mb-4 border border-dark-border" />
                  <h3 className="text-base font-bold text-white">{rate.category}</h3>
                  <p className="text-xs text-dark-textMuted mt-1 leading-relaxed">{rate.description}</p>

                  {/* Daily Rate Input */}
                  <div className="mt-4 p-4 rounded-xl bg-dark-hover/60 border border-dark-border/80">
                    <label className="text-[10px] font-bold uppercase text-dark-textMuted flex items-center mb-1">
                      <Calendar className="w-3 h-3 mr-1 text-emerald-400" />
                      /Day Charge (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        value={rate.dayRate}
                        onChange={(e) => handleGuideRateChange(rate.id, Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">No hourly add-on applicable</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dark-border/60 flex items-center justify-between text-xs">
                  <span className="text-dark-textMuted">Daily Rate</span>
                  <span className="text-emerald-400 font-extrabold text-sm">₹{rate.dayRate} / day</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
