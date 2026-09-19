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

console.log("\n\nMARGIN AT CANDIDATE PRICES (assume a customer uses 60% of allowance)\n");
const plans = [
  { name: "Starter $59",  price: 59,  chats: 500,  voiceMin: 0,    model: "sonnet-5" },
  { name: "Pro $179",     price: 179, chats: 1500, voiceMin: 500,  model: "sonnet-5" },
  { name: "Business $449",price: 449, chats: 4000, voiceMin: 2000, model: "sonnet-5" },
  { name: "Pro on Opus",  price: 179, chats: 1500, voiceMin: 500,  model: "opus-5" },
];
for (const p of plans) {
  const use = 0.6;
  const chatCost = chatConversation(p.model) * p.chats * use;
  const vmin = p.voiceMin * use;
  const voiceCost = vmin * (voiceCall(p.model).total / 3);
  const cogs = chatCost + voiceCost;
  const margin = ((p.price - cogs) / p.price) * 100;
  console.log(`${p.name.padEnd(16)} COGS $${cogs.toFixed(2).padStart(7)}   margin ${margin.toFixed(0).padStart(3)}%   (chat $${chatCost.toFixed(2)}, voice $${voiceCost.toFixed(2)})`);
}

console.log("\n\nWORST CASE — customer uses 100% of allowance\n");
for (const p of plans) {
  const cogs = chatConversation(p.model) * p.chats + p.voiceMin * (voiceCall(p.model).total / 3);
  console.log(`${p.name.padEnd(16)} COGS $${cogs.toFixed(2).padStart(7)}   margin ${(((p.price - cogs) / p.price) * 100).toFixed(0).padStart(4)}%`);
}

console.log("\n\nTODAY'S PUBLISHED PLAN (Team $149 / 2,500 conversations, Opus 5)\n");
const today = chatConversation("opus-5") * 2500;
console.log(`  100% use: COGS $${today.toFixed(2)} on $149 revenue  →  margin ${(((149-today)/149)*100).toFixed(0)}%`);
console.log(`   60% use: COGS $${(today*0.6).toFixed(2)} on $149 revenue  →  margin ${(((149-today*0.6)/149)*100).toFixed(0)}%`);

console.log("\n\n=== REVISED: realistic allowances, voice metered ===\n");
const revised = [
  { name: "Starter $49",   price: 49,  chats: 300,  voiceMin: 0,    model: "sonnet-5", over: null },
  { name: "Pro $149",      price: 149, chats: 1000, voiceMin: 250,  model: "sonnet-5", over: 0.25 },
  { name: "Business $399", price: 399, chats: 3000, voiceMin: 1000, model: "sonnet-5", over: 0.20 },
];
for (const use of [0.6, 1.0]) {
  console.log(`-- customer uses ${use * 100}% of allowance --`);
  for (const p of revised) {
    const chatCost = chatConversation(p.model) * p.chats * use;
    const voiceCost = p.voiceMin * use * (voiceCall(p.model).total / 3);
    const cogs = chatCost + voiceCost;
    console.log(`  ${p.name.padEnd(15)} COGS $${cogs.toFixed(2).padStart(7)}   margin ${(((p.price-cogs)/p.price)*100).toFixed(0).padStart(3)}%`);
  }
  console.log("");
}
console.log("-- overage margin (per extra voice minute) --");
for (const p of revised.filter(x => x.over)) {
  const cost = voiceCall(p.model).total / 3;
  console.log(`  ${p.name.padEnd(15)} charge $${p.over.toFixed(2)}  cost $${cost.toFixed(3)}  margin ${(((p.over-cost)/p.over)*100).toFixed(0)}%`);
}
console.log("\n-- what if a Business customer runs Opus 5? --");
const b = revised[2];
const opusCogs = chatConversation("opus-5") * b.chats + b.voiceMin * (voiceCall("opus-5").total / 3);
console.log(`  Business on Opus, 100% use: COGS $${opusCogs.toFixed(2)} → margin ${(((b.price-opusCogs)/b.price)*100).toFixed(0)}%`);
