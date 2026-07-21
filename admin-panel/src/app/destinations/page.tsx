'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Compass
} from 'lucide-react';
import { Destination } from '@/lib/types';
import {
  fetchDestinationsApi,
  createDestinationApi,
  updateDestinationApi,
  toggleDestinationStatusApi,
  deleteDestinationApi,
  initialDestinations
} from '@/lib/api';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    imageUrls: '',
    videoUrls: '',
    isActive: true,
  });

  // Media Zoom Preview State
  const [activeMediaPreview, setActiveMediaPreview] = useState<{ type: 'image' | 'video'; url: string; title: string } | null>(null);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    const data = await fetchDestinationsApi();
    setDestinations(data.length > 0 ? data : initialDestinations);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingDest(null);
    setForm({
      name: '',
      location: '',
      description: '',
      imageUrls: '',
      videoUrls: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dest: Destination) => {
    setEditingDest(dest);
    setForm({
      name: dest.name,
      location: dest.location,
      description: dest.description,
      imageUrls: dest.images ? dest.images.join('\n') : '',
      videoUrls: dest.videos ? dest.videos.join('\n') : '',
      isActive: dest.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const images = form.imageUrls.split('\n').map(s => s.trim()).filter(Boolean);
    const videos = form.videoUrls.split('\n').map(s => s.trim()).filter(Boolean);

    if (editingDest) {
      // Edit
      const updated = await updateDestinationApi(editingDest.id, {
        name: form.name,
        location: form.location,
        description: form.description,
        images,
        videos,
        isActive: form.isActive,
      });

      setDestinations(prev =>
        prev.map(d =>
          d.id === editingDest.id
            ? {
                ...d,
                name: form.name,
                location: form.location,
                description: form.description,
                images: images.length > 0 ? images : d.images,
                videos,
                isActive: form.isActive,
                ...(updated || {}),
              }
            : d
        )
      );
      showToast(`Tourist Place "${form.name}" updated!`);
    } else {
      // Add
      const created = await createDestinationApi({
        name: form.name,
        location: form.location,
        description: form.description,
        images,
        videos,
        isActive: form.isActive,
      });

      const newDest: Destination = created || {
        id: `dest-${Date.now()}`,
        name: form.name,
        location: form.location,
        description: form.description,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        videos,
        isActive: form.isActive,
      };

      setDestinations(prev => [newDest, ...prev]);
      showToast(`New Tourist Place "${form.name}" added to Master!`);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (destId: string) => {
    setDestinations(prev =>
      prev.map(d => (d.id === destId ? { ...d, isActive: !d.isActive } : d))
    );
    await toggleDestinationStatusApi(destId);
    showToast('Destination status toggled!');
  };

  const handleDelete = async (destId: string, name: string) => {
    if (confirm(`Delete tourist place / checkpoint "${name}" from Destination Master?`)) {
      setDestinations(prev => prev.filter(d => d.id !== destId));
      await deleteDestinationApi(destId);
      showToast(`"${name}" deleted.`);
    }
  };

  const filteredDestinations = destinations.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-brand-500 text-black px-4 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card p-6 rounded-2xl border border-dark-border shadow-lg">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Compass className="w-6 h-6 text-brand-500" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Destination & Tourist Place Master</h1>
          </div>
          <p className="text-xs text-dark-textMuted">
            Each entry is a single Tourist Place / Checkpoint with photos, videos, and ON/OFF status. Tour Plans pull directly from here.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 bg-brand-500 text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-400 transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tourist Place</span>
        </button>
      </div>

      {/* Search Bar & Summary Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tourist place, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-dark-textMuted">
          <span className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border font-semibold">
            Active Tourist Places: <strong className="text-brand-500">{destinations.filter(d => d.isActive).length}</strong> / {destinations.length}
          </span>
        </div>
      </div>

      {/* Destination Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading Destination Master...</div>
      ) : filteredDestinations.length === 0 ? (
        <div className="bg-dark-card p-12 rounded-2xl border border-dark-border text-center space-y-3">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No tourist places found</h3>
          <p className="text-xs text-dark-textMuted">Add a new destination/tourist place to populate the master list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map(dest => {
            const coverImage = dest.images && dest.images.length > 0
              ? dest.images[0]
              : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

            return (
              <div
                key={dest.id}
                className={`bg-dark-card border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                  dest.isActive ? 'border-dark-border hover:border-brand-500/50' : 'border-red-500/20 bg-red-950/10'
                }`}
              >
                {/* Image Cover & Badges */}
                <div className="relative h-48 w-full bg-dark-hover overflow-hidden group">
                  <img
                    src={coverImage}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Location Badge */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-brand-500" />
                    <span>{dest.location || 'Karnataka'}</span>
                  </div>

                  {/* Active Status Badge */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleToggleStatus(dest.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center space-x-1 border shadow-lg transition-transform active:scale-95 ${
                        dest.isActive
                          ? 'bg-green-500 text-black border-green-400'
                          : 'bg-red-500/80 text-white border-red-400'
                      }`}
                    >
                      {dest.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{dest.isActive ? 'ACTIVE' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-extrabold text-white line-clamp-1 drop-shadow-md">{dest.name}</h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">
                    {dest.description || 'No description available for this tourist place.'}
                  </p>

                  {/* Media Count & Previews */}
                  <div className="pt-2 border-t border-dark-border flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-semibold">
                      <span className="flex items-center space-x-1">
                        <ImageIcon className="w-3.5 h-3.5 text-brand-400 inline" />
                        <span>{dest.images?.length || 0} Photos</span>
                      </span>
                      {dest.videos && dest.videos.length > 0 && (
                        <span className="flex items-center space-x-1">
                          <Video className="w-3.5 h-3.5 text-purple-400 inline" />
                          <span>{dest.videos.length} Video</span>
                        </span>
                      )}
                    </div>

                    {/* Image Thumbnails */}
                    <div className="flex items-center space-x-1">
                      {dest.images && dest.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="thumb"
                          onClick={() => setActiveMediaPreview({ type: 'image', url: img, title: dest.name })}
                          className="w-7 h-7 rounded-md object-cover border border-dark-border cursor-pointer hover:scale-110 transition-transform"
                        />
                      ))}
                      {dest.videos && dest.videos.length > 0 && (
                        <button
                          onClick={() => setActiveMediaPreview({ type: 'video', url: dest.videos[0], title: dest.name })}
                          className="w-7 h-7 rounded-md bg-purple-900/40 border border-purple-500/40 text-purple-300 flex items-center justify-center hover:scale-110 transition-transform"
                          title="Play Video"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-dark-hover/40 border-t border-dark-border flex items-center justify-between">
                  <span className="text-[10px] text-dark-textMuted font-bold uppercase">Master Destination</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(dest)}
                      className="px-3 py-1 bg-dark-hover text-white hover:text-brand-400 border border-dark-border rounded-xl text-xs font-bold flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(dest.id, dest.name)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 bg-red-500/10 rounded-xl border border-red-500/20"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT TOURIST PLACE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                <Compass className="w-5 h-5 text-brand-500" />
                <span>{editingDest ? 'Edit Tourist Place' : 'Add New Tourist Place / Destination'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDestination} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Tourist Place / Checkpoint Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virupaksha Temple"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Location (City / State) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hampi, Karnataka"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description / Info
                </label>
                <textarea
                  rows={3}
                  placeholder="Historical highlights, attraction details..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Image URLs (1 per line)</span>
                  <span className="text-[10px] text-brand-400 lowercase">https://...</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="https://images.unsplash.com/photo-...\nhttps://..."
                  value={form.imageUrls}
                  onChange={e => setForm({ ...form, imageUrls: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Video URLs (1 per line)</span>
                  <span className="text-[10px] text-purple-400 lowercase">https://... (mp4/webm)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="https://www.w3schools.com/html/mov_bbb.mp4"
                  value={form.videoUrls}
                  onChange={e => setForm({ ...form, videoUrls: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-gray-300 uppercase">Active Status</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                    form.isActive ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {form.isActive ? 'ON (Active)' : 'OFF (Inactive)'}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-dark-hover text-gray-300 rounded-xl text-sm font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 text-black font-bold rounded-xl text-sm hover:bg-brand-400 shadow-md shadow-brand-500/20"
                >
                  {editingDest ? 'Update Tourist Place' : 'Save Tourist Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      {activeMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <span className="font-bold text-white text-sm">{activeMediaPreview.title} - Media Preview</span>
              <button onClick={() => setActiveMediaPreview(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center min-h-[300px]">
              {activeMediaPreview.type === 'image' ? (
                <img src={activeMediaPreview.url} alt="preview" className="max-h-[500px] w-auto object-contain rounded-lg" />
              ) : (
                <video src={activeMediaPreview.url} controls autoPlay className="max-h-[500px] w-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
