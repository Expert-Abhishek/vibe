'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Compass, ShieldAlert } from 'lucide-react';

export default function RatesRedirectPage() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto border border-brand-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">Rate Setup Updated</h2>
          <p className="text-xs text-dark-textMuted leading-relaxed">
            Global Rate Setup has been removed. Individual driver and guide daily/hourly rates are managed directly inside their respective profiles.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push('/drivers')}
            className="flex items-center space-x-2 bg-brand-500 text-black px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-brand-400"
          >
            <Car className="w-4 h-4" />
            <span>Go to Drivers</span>
          </button>

          <button
            onClick={() => router.push('/guides')}
            className="flex items-center space-x-2 bg-dark-hover text-white border border-dark-border px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Go to Guides</span>
          </button>
        </div>
      </div>
    </div>
  );
}
