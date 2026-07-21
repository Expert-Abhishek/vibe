'use client';

import { useState, useEffect } from 'react';
import {
  Route,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  XCircle,
  Search,
  IndianRupee,
  Clock,
  Navigation,
  MapPin,
  Layers,
  X,
  Eye,
  Check
} from 'lucide-react';
import {
  Plan,
  Destination,
  PlanCheckpoint,
  Checkpoint
} from '@/lib/types';
import {
  fetchPlansApi,
  createPlanApi,
  updatePlanApi,
  togglePlanStatusApi,
  deletePlanApi,
  fetchDestinationsApi,
  addPlanCheckpointApi,
  togglePlanCheckpointApi,
  deletePlanCheckpointApi,
  initialPlans,
  initialDestinations
} from '@/lib/api';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Add Plan Modal State
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [addPlanForm, setAddPlanForm] = useState({
    name: '',
    description: '',
    km: 100,
    duration: '2 Days / 1 Night',
    price: 4999,
    selectedCheckpointIds: [] as string[],
    isActive: true,
  });

  // Edit Plan / Manage Checkpoints Modal State
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    name: '',
    description: '',
    km: 0,
    duration: '',
    price: 0,
    isActive: true,
  });

  // Add Checkpoint to Existing Plan State
  const [isAddCpToPlanModalOpen, setIsAddCpToPlanModalOpen] = useState(false);
  const [selectedCpToAdd, setSelectedCpToAdd] = useState<string>('');

  // Media Preview State
  const [activeMediaPreview, setActiveMediaPreview] = useState<{ type: 'image' | 'video'; url: string; title: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedPlans, fetchedDests] = await Promise.all([
      fetchPlansApi(),
      fetchDestinationsApi(),
    ]);
    setPlans(fetchedPlans.length > 0 ? fetchedPlans : initialPlans);
    setDestinations(fetchedDests.length > 0 ? fetchedDests : initialDestinations);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Create Plan Handler
  const handleOpenAddPlan = () => {
    setAddPlanForm({
      name: '',
      description: '',
      km: 150,
      duration: '2 Days / 1 Night',
      price: 4999,
      selectedCheckpointIds: [],
      isActive: true,
    });
    setIsAddPlanModalOpen(true);
  };

  const handleToggleCheckpointSelectionInAdd = (cpId: string) => {
    setAddPlanForm(prev => {
      const exists = prev.selectedCheckpointIds.includes(cpId);
      return {
        ...prev,
        selectedCheckpointIds: exists
          ? prev.selectedCheckpointIds.filter(id => id !== cpId)
          : [...prev.selectedCheckpointIds, cpId]
      };
    });
  };

  const handleSaveNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlanForm.name.trim()) return;

    // Create plan API
    const created = await createPlanApi({
      name: addPlanForm.name,
      description: addPlanForm.description,
      km: addPlanForm.km,
      duration: addPlanForm.duration,
      price: addPlanForm.price,
      checkpointIds: addPlanForm.selectedCheckpointIds,
    });

    // Resolve checkpoint items from master destinations
    const allMasterCheckpoints: (Checkpoint & { destinationName: string })[] = [];
    destinations.forEach(d => {
      d.checkpoints.forEach(cp => {
        allMasterCheckpoints.push({ ...cp, destinationName: d.name });
      });
    });

    const populatedCheckpoints: PlanCheckpoint[] = addPlanForm.selectedCheckpointIds.map(id => {
      const found = allMasterCheckpoints.find(m => m.id === id);
      return {
        checkpointId: id,
        destinationId: found?.destinationId,
        destinationName: found?.destinationName || 'Destination Master',
        name: found?.name || 'Checkpoint',
        description: found?.description || '',
        images: found?.images || [],
        videos: found?.videos || [],
        isMasterActive: found?.isActive ?? true,
        isActiveInPlan: true,
      };
    });

    const newPlan: Plan = created || {
      id: `plan-${Date.now()}`,
      name: addPlanForm.name,
      description: addPlanForm.description,
      km: addPlanForm.km,
      duration: addPlanForm.duration,
      price: addPlanForm.price,
      isActive: addPlanForm.isActive,
      checkpoints: populatedCheckpoints,
    };

    setPlans(prev => [newPlan, ...prev]);
    setIsAddPlanModalOpen(false);
    showToast(`Plan Package "${addPlanForm.name}" created successfully!`);
  };

  // Toggle Plan Status
  const handleTogglePlan = async (planId: string) => {
    setPlans(prev =>
      prev.map(p => (p.id === planId ? { ...p, isActive: !p.isActive } : p))
    );
    await togglePlanStatusApi(planId);
    showToast('Plan active status toggled!');
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string, name: string) => {
    if (confirm(`Are you sure you want to delete tour plan "${name}"?`)) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      await deletePlanApi(planId);
      showToast(`Plan "${name}" deleted.`);
    }
  };

  // Edit Plan Details & Checkpoints Modal
  const handleOpenEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditPlanForm({
      name: plan.name,
      description: plan.description,
      km: plan.km,
      duration: plan.duration,
      price: plan.price,
      isActive: plan.isActive,
    });
    setIsEditPlanModalOpen(true);
  };

  const handleSaveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editPlanForm.name.trim()) return;

    await updatePlanApi(editingPlan.id, editPlanForm);

    setPlans(prev =>
      prev.map(p =>
        p.id === editingPlan.id
          ? { ...p, ...editPlanForm }
          : p
      )
    );
    setEditingPlan(prev => prev ? { ...prev, ...editPlanForm } : null);
    showToast('Plan details updated!');
  };

  // Toggle Checkpoint ON/OFF inside Plan
  const handleTogglePlanCheckpoint = async (planId: string, cpId: string) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id === planId) {
          return {
            ...p,
            checkpoints: p.checkpoints.map(cp =>
              cp.checkpointId === cpId ? { ...cp, isActiveInPlan: !cp.isActiveInPlan } : cp
            )
          };
        }
        return p;
      })
    );

    if (editingPlan && editingPlan.id === planId) {
      setEditingPlan(prev => prev ? {
        ...prev,
        checkpoints: prev.checkpoints.map(cp =>
          cp.checkpointId === cpId ? { ...cp, isActiveInPlan: !cp.isActiveInPlan } : cp
        )
      } : null);
    }

    await togglePlanCheckpointApi(planId, cpId);
    showToast('Checkpoint status inside plan toggled!');
  };

  // Delete Checkpoint from Plan
  const handleDeletePlanCheckpoint = async (planId: string, cpId: string, cpName: string) => {
    if (confirm(`Remove checkpoint "${cpName}" from this plan?`)) {
      setPlans(prev =>
        prev.map(p => {
          if (p.id === planId) {
            return {
              ...p,
              checkpoints: p.checkpoints.filter(cp => cp.checkpointId !== cpId)
            };
          }
          return p;
        })
      );

      if (editingPlan && editingPlan.id === planId) {
        setEditingPlan(prev => prev ? {
          ...prev,
          checkpoints: prev.checkpoints.filter(cp => cp.checkpointId !== cpId)
        } : null);
      }

      await deletePlanCheckpointApi(planId, cpId);
      showToast(`Checkpoint "${cpName}" removed from plan.`);
    }
  };

  // Add Checkpoint to existing plan
  const handleAddCpToExistingPlan = async () => {
    if (!editingPlan || !selectedCpToAdd) return;

    // Find checkpoint details from Master
    let masterCp: (Checkpoint & { destinationName: string }) | null = null;
    destinations.forEach(d => {
      const found = d.checkpoints.find(c => c.id === selectedCpToAdd);
      if (found) masterCp = { ...found, destinationName: d.name };
    });

    if (!masterCp) return;

    const newPlanCp: PlanCheckpoint = {
      checkpointId: (masterCp as Checkpoint).id,
      destinationId: (masterCp as Checkpoint).destinationId,
      destinationName: (masterCp as any).destinationName,
      name: (masterCp as Checkpoint).name,
      description: (masterCp as Checkpoint).description,
      images: (masterCp as Checkpoint).images,
      videos: (masterCp as Checkpoint).videos,
      isMasterActive: (masterCp as Checkpoint).isActive,
      isActiveInPlan: true,
    };

    setPlans(prev =>
      prev.map(p => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            checkpoints: [...p.checkpoints, newPlanCp]
          };
        }
        return p;
      })
    );

    setEditingPlan(prev => prev ? {
      ...prev,
      checkpoints: [...prev.checkpoints, newPlanCp]
    } : null);

    await addPlanCheckpointApi(editingPlan.id, selectedCpToAdd);
    setIsAddCpToPlanModalOpen(false);
    setSelectedCpToAdd('');
    showToast('New checkpoint added to plan from Destination Master!');
  };

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Route className="w-6 h-6 text-brand-500" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Plan & Tour Packages</h1>
          </div>
          <p className="text-xs text-dark-textMuted">
            Configure Tour Packages & Custom Plans (Name, Distance, Duration, Price & Included Checkpoints pulled from Destination Master).
          </p>
        </div>

        <button
          onClick={handleOpenAddPlan}
          className="flex items-center space-x-2 bg-brand-500 text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-400 transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Search & Overview Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans or tour packages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-dark-textMuted">
          <span className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border font-semibold">
            Active Packages: <strong className="text-brand-500">{plans.filter(p => p.isActive).length}</strong> / {plans.length}
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading Tour Plans...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-dark-card p-12 rounded-2xl border border-dark-border text-center space-y-3">
          <Route className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No plans found</h3>
          <p className="text-xs text-dark-textMuted">Create a new plan to start listing tour packages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlans.map(plan => (
            <div
              key={plan.id}
              className={`bg-dark-card border rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all duration-200 ${
                plan.isActive ? 'border-dark-border hover:border-brand-500/50' : 'border-red-500/20 bg-red-950/10'
              }`}
            >
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        plan.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {plan.isActive ? 'Active Plan' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-dark-textMuted line-clamp-2">{plan.description}</p>
                  </div>

                  {/* Plan Price Tag */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-dark-textMuted block uppercase font-bold">Package Price</span>
                    <span className="text-xl font-black text-brand-500 flex items-center justify-end">
                      <IndianRupee className="w-4 h-4 inline" />
                      <span>{plan.price.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                </div>

                {/* Plan Metrics Bar: KM & Duration */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-dark-hover/50 rounded-xl border border-dark-border/80 text-xs">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Navigation className="w-4 h-4 text-brand-400" />
                    <div>
                      <span className="text-[10px] text-gray-500 block">Distance</span>
                      <strong className="text-white">{plan.km} KM</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="text-[10px] text-gray-500 block">Duration</span>
                      <strong className="text-white">{plan.duration}</strong>
                    </div>
                  </div>
                </div>

                {/* Included Checkpoints Preview (Pulled from Master) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-500" />
                      <span>Included Checkpoints ({plan.checkpoints.length})</span>
                    </span>
                    <span className="text-[10px] text-brand-400">Pulled from Destination Master</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {plan.checkpoints.map((cp, idx) => (
                      <div
                        key={cp.checkpointId || idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          cp.isActiveInPlan ? 'bg-dark-hover/70 border-dark-border' : 'bg-red-950/20 border-red-500/20 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* Image thumbnail from Master */}
                          {cp.images && cp.images.length > 0 ? (
                            <img
                              src={cp.images[0]}
                              alt={cp.name}
                              className="w-8 h-8 rounded-lg object-cover border border-dark-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-[10px] font-bold text-brand-500">
                              CP
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-bold text-white truncate block">{cp.name}</span>
                            <span className="text-[10px] text-dark-textMuted block truncate">
                              {cp.destinationName} • {cp.images?.length || 0} pics {cp.videos?.length ? `, ${cp.videos.length} video` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Toggle ON/OFF Checkpoint inside Plan */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTogglePlanCheckpoint(plan.id, cp.checkpointId)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                              cp.isActiveInPlan
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                            title="Toggle checkpoint ON/OFF in plan"
                          >
                            {cp.isActiveInPlan ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan Actions */}
              <div className="pt-3 border-t border-dark-border flex items-center justify-between">
                <button
                  onClick={() => handleTogglePlan(plan.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors flex items-center space-x-1 ${
                    plan.isActive
                      ? 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {plan.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                  <span>{plan.isActive ? 'Plan ON' : 'Plan OFF'}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="px-3 py-1.5 bg-dark-hover hover:bg-gray-800 text-white rounded-xl text-xs font-bold border border-dark-border flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>Edit Plan & Checkpoints</span>
                  </button>

                  <button
                    onClick={() => handleDeletePlan(plan.id, plan.name)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                <Route className="w-5 h-5 text-brand-500" />
                <span>Create New Tour Package / Plan</span>
              </h3>
              <button onClick={() => setIsAddPlanModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPlan} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Plan / Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hampi 3-Day Heritage & Sunset Tour"
                    value={addPlanForm.name}
                    onChange={e => setAddPlanForm({ ...addPlanForm, name: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Distance (KM)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={addPlanForm.km}
                    onChange={e => setAddPlanForm({ ...addPlanForm, km: Number(e.target.value) })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Duration
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Days / 1 Night"
                    value={addPlanForm.duration}
                    onChange={e => setAddPlanForm({ ...addPlanForm, duration: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="4999"
                    value={addPlanForm.price}
                    onChange={e => setAddPlanForm({ ...addPlanForm, price: Number(e.target.value) })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-between sm:pt-6">
                  <span className="text-xs font-bold text-gray-300 uppercase">Status</span>
                  <button
                    type="button"
                    onClick={() => setAddPlanForm({ ...addPlanForm, isActive: !addPlanForm.isActive })}
                    className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                      addPlanForm.isActive ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {addPlanForm.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide overview of the tour package..."
                    value={addPlanForm.description}
                    onChange={e => setAddPlanForm({ ...addPlanForm, description: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
              </div>

              {/* Select Checkpoints from Destination Master */}
              <div className="space-y-2 pt-2 border-t border-dark-border">
                <label className="block text-xs font-bold text-brand-500 uppercase tracking-wider">
                  Select Checkpoints (From Destination Master)
                </label>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {destinations.map(dest => (
                    <div key={dest.id} className="bg-dark-hover/40 rounded-xl p-3 border border-dark-border/60">
                      <span className="text-xs font-bold text-white block mb-2">{dest.name} ({dest.location})</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dest.checkpoints.map(cp => {
                          const isSelected = addPlanForm.selectedCheckpointIds.includes(cp.id);
                          return (
                            <div
                              key={cp.id}
                              onClick={() => handleToggleCheckpointSelectionInAdd(cp.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-brand-500/20 border-brand-500 text-white font-bold'
                                  : 'bg-dark-card border-dark-border text-gray-400 hover:border-gray-600'
                              }`}
                            >
                              <div className="truncate mr-2">
                                <span className="block truncate">{cp.name}</span>
                                <span className="text-[10px] text-dark-textMuted font-normal">{cp.images.length} imgs</span>
                              </div>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                isSelected ? 'bg-brand-500 border-brand-500 text-black' : 'border-gray-600'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 bg-dark-hover text-gray-300 rounded-xl text-sm font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 text-black font-bold rounded-xl text-sm hover:bg-brand-400 shadow-md shadow-brand-500/20"
                >
                  Create Plan Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN & CHECKPOINTS MODAL */}
      {isEditPlanModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-brand-500" />
                <span>Edit Plan & Manage Included Checkpoints</span>
              </h3>
              <button onClick={() => setIsEditPlanModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Plan Edit Form */}
              <form onSubmit={handleSaveEditPlan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Plan Name</label>
                    <input
                      type="text"
                      required
                      value={editPlanForm.name}
                      onChange={e => setEditPlanForm({ ...editPlanForm, name: e.target.value })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Distance (KM)</label>
                    <input
                      type="number"
                      value={editPlanForm.km}
                      onChange={e => setEditPlanForm({ ...editPlanForm, km: Number(e.target.value) })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Duration</label>
                    <input
                      type="text"
                      value={editPlanForm.duration}
                      onChange={e => setEditPlanForm({ ...editPlanForm, duration: e.target.value })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={editPlanForm.price}
                      onChange={e => setEditPlanForm({ ...editPlanForm, price: Number(e.target.value) })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:pt-5">
                    <span className="text-xs font-bold text-gray-300 uppercase">Plan Active Status</span>
                    <button
                      type="button"
                      onClick={() => setEditPlanForm({ ...editPlanForm, isActive: !editPlanForm.isActive })}
                      className={`px-3 py-1 rounded-xl font-bold text-xs border ${
                        editPlanForm.isActive ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      {editPlanForm.isActive ? 'Active (ON)' : 'Inactive (OFF)'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-500 text-black font-bold rounded-xl text-xs hover:bg-brand-400"
                  >
                    Save Details
                  </button>
                </div>
              </form>

              {/* Included Checkpoints Management Section */}
              <div className="pt-4 border-t border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-500 flex items-center space-x-2">
                    <Layers className="w-4 h-4" />
                    <span>Manage Checkpoints in Plan ({editingPlan.checkpoints.length})</span>
                  </h4>

                  <button
                    onClick={() => setIsAddCpToPlanModalOpen(true)}
                    className="px-3 py-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 rounded-xl text-xs font-bold flex items-center space-x-1 hover:bg-brand-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Checkpoint from Master</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {editingPlan.checkpoints.map(cp => (
                    <div
                      key={cp.checkpointId}
                      className="p-3 bg-dark-hover/50 rounded-xl border border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        {cp.images && cp.images.length > 0 ? (
                          <img
                            src={cp.images[0]}
                            alt={cp.name}
                            className="w-10 h-10 rounded-lg object-cover border border-dark-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-[10px] font-bold text-brand-500">
                            CP
                          </div>
                        )}

                        <div>
                          <span className="font-bold text-white block">{cp.name}</span>
                          <span className="text-[10px] text-dark-textMuted block">
                            {cp.destinationName || 'Destination Master'} • {cp.images?.length || 0} images {cp.videos?.length ? `, ${cp.videos.length} video` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {/* Toggle Checkpoint ON/OFF inside plan */}
                        <button
                          onClick={() => handleTogglePlanCheckpoint(editingPlan.id, cp.checkpointId)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] border transition-colors ${
                            cp.isActiveInPlan
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          {cp.isActiveInPlan ? 'ON in Plan' : 'OFF in Plan'}
                        </button>

                        <button
                          onClick={() => handleDeletePlanCheckpoint(editingPlan.id, cp.checkpointId, cp.name)}
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg border border-red-500/20"
                          title="Remove from plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CHECKPOINT FROM MASTER TO PLAN MODAL */}
      {isAddCpToPlanModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">Add Checkpoint to {editingPlan.name}</h4>
              <button onClick={() => setIsAddCpToPlanModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Select Checkpoint from Destination Master
                </label>
                <select
                  value={selectedCpToAdd}
                  onChange={e => setSelectedCpToAdd(e.target.value)}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Choose Checkpoint --</option>
                  {destinations.map(d => (
                    <optgroup key={d.id} label={d.name}>
                      {d.checkpoints.map(cp => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-dark-border">
                <button
                  onClick={() => setIsAddCpToPlanModalOpen(false)}
                  className="px-4 py-2 bg-dark-hover text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCpToExistingPlan}
                  disabled={!selectedCpToAdd}
                  className="px-4 py-2 bg-brand-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs hover:bg-brand-400"
                >
                  Add to Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
