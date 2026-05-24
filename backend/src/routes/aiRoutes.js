// backend/src/routes/aiRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

// ── Helper: call Groq ─────────────────────────────────────────────────────────
async function callGroq(systemPrompt, messages) {
  const res = await fetch(GROQ_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens:  4096,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── POST /api/ai/itinerary ────────────────────────────────────────────────────
router.post('/itinerary', auth, async (req, res) => {
  try {
    const { destination, days, budget, travelers = 1, interests = [] } = req.body;
    if (!destination || !days) {
      return res.status(400).json({ msg: 'destination and days are required' });
    }

    const systemPrompt = `You are an expert Nepal travel planner. You create detailed, realistic day-by-day itineraries.
Always respond with valid JSON only — no markdown, no explanation, no backticks, just the raw JSON object.
Currency is NPR (Nepali Rupees). Be specific with real place names, timings, and costs.
Budget travelers: hotels NPR 800–2500/night, mid-range NPR 2500–6000/night.`;

    const userMessage = `Create a ${days}-day itinerary for ${destination}, Nepal.
Travelers: ${travelers}
${budget ? `Total budget: NPR ${budget}` : 'No fixed budget'}
${interests.length > 0 ? `Interests: ${interests.join(', ')}` : ''}

Return this exact JSON structure:
{
  "plans": [
    {
      "dayNumber": 1,
      "title": "Day 1: Arrival & Settle In",
      "items": [
        { "type": "flight",     "title": "Flight to [city]",   "notes": "e.g. Yeti Airlines KTM-PKR 06:30–07:15", "estimatedCost": 8500 },
        { "type": "hotel",      "title": "Hotel Name",         "notes": "Check in, standard room, 1 night",        "estimatedCost": 3500 },
        { "type": "activity",   "title": "Activity Name",      "notes": "Brief description and timing",            "estimatedCost": 500  },
        { "type": "restaurant", "title": "Restaurant Name",    "notes": "Dinner — local dal bhat",                 "estimatedCost": 500  }
      ]
    }
  ]
}

Rules:
- Generate exactly ${days} day objects
- Each day must have 3–5 items
- item types must be one of: flight, hotel, activity, restaurant, custom_expense
- Only include flight on day 1 (arrival) and last day (departure)
- estimatedCost is total for ${travelers} traveler(s)
- Use real places in ${destination}, Nepal`;

    const raw    = await callGroq(systemPrompt, [{ role: 'user', content: userMessage }]);
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error('AI itinerary error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to generate itinerary' });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', auth, async (req, res) => {
  try {
    const { destination, question, history = [] } = req.body;
    if (!question) return res.status(400).json({ msg: 'question is required' });

    const systemPrompt = `You are a knowledgeable Nepal travel assistant${destination ? ` specializing in ${destination}` : ''}.
Answer travel questions concisely and helpfully. Focus on weather, packing, budget in NPR,
transport, food, culture, safety, and visa info. Keep answers under 200 words unless more detail is needed.`;

    // Map chat history to Groq/OpenAI format
    const messages = [
      ...history.slice(-6).map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    const answer = await callGroq(systemPrompt, messages);
    res.json({ answer });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to get answer' });
  }
});

module.exports = router;