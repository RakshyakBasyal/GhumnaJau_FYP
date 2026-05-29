// frontend/src/components/AIPlannerModal.jsx
import { useState, useRef, useEffect } from 'react';
import {
  X, Sparkles, Send, Loader2, Check, Plus, MessageCircle,
  Calendar, DollarSign, Users, Tag, ChevronDown, ChevronUp,
  MapPin, Plane, Hotel, UtensilsCrossed, Zap, Receipt,
  RotateCcw, CheckCircle2, Bot, User
} from 'lucide-react';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const tok      = () => localStorage.getItem('token');

// ── Icon map matching your TYPE_CFG ──────────────────────────────────────────
const TYPE_ICON = {
  flight:         Plane,
  hotel:          Hotel,
  restaurant:     UtensilsCrossed,
  activity:       Zap,
  custom_expense: Receipt,
  destination:    MapPin,
};
const TYPE_COLOR = {
  flight:         'text-indigo-600 bg-indigo-50',
  hotel:          'text-blue-600 bg-blue-50',
  restaurant:     'text-amber-600 bg-amber-50',
  activity:       'text-purple-600 bg-purple-50',
  custom_expense: 'text-rose-600 bg-rose-50',
  destination:    'text-green-600 bg-green-50',
};

const fmtNPR = (n) => n > 0 ? `NPR ${Math.round(n).toLocaleString()}` : null;

// ── Suggested quick questions ─────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'What\'s the best time to visit?',
  'What should I pack?',
  'What\'s the ideal budget per day?',
  'How do I get there from Kathmandu?',
  'What local food should I try?',
  'Is it safe for solo travelers?',
  'What are the top things to do?',
  'Do I need any permits?',
];

