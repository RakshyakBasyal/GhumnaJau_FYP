// frontend/src/pages/ManageRestaurants.jsx
import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Utensils } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const EMPTY = { name: '', destination: '', description: '', shortDescription: '', cuisine: '', priceRange: 'Mid-range', avgCostPerPerson: '', openingHours: '', address: '', phone: '' };
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';

const ManageRestaurants = () => {
  const [restaurants,  setRestaurants]  = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [files,        setFiles]        = useState([]);
  const [existingImgs, setExistingImgs] = useState([]);
  const [toDelete,     setToDelete]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [confirmId,    setConfirmId]    = useState(null);
  const { showToast } = useToast();
  const formRef = useRef(null);

  useEffect(() => {
    fetch(BASE_URL + '/api/restaurants').then(r => r.json()).then(setRestaurants).catch(() => {});
    fetch(BASE_URL + '/api/destinations').then(r => r.json()).then(setDestinations).catch(() => {});
  }, []);

  function startEdit(r) {
    setForm({ name: r.name || '', destination: r.destination?._id || '', description: r.description || '', shortDescription: r.shortDescription || '', cuisine: r.cuisine?.join(', ') || '', priceRange: r.priceRange || 'Mid-range', avgCostPerPerson: r.avgCostPerPerson || '', openingHours: r.openingHours || '', address: r.address || '', phone: r.phone || '' });
    setExistingImgs(r.images || []); setToDelete([]); setFiles([]);
    setEditingId(r._id); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function reset() { setForm(EMPTY); setFiles([]); setExistingImgs([]); setToDelete([]); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    files.forEach(f => data.append('images', f));
    if (editingId && toDelete.length > 0) data.append('deleteImages', JSON.stringify(toDelete));
    const token = localStorage.getItem('token');
    try {
      if (editingId) await axios.put(BASE_URL + '/api/restaurants/' + editingId, data, { headers: { Authorization: 'Bearer ' + token } });
      else           await axios.post(BASE_URL + '/api/restaurants',               data, { headers: { Authorization: 'Bearer ' + token } });
      showToast(editingId ? 'Restaurant updated!' : 'Restaurant added!', 'success');
      reset();
      fetch(BASE_URL + '/api/restaurants').then(r => r.json()).then(setRestaurants);
    } catch (_) { showToast('Failed to save', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    try {
      await axios.delete(BASE_URL + '/api/restaurants/' + confirmId, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      showToast('Deleted!', 'success');
      setRestaurants(prev => prev.filter(r => r._id !== confirmId));
    } catch (_) { showToast('Delete failed', 'error'); }
    finally { setConfirmId(null); }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Restaurants</h1>
            <p className="text-sm text-gray-500 mt-0.5">Add restaurants visible on destination pages</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            {showForm ? <><X size={15} /> Close</> : <><Plus size={15} /> Add Restaurant</>}
          </button>
        </div>

        {showForm && (
          <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit' : 'Add'} Restaurant</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input required type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Destination *</label>
                  <select required value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} className={inp}>
                    <option value="">Select destination</option>
                    {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
                <input type="text" value={form.shortDescription} onChange={e => setForm(p => ({ ...p, shortDescription: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inp + ' resize-none'} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuisine <span className="text-gray-400">(comma separated)</span></label>
                  <input type="text" placeholder="Nepali, Indian, Chinese" value={form.cuisine} onChange={e => setForm(p => ({ ...p, cuisine: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price Range</label>
                  <select value={form.priceRange} onChange={e => setForm(p => ({ ...p, priceRange: e.target.value }))} className={inp}>
                    <option>Budget</option><option>Mid-range</option><option>Fine Dining</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Avg Cost/Person (NPR)</label>
                  <input type="number" min="0" value={form.avgCostPerPerson} onWheel={e => e.target.blur()} onChange={e => setForm(p => ({ ...p, avgCostPerPerson: e.target.value }))} className={inp} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opening Hours</label>
                  <input type="text" placeholder="7:00 AM – 10:00 PM" value={form.openingHours} onChange={e => setForm(p => ({ ...p, openingHours: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} />
                </div>
              </div>
              {editingId && existingImgs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Current Images</label>
                  <div className="flex flex-wrap gap-2">
                    {existingImgs.map(img => (
                      <div key={img} className="relative">
                        <img src={BASE_URL + img} alt="" className="h-20 w-20 object-cover rounded-lg" />
                        <button type="button" onClick={() => { setToDelete(p => [...p, img]); setExistingImgs(p => p.filter(i => i !== img)); }}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Images</label>
                <input type="file" multiple accept="image/*" onChange={e => setFiles(p => [...p, ...Array.from(e.target.files)])}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 object-cover rounded-lg" />
                        <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Add Restaurant'}
                </button>
                <button type="button" onClick={reset} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {restaurants.length === 0
            ? <p className="col-span-full text-center text-gray-400 py-12">No restaurants yet</p>
            : restaurants.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {r.images?.[0] ? <img src={BASE_URL + r.images[0]} alt={r.name} className="w-full h-40 object-cover" />
                  : <div className="w-full h-40 bg-orange-50 flex items-center justify-center"><Utensils size={36} className="text-orange-200" /></div>}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{r.name}</h3>
                  <p className="text-xs text-gray-500 mb-1">{r.destination?.name || '—'}</p>
                  <p className="text-xs text-gray-400 mb-3">{r.priceRange} · {r.cuisine?.slice(0, 2).join(', ')}</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={15} /></button>
                    <button onClick={() => setConfirmId(r._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      <ConfirmDialog isOpen={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={handleDelete} title="Delete Restaurant" message="Delete this restaurant permanently?" />
    </div>
  );
};

export default ManageRestaurants;