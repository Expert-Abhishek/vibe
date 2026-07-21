'use client';

import { useState } from 'react';
import { Search, MapPin, Navigation, Globe, Check, Loader2 } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.display_name.split(',').slice(0, 3).join(', ');

    onLocationChange(name, lat, lng);
    setShowResults(false);
    setSearchQuery('');
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`;

  return (
    <div className="space-y-3 p-4 bg-dark-hover/60 rounded-xl border border-dark-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-500 uppercase tracking-wider flex items-center space-x-1.5">
          <MapPin className="w-4 h-4" />
          <span>Interactive Location & Map Pin Picker</span>
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </span>
      </div>

      {/* Location Search Box */}
      <div className="relative">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search location name (e.g. Hampi, Taj Mahal, Goa Beach)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="w-full bg-dark-card border border-dark-border rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-brand-500 text-black font-bold text-xs rounded-xl hover:bg-brand-400 flex items-center space-x-1"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>

        {/* Dropdown Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden divide-y divide-dark-border">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left p-2.5 text-xs text-gray-200 hover:bg-dark-hover hover:text-white flex items-start space-x-2"
              >
                <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{item.display_name}</span>
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
            onClick={() => onLocationChange(preset.label, preset.lat, preset.lng)}
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
            onChange={e => onLocationChange(location, parseFloat(e.target.value) || 0, longitude)}
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
            onChange={e => onLocationChange(location, latitude, parseFloat(e.target.value) || 0)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
}
