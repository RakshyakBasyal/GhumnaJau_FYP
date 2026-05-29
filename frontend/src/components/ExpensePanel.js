//frontend/src/components/ExpensePanel.js
import React, { useState, useMemo } from 'react';
import {
  Receipt, Plus, Banknote, Trash2, PieChart, Users,
  ArrowUpRight, ArrowDownLeft, Wallet, Info, CheckCircle2, X
} from 'lucide-react';
import { addExpense, deleteExpense, addSettlement, deleteSettlement } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

const CATEGORIES = ['Hotel', 'Food', 'Transport', 'Activities', 'Miscellaneous'];

export default function ExpensePanel({ room, myId, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type }
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    splitType: 'equal',
    customSplits: {} // userId: amount
  });

  const [settleForm, setSettleForm] = useState({
    to: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const expenses = room.expenses || [];
  const settlements = room.settlements || [];
  const members = room.members || [];

  // ── CALCULATION LOGIC ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const avg = total / (members.length || 1);
    
    // Net balance per user: (Total Paid) - (Total Owed) + (Settlements Received) - (Settlements Paid)
    const balances = {};
    members.forEach(m => { balances[m._id] = 0; });

    expenses.forEach(e => {
      // Add to payer
      if (balances[e.paidBy?._id] !== undefined) {
        balances[e.paidBy._id] += e.amount;
      }
      // Subtract from everyone who shared
      e.splitWith.forEach(s => {
        if (balances[s.user?._id] !== undefined) {
          balances[s.user._id] -= s.amount;
        }
      });
    });

    settlements.forEach(s => {
      // From pays To: From's balance increases (paid debt), To's balance decreases (received money)
      if (balances[s.from?._id] !== undefined) balances[s.from._id] += s.amount;
      if (balances[s.to?._id] !== undefined)   balances[s.to._id]   -= s.amount;
    });

    const categoryBreakdown = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const topSpenderId = Object.keys(balances).reduce((a, b) => 
      (expenses.filter(e => e.paidBy?._id === a).reduce((s, e) => s + e.amount, 0) > 
       expenses.filter(e => e.paidBy?._id === b).reduce((s, e) => s + e.amount, 0)) ? a : b
    , members[0]?._id);

    return { total, avg, balances, categoryBreakdown, topSpenderId };
  }, [expenses, settlements, members]);

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    setLoading(true);
    try {
      let splitWith = [];
      if (form.splitType === 'equal') {
        const amtPerPerson = parseFloat(form.amount) / members.length;
        splitWith = members.map(m => ({ user: m._id, amount: amtPerPerson }));
      } else {
        splitWith = Object.entries(form.customSplits).map(([userId, amount]) => ({
          user: userId,
          amount: parseFloat(amount)
        }));
      }

      await addExpense(room._id, { ...form, amount: parseFloat(form.amount), splitWith });
      showToast('Expense added', 'success');
      setShowAdd(false);
      setForm({ ...form, description: '', amount: '', notes: '' });
      onUpdate();
    } catch (err) {
      showToast('Failed to add expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSettlement = async (e) => {
    e.preventDefault();
    if (!settleForm.to || !settleForm.amount) return;
    setLoading(true);
    try {
      await addSettlement(room._id, { ...settleForm, amount: parseFloat(settleForm.amount) });
      showToast('Balance settled', 'success');
      setShowSettle(false);
      setSettleForm({ ...settleForm, amount: '', to: '' });
      onUpdate();
    } catch (err) {
      showToast('Failed to settle', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = (id) => {
    setDeleteTarget({ id, type: 'expense' });
    setShowDeleteConfirm(true);
  };

  const handleDeleteSettlement = (id) => {
    setDeleteTarget({ id, type: 'settlement' });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'expense') {
        await deleteExpense(room._id, deleteTarget.id);
      } else {
        await deleteSettlement(room._id, deleteTarget.id);
      }
      onUpdate();
      showToast('Deleted successfully', 'success');
    } catch (_) { 
      showToast('Failed to delete', 'error'); 
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] overflow-y-auto">
      <div className="p-4 space-y-6">
        
        {/* Summary Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-2">
              <Wallet size={16} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Cost</p>
            <p className="text-lg font-bold text-gray-900">NPR {stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-2">
              <Users size={16} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Per Person</p>
            <p className="text-lg font-bold text-gray-900">NPR {Math.round(stats.avg).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 mb-2">
              <PieChart size={16} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">
              {stats.balances[myId] > 0 ? "To Receive" : stats.balances[myId] < 0 ? "To Pay" : "Settled up"}
            </p>
            <p className={`text-lg font-bold ${stats.balances[myId] >= 0 ? (stats.balances[myId] === 0 ? 'text-gray-500' : 'text-emerald-600') : 'text-red-600'}`}>
              NPR {Math.abs(Math.round(stats.balances[myId])).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-2">
              <Receipt size={16} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Expenses</p>
            <p className="text-lg font-bold text-gray-900">{expenses.length}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition shadow-md">
            <Plus size={18} /> Add Expense
          </button>
          <button onClick={() => setShowSettle(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-gray-700 border border-gray-200 rounded-2xl font-bold text-sm hover:bg-gray-50 transition shadow-sm">
            <Banknote size={18} /> Settle Balance
          </button>
        </div>

        {/* Member Balances */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Member Contributions</p>
            <Info size={14} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {members.map(m => (
              <div key={m._id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 overflow-hidden">
                    {m.avatar ? <img src={m.avatar.startsWith('http') ? m.avatar : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${m.avatar}`} alt="" className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{m.fullName} {m._id === myId && '(You)'}</p>
                    <p className="text-[10px] text-gray-400">
                      Paid: NPR {expenses.filter(e => e.paidBy?._id === m._id).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${stats.balances[m._id] >= 0 ? (stats.balances[m._id] === 0 ? 'text-gray-500' : 'text-emerald-600') : 'text-red-600'}`}>
                    {stats.balances[m._id] > 0 
                      ? `To Receive: NPR ${Math.round(stats.balances[m._id]).toLocaleString()}` 
                      : stats.balances[m._id] < 0 
                        ? `To Pay: NPR ${Math.abs(Math.round(stats.balances[m._id])).toLocaleString()}` 
                        : 'Settled up'}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium">Status</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense History */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Recent Expenses</p>
          {expenses.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
              <Receipt size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...expenses].reverse().map(e => (
                <div key={e._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{e.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase">{e.category}</span>
                        <span className="text-[10px] text-gray-400">Paid by {e.paidBy?.fullName?.split(' ')[0]}</span>
                      </div>
                      {e.notes && <p className="text-[10px] text-gray-400 mt-1 italic">"{e.notes}"</p>}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-sm font-black text-gray-900">NPR {e.amount.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(e.date).toLocaleDateString()}</p>
                    <button onClick={() => handleDeleteExpense(e._id)} className="mt-2 text-red-400 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlement History */}
        {settlements.length > 0 && (
          <div className="space-y-3 pb-8">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Settlements</p>
            <div className="space-y-2">
              {[...settlements].reverse().map(s => (
                <div key={s._id} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {s.from?.fullName?.split(' ')[0]} paid {s.to?.fullName?.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-gray-500">NPR {s.amount.toLocaleString()} · {new Date(s.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSettlement(s._id)} className="text-red-400 hover:text-red-600 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Add New Expense</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Description *</label>
                <input required type="text" placeholder="e.g. Dinner at Lakeside" value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Amount (NPR) *</label>
                  <input required type="number" placeholder="0.00" value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Split Type</label>
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                  <button type="button" onClick={() => setForm({...form, splitType: 'equal'})}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${form.splitType === 'equal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                    Split Equally
                  </button>
                  <button type="button" onClick={() => setForm({...form, splitType: 'custom'})}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${form.splitType === 'custom' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                    Custom Split
                  </button>
                </div>
              </div>

              {form.splitType === 'custom' && (
                <div className="space-y-2 border-t border-gray-50 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Assign Amounts</p>
                  {members.map(m => (
                    <div key={m._id} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-600 truncate flex-1">{m.fullName}</span>
                      <input type="number" placeholder="0" 
                        value={form.customSplits[m._id] || ''}
                        onChange={e => setForm({...form, customSplits: {...form.customSplits, [m._id]: e.target.value}})}
                        className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-right outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition shadow-lg disabled:opacity-50 mt-2">
                {loading ? 'Adding...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Settle Balance</h3>
              <button onClick={() => setShowSettle(false)} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSettlement} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Who did you pay? *</label>
                <select required value={settleForm.to} onChange={e => setSettleForm({...settleForm, to: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select Member</option>
                  {members.filter(m => m._id !== myId).map(m => <option key={m._id} value={m._id}>{m.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Amount Paid (NPR) *</label>
                <input required type="number" placeholder="0.00" value={settleForm.amount}
                  onChange={e => setSettleForm({...settleForm, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 mt-2">
                {loading ? 'Processing...' : 'Record Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'expense' ? 'Expense' : 'Settlement'}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This will update everyone's balances.`}
      />
    </div>
  );
}