// ── INTEREST TAGS ─────────────────────────────────────────────────────────────
const INTEREST_OPTIONS = [
  'Trekking', 'Culture', 'Food', 'Adventure', 'Photography',
  'Wildlife', 'Relaxation', 'Spiritual', 'Nightlife', 'Shopping',
];

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Generate Itinerary
// ─────────────────────────────────────────────────────────────────────────────
const GenerateTab = ({ itin, onAddPlan, onAddItemToPlan, onClose }) => {
  const nights = itin?.startDate && itin?.endDate
    ? Math.max(1, Math.round((new Date(itin.endDate) - new Date(itin.startDate)) / 86400000))
    : null;

  const [days,       setDays]      = useState(String(nights || 3));
  const [budget,     setBudget]    = useState(itin?.budget ? String(itin.budget) : '');
  const [travelers,  setTravelers] = useState('1');
  const [interests,  setInterests] = useState([]);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState(null);
  const [result,     setResult]    = useState(null);   // { plans: [...] }
  const [saving,     setSaving]    = useState(false);
  const [saved,      setSaved]     = useState(false);
  const [expanded,   setExpanded]  = useState({});     // dayNumber → bool

  const destination = itin?.destinationName || '';

  const toggleInterest = (tag) =>
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const toggleDay = (n) => setExpanded(prev => ({ ...prev, [n]: !prev[n] }));

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch(`${BASE_URL}/api/ai/itinerary`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({
          destination: destination || 'Nepal',
          days:       parseInt(days) || 3,
          budget:     budget ? parseInt(budget) : null,
          travelers:  parseInt(travelers) || 1,
          interests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to generate');
      setResult(data);
      // expand all days by default
      const exp = {};
      (data.plans || []).forEach(p => { exp[p.dayNumber] = true; });
      setExpanded(exp);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Save all generated plans + items into the itinerary
  const saveAll = async () => {
    if (!result?.plans) return;
    setSaving(true);
    try {
      for (const dayPlan of result.plans) {
        // Determine plannedDate from day number
        let plannedDate;
        if (itin?.startDate) {
          const d = new Date(itin.startDate);
          d.setDate(d.getDate() + (dayPlan.dayNumber - 1));
          plannedDate = d.toISOString().slice(0, 10);
        }

        // Create the plan step
        const planRes = await fetch(`${BASE_URL}/api/itineraries/${itin._id}/plans`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
          body: JSON.stringify({ title: dayPlan.title, plannedDate, order: dayPlan.dayNumber }),
        });
        if (!planRes.ok) continue;
        const newPlan = await planRes.json();
        onAddPlan(newPlan);   // update parent state

        // Add each item to the plan
        for (const item of (dayPlan.items || [])) {
          await onAddItemToPlan(newPlan._id, {
            type:          item.type || 'activity',
            title:         item.title,
            notes:         item.notes || '',
            estimatedCost: item.estimatedCost || 0,
            plannedDate,
          });
        }
      }
      setSaved(true);
    } catch (e) {
      setError('Failed to save some plans. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalEst = result?.plans
    ? result.plans.reduce((s, p) => s + (p.items || []).reduce((ss, i) => ss + (i.estimatedCost || 0), 0), 0)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Form ── */}
      {!result && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Destination (read-only) */}
          {destination && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-blue-700">{destination}</span>
              <span className="text-xs text-blue-400 ml-auto">from your trip</span>
            </div>
          )}

          {/* Days + Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" /> Days
              </label>
              <input type="number" min="1" max="21" value={days} onChange={e => setDays(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
              {nights && <p className="text-xs text-gray-400 mt-1">Your trip is {nights} nights</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gray-400" /> Travelers
              </label>
              <input type="number" min="1" max="20" value={travelers} onChange={e => setTravelers(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-gray-400" /> Total Budget (NPR)
              <span className="text-xs font-normal text-gray-400 ml-1">— optional</span>
            </label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-gray-400" /> Interests
              <span className="text-xs font-normal text-gray-400 ml-1">— pick any</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(tag => (
                <button key={tag} onClick={() => toggleInterest(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    interests.includes(tag)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="flex-1 overflow-y-auto">
          {/* Summary bar */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between z-10">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {result.plans?.length}-day plan generated
              </p>
              {totalEst > 0 && (
                <p className="text-xs text-gray-400">Est. total: {fmtNPR(totalEst)}</p>
              )}
            </div>
            <button onClick={() => { setResult(null); setError(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
              <RotateCcw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>

          {/* Day cards */}
          <div className="p-4 space-y-3">
            {(result.plans || []).map(dayPlan => {
              const isOpen   = expanded[dayPlan.dayNumber] !== false;
              const dayTotal = (dayPlan.items || []).reduce((s, i) => s + (i.estimatedCost || 0), 0);
              return (
                <div key={dayPlan.dayNumber} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => toggleDay(dayPlan.dayNumber)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {dayPlan.dayNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{dayPlan.title}</p>
                      {dayTotal > 0 && <p className="text-xs text-gray-400">{fmtNPR(dayTotal)}</p>}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-50">
                      {(dayPlan.items || []).map((item, idx) => {
                        const Icon  = TYPE_ICON[item.type] || Zap;
                        const color = TYPE_COLOR[item.type] || 'text-gray-600 bg-gray-50';
                        return (
                          <div key={idx} className="flex items-start gap-3 px-4 py-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{item.title}</p>
                              {item.notes && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.notes}</p>}
                            </div>
                            {item.estimatedCost > 0 && (
                              <span className="text-xs font-semibold text-gray-500 flex-shrink-0 mt-0.5">
                                {fmtNPR(item.estimatedCost)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0">
        {!result ? (
          <button onClick={generate} disabled={loading || !days}
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating your plan...</>
              : <><Sparkles className="h-4 w-4" /> Generate Day-by-Day Plan</>
            }
          </button>
        ) : saved ? (
          <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Added to your itinerary!
          </div>
        ) : (
          <button onClick={saveAll} disabled={saving}
            className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving plans...</>
              : <><Plus className="h-4 w-4" /> Add All Plans to Itinerary</>
            }
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Ask Anything (Travel Q&A Chat)
// ─────────────────────────────────────────────────────────────────────────────
const ChatTab = ({ destination }) => {
  const [messages,  setMessages]  = useState([]);   // { role: 'user'|'assistant', content: string }
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setInput('');
    setError(null);

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({
          destination,
          question: q,
          // pass alternating history for context (max last 6 messages)
          history: newMessages.slice(-6),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I couldn\'t get an answer. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Chat history ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome / quick questions */}
        {isEmpty && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                <p className="text-sm text-gray-700">
                  Hi! I'm your travel assistant
                  {destination ? ` for ${destination}` : ''}.
                  Ask me anything about weather, packing, budget, transport, food, or safety!
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 px-1">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-xs px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-600'
            }`}>
              {msg.role === 'user'
                ? <User className="h-3.5 w-3.5 text-gray-600" />
                : <Bot className="h-3.5 w-3.5 text-white" />
              }
            </div>
            <div className={`rounded-2xl px-4 py-3 max-w-[78%] text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && send()}
            placeholder={destination ? `Ask about ${destination}...` : 'Ask a travel question...'}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center disabled:opacity-40 transition flex-shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
const AIPlannerModal = ({ itin, onClose, onAddPlan, onAddItemToPlan }) => {
  const [tab, setTab] = useState('generate');   // 'generate' | 'chat'
  const destination   = itin?.destinationName || '';

  // Wrapper so GenerateTab can call onAddPlan with a new plan object from
  // the server response (the parent state updater expects the plan object)
  const handleAddPlan = (planObj) => {
    // The parent's handleAddPlan normally does a fetch + setPlans.
    // Here we've already done the fetch, so we just update state.
    // We pass planObj directly to a lightweight updater via a ref trick.
    // Since we can't call setPlans directly, we use the existing onAddPlan
    // which is called with the API response in the parent.
    // In practice: the parent's handleAddPlan is async and does the fetch.
    // In GenerateTab.saveAll we bypass that and call onAddPlan(newPlan) 
    // directly with the already-fetched plan to update parent state.
    onAddPlan(planObj);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: 'min(90vh, 680px)' }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Plan with AI</h2>
            {destination && <p className="text-xs text-gray-400">{destination}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {[
            { key: 'generate', label: 'Generate Itinerary', icon: Calendar },
            { key: 'chat',     label: 'Ask Anything',       icon: MessageCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition border-b-2 ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'generate' && (
            <GenerateTab
              itin={itin}
              onAddPlan={handleAddPlan}
              onAddItemToPlan={onAddItemToPlan}
              onClose={onClose}
            />
          )}
          {tab === 'chat' && (
            <ChatTab destination={destination} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPlannerModal;

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION SNIPPET — paste this into ItineraryDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Add import at the top of ItineraryDetail.jsx:
//    import AIPlannerModal from '../components/AIPlannerModal';
//
// 2. Add state inside ItineraryDetail component:
//    const [showAI, setShowAI] = useState(false);
//
// 3. Add modal render (alongside the other modals at the top of the return):
//    {!publicView && showAI && (
//      <AIPlannerModal
//        itin={itin}
//        onClose={() => setShowAI(false)}
//        onAddPlan={(plan) => setPlans(prev => [...prev, plan])}
//        onAddItemToPlan={handleAddItemToPlan}
//      />
//    )}
//
// 4. Add this button in the right sidebar, above <BudgetCard>:
//
//    {!publicView && (
//      <button
//        onClick={() => setShowAI(true)}
//        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-sm transition"
//      >
//        <Sparkles className="h-4 w-4" />
//        Plan with AI
//      </button>
//    )}