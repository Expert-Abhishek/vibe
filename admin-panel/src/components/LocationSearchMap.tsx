'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Globe, Check, Loader2, X } from 'lucide-react';

interface LocationSearchMapProps {
  location: string;
  latitude: number;
  longitude: number;
  onLocationChange: (location: string, lat: number, lng: number) => void;
}

const POPULAR_PRESETS = [
  { label: 'Hampi, Karnataka', lat: 15.335000, lng: 76.460000 },
  { label: 'Gokarna Beach', lat: 14.547900, lng: 74.318800 },
  { label: 'Coorg Hills', lat: 12.424400, lng: 75.738200 },
  { label: 'Mysore Palace', lat: 12.305200, lng: 76.655200 },
  { label: 'Bengaluru MG Road', lat: 12.971600, lng: 77.594600 },
  { label: 'Taj Mahal, Agra', lat: 27.175100, lng: 78.042100 },
  { label: 'Calangute, Goa', lat: 15.549400, lng: 73.753500 },
];

export default function LocationSearchMap({
  location,
  latitude,
  longitude,
  onLocationChange,
}: LocationSearchMapProps) {
  const [searchQuery, setSearchQuery] = useState(location || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced Instant Autocomplete Search as admin types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery.trim()
          )}&limit=5`
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
          setShowResults(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('Location search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const parts = item.display_name.split(',').map((s: string) => s.trim());
    // Format place name (e.g. "Taj Mahal, Agra, Uttar Pradesh")
    const formattedName = parts.slice(0, 3).join(', ');

    setSearchQuery(formattedName);
    onLocationChange(formattedName, lat, lng);
    setShowResults(false);
  };

  const handlePresetSelect = (preset: { label: string; lat: number; lng: number }) => {
    setSearchQuery(preset.label);
    onLocationChange(preset.label, preset.lat, preset.lng);
    setShowResults(false);
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`;

  return (
    <div className="space-y-3 p-4 bg-dark-hover/60 rounded-xl border border-dark-border" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-500 uppercase tracking-wider flex items-center space-x-1.5">
          <MapPin className="w-4 h-4" />
          <span>Location Search & Map Pin Picker</span>
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </span>
      </div>

      {/* Autocomplete Location Search Box */}
      <div className="relative">
        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
          Search Location / City * (Type to see suggestions)
        </label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            type="text"
            required
            placeholder="Type location (e.g. Hampi, Taj Mahal Agra, Om Beach Gokarna)..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              onLocationChange(e.target.value, latitude, longitude);
            }}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-9 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
          />

          {isSearching ? (
            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 animate-spin" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Dropdown Instant Search Suggestions */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden divide-y divide-dark-border max-h-56 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left p-2.5 text-xs text-gray-200 hover:bg-dark-hover hover:text-brand-400 flex items-start space-x-2 transition-colors"
              >
                <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold block truncate">{item.display_name.split(',')[0]}</span>
                  <span className="text-[10px] text-gray-400 block truncate">{item.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Presets Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] text-gray-500 uppercase font-bold flex-shrink-0">Presets:</span>
        {POPULAR_PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetSelect(preset)}
            className="px-2.5 py-1 bg-dark-card border border-dark-border hover:border-brand-500 rounded-lg text-[10px] text-gray-300 font-semibold flex-shrink-0 transition-colors"
          >
            📍 {preset.label}
          </button>
        ))}
      </div>

      {/* Embedded Live Google Map Preview */}
      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-dark-border bg-black">
        <iframe
          title="Location Map Selection"
          src={mapEmbedUrl}
          className="w-full h-full border-0"
          allowFullScreen
        />
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-mono border border-white/10 flex items-center space-x-1">
          <Navigation className="w-3 h-3 text-brand-500" />
          <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        </div>
      </div>

      {/* Manual Lat / Lng Fine Tuning */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Latitude (N)
          </label>
          <input
            type="number"
            step="0.000001"
            required
            value={latitude}
            onChange={e => onLocationChange(searchQuery, parseFloat(e.target.value) || 0, longitude)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Longitude (E)
          </label>
          <input
            type="number"
            step="0.000001"
            required
            value={longitude}
            onChange={e => onLocationChange(searchQuery, latitude, parseFloat(e.target.value) || 0)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
}
