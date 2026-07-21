'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Layers
} from 'lucide-react';
import {
  Destination,
  Checkpoint
} from '@/lib/types';
import {
  fetchDestinationsApi,
  createDestinationApi,
  updateDestinationApi,
  toggleDestinationStatusApi,
  deleteDestinationApi,
  addCheckpointApi,
  updateCheckpointApi,
  toggleCheckpointStatusApi,
  deleteCheckpointApi,
  initialDestinations
} from '@/lib/api';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDestId, setExpandedDestId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [destForm, setDestForm] = useState({
    name: '',
    location: '',
    imageUrl: '',
    description: '',
    isActive: true,
  });

  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [targetDestId, setTargetDestId] = useState<string | null>(null);
  const [editingCp, setEditingCp] = useState<Checkpoint | null>(null);
  const [cpForm, setCpForm] = useState({
    name: '',
    description: '',
    imageUrls: '',
    videoUrls: '',
    isActive: true,
  });

  const [activeMediaPreview, setActiveMediaPreview] = useState<{ type: 'image' | 'video'; url: string; title: string } | null>(null);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    const data = await fetchDestinationsApi();
    setDestinations(data.length > 0 ? data : initialDestinations);
    if (data.length > 0 && !expandedDestId) {
      setExpandedDestId(data[0].id);
    } else if (initialDestinations.length > 0 && !expandedDestId) {
      setExpandedDestId(initialDestinations[0].id);
    }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Destination Handlers
  const handleOpenAddDest = () => {
    setEditingDest(null);
    setDestForm({ name: '', location: '', imageUrl: '', description: '', isActive: true });
    setIsDestModalOpen(true);
  };

  const handleOpenEditDest = (dest: Destination) => {
    setEditingDest(dest);
    setDestForm({
      name: dest.name,
      location: dest.location,
      imageUrl: dest.imageUrl,
      description: dest.description,
      isActive: dest.isActive,
    });
    setIsDestModalOpen(true);
  };

  const handleSaveDest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destForm.name.trim()) return;

    if (editingDest) {
      // Edit
      const updated = await updateDestinationApi(editingDest.id, destForm);
      setDestinations(prev =>
        prev.map(d =>
          d.id === editingDest.id
            ? { ...d, ...destForm, ...(updated || {}) }
            : d
        )
      );
      showToast(`Destination "${destForm.name}" updated successfully!`);
    } else {
      // Add
      const created = await createDestinationApi(destForm);
      const newDest: Destination = created || {
        id: `dest-${Date.now()}`,
        name: destForm.name,
        location: destForm.location,
        imageUrl: destForm.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        description: destForm.description,
        isActive: destForm.isActive,
        checkpoints: [],
      };
      setDestinations(prev => [newDest, ...prev]);
      setExpandedDestId(newDest.id);
      showToast(`Destination "${destForm.name}" added to Master!`);
    }
    setIsDestModalOpen(false);
  };

  const handleToggleDest = async (destId: string) => {
    setDestinations(prev =>
      prev.map(d => (d.id === destId ? { ...d, isActive: !d.isActive } : d))
    );
    await toggleDestinationStatusApi(destId);
    showToast('Destination status toggled!');
  };

  const handleDeleteDest = async (destId: string, name: string) => {
    if (confirm(`Are you sure you want to delete destination "${name}" and all its checkpoints?`)) {
      setDestinations(prev => prev.filter(d => d.id !== destId));
      await deleteDestinationApi(destId);
      showToast(`Destination "${name}" deleted.`);
    }
  };

  // Checkpoint Handlers
  const handleOpenAddCp = (destId: string) => {
    setTargetDestId(destId);
    setEditingCp(null);
    setCpForm({ name: '', description: '', imageUrls: '', videoUrls: '', isActive: true });
    setIsCpModalOpen(true);
  };

  const handleOpenEditCp = (cp: Checkpoint) => {
    setTargetDestId(cp.destinationId);
    setEditingCp(cp);
    setCpForm({
      name: cp.name,
      description: cp.description,
      imageUrls: cp.images.join('\n'),
      videoUrls: cp.videos.join('\n'),
      isActive: cp.isActive,
    });
    setIsCpModalOpen(true);
  };

  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpForm.name.trim() || !targetDestId) return;

    const images = cpForm.imageUrls.split('\n').map(s => s.trim()).filter(Boolean);
    const videos = cpForm.videoUrls.split('\n').map(s => s.trim()).filter(Boolean);

    if (editingCp) {
      // Edit Checkpoint
      const updated = await updateCheckpointApi(editingCp.id, {
        name: cpForm.name,
        description: cpForm.description,
        images,
        videos,
        isActive: cpForm.isActive,
      });

      setDestinations(prev =>
        prev.map(d => {
          if (d.id === targetDestId) {
            return {
              ...d,
              checkpoints: d.checkpoints.map(c =>
                c.id === editingCp.id
                  ? {
                      ...c,
                      name: cpForm.name,
                      description: cpForm.description,
                      images,
                      videos,
                      isActive: cpForm.isActive,
                      ...(updated || {})
                    }
                  : c
              )
            };
          }
          return d;
        })
      );
      showToast(`Checkpoint "${cpForm.name}" updated!`);
    } else {
      // Add Checkpoint
      const created = await addCheckpointApi(targetDestId, {
        name: cpForm.name,
        description: cpForm.description,
        images,
        videos,
        isActive: cpForm.isActive,
      });

      const newCp: Checkpoint = created || {
        id: `cp-${Date.now()}`,
        destinationId: targetDestId,
        name: cpForm.name,
        description: cpForm.description,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'],
        videos,
        isActive: cpForm.isActive,
      };

      setDestinations(prev =>
        prev.map(d => {
          if (d.id === targetDestId) {
            return { ...d, checkpoints: [...d.checkpoints, newCp] };
          }
          return d;
        })
      );
      showToast(`Checkpoint "${cpForm.name}" added to Destination Master!`);
    }
    setIsCpModalOpen(false);
  };

  const handleToggleCp = async (destId: string, cpId: string) => {
    setDestinations(prev =>
      prev.map(d => {
        if (d.id === destId) {
          return {
            ...d,
            checkpoints: d.checkpoints.map(c =>
              c.id === cpId ? { ...c, isActive: !c.isActive } : c
            )
          };
        }
        return d;
      })
    );
    await toggleCheckpointStatusApi(cpId);
    showToast('Checkpoint ON/OFF status updated!');
  };

  const handleDeleteCp = async (destId: string, cpId: string, name: string) => {
    if (confirm(`Delete checkpoint "${name}" from Destination Master?`)) {
      setDestinations(prev =>
        prev.map(d => {
          if (d.id === destId) {
            return {
              ...d,
              checkpoints: d.checkpoints.filter(c => c.id !== cpId)
            };
          }
          return d;
        })
      );
      await deleteCheckpointApi(cpId);
      showToast(`Checkpoint "${name}" deleted from Master.`);
    }
  };

  const filteredDestinations = destinations.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.location.toLowerCase().includes(searchQuery.toLowerCase())
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
            <MapPin className="w-6 h-6 text-brand-500" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Destination Master</h1>
          </div>
          <p className="text-xs text-dark-textMuted">
            Single Source of Truth for all tourist destinations, checkpoints, images, and videos. Plans pull data directly from here.
          </p>
        </div>

        <button
          onClick={handleOpenAddDest}
          className="flex items-center space-x-2 bg-brand-500 text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-400 transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Destination</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search destinations or cities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-dark-textMuted">
          <span className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border font-semibold">
            Total Destinations: <strong className="text-brand-500">{destinations.length}</strong>
          </span>
          <span className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border font-semibold">
            Total Checkpoints Master: <strong className="text-brand-500">{destinations.reduce((acc, d) => acc + d.checkpoints.length, 0)}</strong>
          </span>
        </div>
      </div>

      {/* Destinations Accordion / Cards List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading Destination Master...</div>
      ) : filteredDestinations.length === 0 ? (
        <div className="bg-dark-card p-12 rounded-2xl border border-dark-border text-center space-y-3">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No destinations found</h3>
          <p className="text-xs text-dark-textMuted">Try a different search query or add a new destination.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDestinations.map(dest => {
            const isExpanded = expandedDestId === dest.id;
            return (
              <div
                key={dest.id}
                className={`bg-dark-card border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'border-brand-500/60 shadow-xl shadow-brand-500/5' : 'border-dark-border hover:border-gray-700'
                }`}
              >
                {/* Destination Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start md:items-center space-x-4">
                    <img
                      src={dest.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'}
                      alt={dest.name}
                      className="w-16 h-16 rounded-xl object-cover border border-dark-border shadow-md flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-white">{dest.name}</h2>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          dest.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {dest.isActive ? 'Active Master' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-500 inline" />
                        <span>{dest.location || 'Karnataka'}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-brand-400 font-semibold">{dest.checkpoints.length} Checkpoints</span>
                      </p>
                      <p className="text-xs text-dark-textMuted mt-1 line-clamp-1 max-w-2xl">{dest.description}</p>
                    </div>
                  </div>

                  {/* Actions & Toggle */}
                  <div className="flex items-center space-x-3 self-end md:self-center">
                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => handleToggleDest(dest.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 border transition-all ${
                        dest.isActive
                          ? 'bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                      title="Toggle Destination Active Status"
                    >
                      {dest.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                      <span>{dest.isActive ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenAddCp(dest.id)}
                      className="px-3 py-1.5 bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 rounded-xl font-bold text-xs flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Checkpoint</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditDest(dest)}
                      className="p-2 bg-dark-hover text-gray-300 hover:text-white rounded-xl border border-dark-border"
                      title="Edit Destination"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteDest(dest.id, dest.name)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20"
                      title="Delete Destination"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedDestId(isExpanded ? null : dest.id)}
                      className="p-2 bg-dark-hover text-gray-400 hover:text-white rounded-xl border border-dark-border"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Checkpoints Section */}
                {isExpanded && (
                  <div className="bg-dark-hover/40 border-t border-dark-border p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-500 flex items-center space-x-2">
                        <Layers className="w-4 h-4" />
                        <span>Master Checkpoints ({dest.checkpoints.length})</span>
                      </h3>
                      <span className="text-[11px] text-dark-textMuted">
                        Media & details defined here are pulled automatically into tour plans.
                      </span>
                    </div>

                    {dest.checkpoints.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-dark-border rounded-xl">
                        <p className="text-xs text-dark-textMuted mb-2">No checkpoints created yet for {dest.name}.</p>
                        <button
                          onClick={() => handleOpenAddCp(dest.id)}
                          className="text-xs text-brand-500 hover:underline font-bold"
                        >
                          + Add first Checkpoint
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dest.checkpoints.map((cp, idx) => (
                          <div
                            key={cp.id}
                            className={`bg-dark-card border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                              cp.isActive ? 'border-dark-border' : 'border-red-500/20 bg-red-950/10'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <h4 className="font-bold text-white text-sm">{cp.name}</h4>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {/* Checkpoint ON/OFF Toggle */}
                                  <button
                                    onClick={() => handleToggleCp(dest.id, cp.id)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                                      cp.isActive
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                        : 'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}
                                  >
                                    {cp.isActive ? 'ON' : 'OFF'}
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditCp(cp)}
                                    className="p-1 text-gray-400 hover:text-white"
                                    title="Edit Checkpoint"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCp(dest.id, cp.id, cp.name)}
                                    className="p-1 text-red-400 hover:text-red-300"
                                    title="Delete Checkpoint"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-gray-400 line-clamp-2">{cp.description || 'No description provided'}</p>
                            </div>

                            {/* Images & Videos Media Previews */}
                            <div className="pt-2 border-t border-dark-border/60 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-brand-400 inline" />
                                  <span>{cp.images.length} Images</span>
                                </span>
                                {cp.videos.length > 0 && (
                                  <span className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
                                    <Video className="w-3.5 h-3.5 text-purple-400 inline" />
                                    <span>{cp.videos.length} Video</span>
                                  </span>
                                )}
                              </div>

                              {/* Media Thumbnail previews */}
                              <div className="flex items-center space-x-1.5">
                                {cp.images.slice(0, 3).map((img, imgIdx) => (
                                  <img
                                    key={imgIdx}
                                    src={img}
                                    alt={`cp-img-${imgIdx}`}
                                    onClick={() => setActiveMediaPreview({ type: 'image', url: img, title: cp.name })}
                                    className="w-7 h-7 rounded-lg object-cover border border-dark-border cursor-pointer hover:scale-110 transition-transform"
                                  />
                                ))}
                                {cp.videos.length > 0 && (
                                  <button
                                    onClick={() => setActiveMediaPreview({ type: 'video', url: cp.videos[0], title: cp.name })}
                                    className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/40 text-purple-300 flex items-center justify-center hover:scale-110 transition-transform"
                                    title="Play Video Preview"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Destination Modal */}
      {isDestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-brand-500" />
                <span>{editingDest ? 'Edit Destination Master' : 'Add New Destination Master'}</span>
              </h3>
              <button onClick={() => setIsDestModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Destination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hampi Heritage Valley"
                  value={destForm.name}
                  onChange={e => setDestForm({ ...destForm, name: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vijayanagara, Karnataka"
                  value={destForm.location}
                  onChange={e => setDestForm({ ...destForm, location: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={destForm.imageUrl}
                  onChange={e => setDestForm({ ...destForm, imageUrl: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the destination..."
                  value={destForm.description}
                  onChange={e => setDestForm({ ...destForm, description: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-300 uppercase">Status</span>
                <button
                  type="button"
                  onClick={() => setDestForm({ ...destForm, isActive: !destForm.isActive })}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                    destForm.isActive ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {destForm.isActive ? 'Active (ON)' : 'Inactive (OFF)'}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsDestModalOpen(false)}
                  className="px-4 py-2 bg-dark-hover text-gray-300 rounded-xl text-sm font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 text-black font-bold rounded-xl text-sm hover:bg-brand-400 shadow-md shadow-brand-500/20"
                >
                  {editingDest ? 'Update Destination' : 'Create Destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkpoint Modal */}
      {isCpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                <Layers className="w-5 h-5 text-brand-500" />
                <span>{editingCp ? 'Edit Checkpoint Master' : 'Add Checkpoint Master'}</span>
              </h3>
              <button onClick={() => setIsCpModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Checkpoint Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virupaksha Temple Stone Chariot"
                  value={cpForm.name}
                  onChange={e => setCpForm({ ...cpForm, name: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Checkpoint Detail / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Historic significance, architectural highlights..."
                  value={cpForm.description}
                  onChange={e => setCpForm({ ...cpForm, description: e.target.value })}
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
                  value={cpForm.imageUrls}
                  onChange={e => setCpForm({ ...cpForm, imageUrls: e.target.value })}
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
                  value={cpForm.videoUrls}
                  onChange={e => setCpForm({ ...cpForm, videoUrls: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-gray-300 uppercase">Active Status</span>
                <button
                  type="button"
                  onClick={() => setCpForm({ ...cpForm, isActive: !cpForm.isActive })}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                    cpForm.isActive ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {cpForm.isActive ? 'ON (Active)' : 'OFF (Inactive)'}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsCpModalOpen(false)}
                  className="px-4 py-2 bg-dark-hover text-gray-300 rounded-xl text-sm font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 text-black font-bold rounded-xl text-sm hover:bg-brand-400 shadow-md shadow-brand-500/20"
                >
                  {editingCp ? 'Update Checkpoint' : 'Save Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {activeMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <span className="font-bold text-white text-sm">{activeMediaPreview.title} - Preview</span>
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
