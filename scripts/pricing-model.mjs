// Unit economics. Token sizes measured from lib/assistant.ts last turn.
const PRICE = { // $ per 1M tokens
  "opus-5":   { in: 5,  out: 25, cached: 0.50 },
  "sonnet-5": { in: 2,  out: 10, cached: 0.20 },
  "haiku-4.5":{ in: 1,  out: 5,  cached: 0.10 },
};
const PREFIX = 2148;          // measured: system prompt + 7 tool schemas
const TWILIO_RELAY = 0.07;    // $/min, ConversationRelay
const TWILIO_VOICE = 0.0085;  // $/min, inbound PSTN

function apiCall(model, freshIn, out) {
  const p = PRICE[model];
  return (PREFIX * p.cached + freshIn * p.in + out * p.out) / 1e6;
}

// A written conversation: ~3 customer messages, ~2 API calls each
// (one picks a tool, one writes the reply). Output = reply + adaptive thinking.
function chatConversation(model, { msgs = 3, callsPerMsg = 2, freshIn = 900, out = 460 } = {}) {
  return apiCall(model, freshIn, out) * msgs * callsPerMsg;
}

// A phone call: shorter utterances, more of them, plus Twilio on every minute.
function voiceCall(model, { minutes = 3, utterancesPerMin = 2.5, callsPerUtterance = 1.8,
                            freshIn = 700, out = 300 } = {}) {
  const llm = apiCall(model, freshIn, out) * minutes * utterancesPerMin * callsPerUtterance;
  return { llm, twilio: minutes * (TWILIO_RELAY + TWILIO_VOICE), total: llm + minutes * (TWILIO_RELAY + TWILIO_VOICE) };
}

const usd = (n) => "$" + n.toFixed(3);
console.log("COST PER UNIT\n");
console.log("model        written conv.   3-min call (llm)   3-min call (all-in)   $/voice-min");
for (const m of Object.keys(PRICE)) {
  const v = voiceCall(m);
  console.log(
    m.padEnd(12),
    usd(chatConversation(m)).padEnd(15),
    usd(v.llm).padEnd(18),
    usd(v.total).padEnd(21),
    usd(v.total / 3),
  );
}

// Kept in sync by hand with the PLANS array in lib/marketing.ts — this script
// has no build step, so it can't import the TypeScript source directly.
const PLANS = [
  { name: "Starter $59",   price: 59,  chats: 300,  voiceMin: 0,    model: "sonnet-5", over: null },
  { name: "Pro $199",      price: 199, chats: 1000, voiceMin: 300,  model: "sonnet-5", over: 0.22 },
  { name: "Business $449", price: 449, chats: 3000, voiceMin: 1200, model: "sonnet-5", over: 0.18 },
];

console.log("\n\nMARGIN AT PUBLISHED PRICES\n");
for (const use of [0.6, 1.0]) {
  console.log(`-- customer uses ${use * 100}% of allowance --`);
  for (const p of PLANS) {
    const chatCost = chatConversation(p.model) * p.chats * use;
    const voiceCost = p.voiceMin * use * (voiceCall(p.model).total / 3);
    const cogs = chatCost + voiceCost;
    console.log(`  ${p.name.padEnd(15)} COGS $${cogs.toFixed(2).padStart(7)}   margin ${(((p.price-cogs)/p.price)*100).toFixed(0).padStart(3)}%`);
  }
  console.log("");
}

console.log("-- overage margin (per extra voice minute) --");
for (const p of PLANS.filter((x) => x.over)) {
  const cost = voiceCall(p.model).total / 3;
  console.log(`  ${p.name.padEnd(15)} charge $${p.over.toFixed(2)}  cost $${cost.toFixed(3)}  margin ${(((p.over-cost)/p.over)*100).toFixed(0)}%`);
}

console.log("\n-- what if a Pro or Business customer runs Opus 5? --");
for (const p of PLANS.slice(1)) {
  const cogs = chatConversation("opus-5") * p.chats + p.voiceMin * (voiceCall("opus-5").total / 3);
  console.log(`  ${p.name} on Opus, 100% use: COGS $${cogs.toFixed(2)} → margin ${(((p.price - cogs) / p.price) * 100).toFixed(0)}%`);
}

console.log("\n\nFOR CONTEXT — the launch pricing this replaced (Team $149 / 2,500 conversations, Opus 5)\n");
const launch = chatConversation("opus-5") * 2500;
console.log(`  100% use: COGS $${launch.toFixed(2)} on $149 revenue  →  margin ${(((149 - launch) / 149) * 100).toFixed(0)}%`);
console.log(`   60% use: COGS $${(launch * 0.6).toFixed(2)} on $149 revenue  →  margin ${(((149 - launch * 0.6) / 149) * 100).toFixed(0)}%`);
