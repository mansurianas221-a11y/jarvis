import type { LanguageCode } from './types';
import { hashString, sanitizeForSpeech } from './utils';

/**
 * Jarvis — offline demo engine.
 *
 * This is NOT a fake "AI" that pretends to be a language model. It is an
 * honest, local intent matcher that answers a useful set of everyday prompts
 * when no AI API key is configured. Every reply is surfaced in the UI with a
 * "Demo" badge so the user always knows what they are looking at.
 */

export interface DemoReply {
  text: string;
  /** Short label describing the matched intent (used for debugging/tests). */
  intent: string;
}

const SMALL_TALK_EN = [
  'I am Jarvis — your on-device assistant. Right now I am running in Demo Mode, so my answers come from a small local rule set rather than a full language model.',
  'Good to see you. I am here and listening. Demo Mode is active until an AI endpoint is configured.',
  'Hello! Ask me for the time, a calculation, a joke, or a language tip. I can also tell you what I can do.',
];

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length] as T;
}

/* --------------------------- safe arithmetic ---------------------------- */

/**
 * A deliberately tiny recursive-descent calculator. No `eval`, no globals —
 * just numbers, + - * / % ^ and parentheses. Returns null when unparseable.
 */
export function evaluateExpression(input: string): number | null {
  const src = input
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  if (!/^[-+*/%^().\d]+$/.test(src) || !/[-+*/%^]/.test(src)) return null;

  let i = 0;
  const peek = () => src[i];
  const eat = (ch: string) => {
    if (src[i] === ch) {
      i++;
      return true;
    }
    return false;
  };

  function parseExpr(): number {
    let value = parseTerm();
    for (;;) {
      if (eat('+')) value += parseTerm();
      else if (eat('-')) value -= parseTerm();
      else return value;
    }
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      if (eat('*')) value *= parseFactor();
      else if (eat('/')) {
        const d = parseFactor();
        if (d === 0) throw new Error('div0');
        value /= d;
      } else if (eat('%')) {
        const d = parseFactor();
        if (d === 0) throw new Error('div0');
        value %= d;
      } else return value;
    }
  }

  function parseFactor(): number {
    const base = parseUnary();
    if (eat('^')) return Math.pow(base, parseFactor());
    return base;
  }

  function parseUnary(): number {
    if (eat('-')) return -parseUnary();
    if (eat('+')) return parseUnary();
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (eat('(')) {
      const value = parseExpr();
      if (!eat(')')) throw new Error('paren');
      return value;
    }
    const start = i;
    while (i < src.length && /[\d.]/.test(src[i] as string)) i++;
    if (start === i) throw new Error('number');
    const value = Number(src.slice(start, i));
    if (!Number.isFinite(value)) throw new Error('number');
    return value;
  }

  try {
    if (!peek()) return null;
    const result = parseExpr();
    if (i !== src.length) return null;
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/* ------------------------------ time / date ----------------------------- */

function timeReply(lang: LanguageCode): string {
  const now = new Date();
  const time = now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (lang === 'hi') return `अभी ${time} बजे हैं।`;
  if (lang === 'hinglish') return `Abhi ${time} baje hain.`;
  return `It is ${time} right now.`;
}

function dateReply(lang: LanguageCode): string {
  const now = new Date();
  const date = now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (lang === 'hi') return `आज ${date} है।`;
  if (lang === 'hinglish') return `Aaj ${date} hai.`;
  return `Today is ${date}.`;
}

/* -------------------------------- corpus -------------------------------- */

const JOKES = [
  'Why did the developer go broke? Because they used up all their cache.',
  'I told my computer I needed a break — it said “why not try a reboot?”',
  'There are two hard things in computing: cache invalidation, naming things, and off-by-one errors.',
  'A SQL query walks into a bar, approaches two tables and asks: “may I join you?”',
];

const JOKES_HI = [
  'प्रोग्रामर की शादी क्यों नहीं हो रही थी? क्योंकि वो हर रिश्ते में “bug” ढूंढ रहा था।',
  'कंप्यूटर डॉक्टर के पास क्यों गया? क्योंकि उसका “window” काम नहीं कर रहा था।',
];

const MOTIVATION = [
  'Small, consistent steps beat big, rare leaps. Pick one thing today and finish it.',
  'You do not need more time — you need fewer open loops. Close one and the momentum returns.',
  'Clarity comes from action, not from thinking about action. Start badly, then improve.',
];

const FACTS = [
  'Octopuses have three hearts, and two of them stop beating when they swim.',
  'A day on Venus is longer than a year on Venus.',
  'Honey never spoils — edible honey has been found in 3,000-year-old tombs.',
  'The first computer bug was an actual moth, taped into a logbook in 1947.',
];

const CAPABILITIES_EN = `Here is what I can do right now:

• **Voice chat** — hold the mic to speak, and I answer out loud.
• **Three languages** — English, Hindi and Hinglish.
• **Voice controls** — change voice, speed and pitch in Settings.
• **Saved chats** — every conversation is stored on your device.
• **Copy, share and retry** — long-press any message.

In Demo Mode I answer from a local rule set. Deploy the included API route and set \`EXPO_PUBLIC_API_BASE_URL\` to unlock full conversational AI.`;

const CAPABILITIES_HI = `अभी मैं ये कर सकता हूँ:

• **वॉइस चैट** — माइक दबाकर बोलिए, मैं आवाज़ में जवाब दूँगा।
• **तीन भाषाएँ** — अंग्रेज़ी, हिन्दी और हिंग्लिश।
• **आवाज़ नियंत्रण** — सेटिंग्स में आवाज़, गति और पिच बदलें।
• **सेव चैट** — हर बातचीत आपके डिवाइस पर सेव होती है।

डेमो मोड में मैं स्थानीय नियमों से जवाब देता हूँ। असली एआई के लिए API route डिप्लॉय करें।`;

/* -------------------------------- matcher ------------------------------- */

interface Rule {
  intent: string;
  test: RegExp;
  reply: (lang: LanguageCode, prompt: string, seed: number) => string;
}

const RULES: Rule[] = [
  {
    intent: 'greeting',
    test: /\b(hi|hello|hey|hola|namaste|नमस्ते|नमस्कार|yo)\b/i,
    reply: (lang, _p, seed) => {
      if (lang === 'hi') return 'नमस्ते! मैं जार्विस हूँ — डेमो मोड में आपकी मदद के लिए तैयार।';
      if (lang === 'hinglish') return 'Namaste! Main Jarvis hoon — Demo Mode mein aapki help ke liye ready.';
      return pick(SMALL_TALK_EN, seed);
    },
  },
  {
    intent: 'how-are-you',
    test: /\b(how are you|how's it going|kaise ho|kese ho|कैसे हो|कैसे हैं)\b/i,
    reply: (lang, _p, seed) => {
      if (lang === 'hi') return 'मैं बिल्कुल ठीक हूँ, धन्यवाद! आप बताइए, क्या मदद करूँ?';
      if (lang === 'hinglish') return 'Main bilkul theek hoon, thanks! Aap bataiye, kya help karun?';
      return pick(
        ['Running at full capacity and glad you asked.', 'All systems nominal. What are we working on?'],
        seed,
      );
    },
  },
  {
    intent: 'capabilities',
    test: /\b(what can you do|capabilit|features|help me|commands|kya kar sakte|क्या कर सकते)\b/i,
    reply: (lang) => (lang === 'en' ? CAPABILITIES_EN : CAPABILITIES_HI),
  },
  {
    intent: 'time',
    test: /\b(what time|time now|current time|समय|कितने बजे|kitne baje|time kya)\b/i,
    reply: (lang) => timeReply(lang),
  },
  {
    intent: 'date',
    test: /\b(date|today's day|what day|तारीख|आज कौन|aaj kya din|aaj ki date)\b/i,
    reply: (lang) => dateReply(lang),
  },
  {
    intent: 'joke',
    test: /\b(joke|funny|hasao|चुटकुला|मज़ाक|majak|mazak)\b/i,
    reply: (lang, _p, seed) =>
      lang === 'hi' ? pick(JOKES_HI, seed) : pick(JOKES, seed),
  },
  {
    intent: 'motivate',
    test: /\b(motivat|inspire|give up|tired|thak|थक|हिम्मत)\b/i,
    reply: (lang, _p, seed) => {
      if (lang === 'hi')
        return 'छोटे-छोटे कदम ही बड़े बदलाव लाते हैं। आज एक काम पूरा कीजिए — बाकी खुद-ब-खुद आसान लगेगा।';
      if (lang === 'hinglish')
        return 'Chhote-chhote steps hi bade changes laate hain. Aaj ek kaam poora kijiye — baaki khud aasan lagega.';
      return pick(MOTIVATION, seed);
    },
  },
  {
    intent: 'fact',
    test: /\b(fact|interesting|did you know|रोचक|मज़ेदार तथ्य)\b/i,
    reply: (lang, _p, seed) => {
      const fact = pick(FACTS, seed);
      if (lang === 'hi') return `एक रोचक तथ्य: ${fact}`;
      if (lang === 'hinglish') return `Ek interesting fact: ${fact}`;
      return `Here is one: ${fact}`;
    },
  },
  {
    intent: 'weather',
    test: /\b(weather|temperature|rain|मौसम|बारिश|garmi|sardi)\b/i,
    reply: (lang) => {
      if (lang === 'hi')
        return 'मैं डेमो मोड में हूँ, इसलिए लाइव मौसम डेटा नहीं ला सकता। API जोड़ने पर यह काम करेगा।';
      if (lang === 'hinglish')
        return 'Main Demo Mode mein hoon, isliye live weather data nahi la sakta. API add karne par ye kaam karega.';
      return 'I cannot read live weather in Demo Mode — that needs an AI endpoint with a weather tool.';
    },
  },
  {
    intent: 'name',
    test: /\b(your name|who are you|tumhara naam|तुम्हारा नाम|kaun ho|कौन हो)\b/i,
    reply: (lang) => {
      if (lang === 'hi') return 'मैं जार्विस हूँ, आपका एआई सहायक। डेवलपर: अनस पापा।';
      if (lang === 'hinglish') return 'Main Jarvis hoon, aapka AI assistant. Developer: Anas Papa.';
      return 'I am Jarvis, your AI assistant — built by Anas Papa.';
    },
  },
  {
    intent: 'developer',
    test: /\b(who made|developer|creator|banaya|बनाया|anas|anaxmodz)\b/i,
    reply: (lang) => {
      if (lang === 'hi')
        return 'मुझे अनस पापा (Anas Papa) ने बनाया है। टेलीग्राम: @AnaxModz — t.me/AnaxModz';
      if (lang === 'hinglish')
        return 'Mujhe Anas Papa ne banaya hai. Telegram: @AnaxModz — t.me/AnaxModz';
      return 'I was built by Anas Papa. You can reach him on Telegram at @AnaxModz — t.me/AnaxModz';
    },
  },
  {
    intent: 'thanks',
    test: /\b(thanks|thank you|shukriya|धन्यवाद|शुक्रिया)\b/i,
    reply: (lang) => {
      if (lang === 'hi') return 'आपका स्वागत है! और कुछ चाहिए तो बताइए।';
      if (lang === 'hinglish') return 'Aapka swagat hai! Aur kuch chahiye to bataiye.';
      return 'Anytime. Anything else you would like to try?';
    },
  },
  {
    intent: 'bye',
    test: /\b(bye|goodbye|see you|alvida|अलविदा|chalta hoon)\b/i,
    reply: (lang) => {
      if (lang === 'hi') return 'अलविदा! जब भी ज़रूरत हो, मैं यहीं हूँ।';
      if (lang === 'hinglish') return 'Alvida! Jab bhi zaroorat ho, main yahin hoon.';
      return 'Goodbye — I will be right here when you need me.';
    },
  },
  {
    intent: 'language',
    test: /\b(hindi|english|hinglish|language|भाषा|बोलो)\b/i,
    reply: (lang) => {
      if (lang === 'hi')
        return 'मैं हिन्दी, अंग्रेज़ी और हिंग्लिश बोल सकता हूँ। भाषा सेटिंग्स में बदल सकते हैं।';
      if (lang === 'hinglish')
        return 'Main Hindi, English aur Hinglish bol sakta hoon. Language Settings mein badal sakte hain.';
      return 'I support English, Hindi and Hinglish. You can switch anytime in Settings → Language.';
    },
  },
];

/** Phrases that mean "empty the conversation" — handled by the UI, echoed here for completeness. */
export function getDemoReply(prompt: string, lang: LanguageCode): DemoReply {
  const raw = prompt.trim();
  const normalized = raw.toLowerCase();
  const seed = hashString(normalized);

  if (!normalized) {
    return {
      intent: 'empty',
      text: lang === 'hi' ? 'मैं सुन रहा हूँ — कुछ कहिए।' : 'I am listening — go ahead.',
    };
  }

  // Arithmetic first: "2+2", "what is 15% of 200" is out of scope, but plain
  // expressions are common enough to be worth handling properly.
  const expression = normalized
    .replace(/^(what('s| is)|calculate|solve|kitna hota hai|kitna hai)\s*/i, '')
    .replace(/[?=]$/g, '')
    .trim();
  if (/^[\d\s+\-*/%^().,×✕÷]+$/.test(expression) && /[+\-*/%^×✕÷]/.test(expression)) {
    const value = evaluateExpression(expression);
    if (value !== null) {
      const rounded = Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      if (lang === 'hi') return { intent: 'math', text: `उत्तर ${rounded} है।` };
      if (lang === 'hinglish') return { intent: 'math', text: `Jawab ${rounded} hai.` };
      return { intent: 'math', text: `That comes to **${rounded}**.` };
    }
  }

  for (const rule of RULES) {
    if (rule.test.test(normalized)) {
      return { intent: rule.intent, text: rule.reply(lang, raw, seed) };
    }
  }

  const fallbackEn = [
    `I am in Demo Mode, so I cannot answer that one properly. Here is what I can help with: time, date, quick maths, a joke, a fact, or a language tip.\n\nFor full answers, connect an AI endpoint — the setup steps are in the README.`,
    `That is beyond my offline rule set. Try asking for the time, a calculation like "18 * 7", or "what can you do".`,
  ];
  const fallbackHi = [
    'मैं डेमो मोड में हूँ, इसलिए इसका पूरा जवाब नहीं दे सकता। समय, तारीख, गणित, चुटकुला या भाषा के बारे में पूछिए।',
    'यह मेरे ऑफ़लाइन नियमों से बाहर है। “तुम क्या कर सकते हो” पूछिए।',
  ];

  const text =
    lang === 'hi'
      ? pick(fallbackHi, seed)
      : lang === 'hinglish'
        ? pick(
            [
              'Ye mere offline rule set se bahar hai. Time, date, calculation, joke ya “what can you do” try kijiye.',
              'Demo Mode mein main iska poora jawab nahi de sakta. Koi simple sawaal poochhiye.',
            ],
            seed,
          )
        : pick(fallbackEn, seed);

  return { intent: 'fallback', text };
}

/**
 * Simulate token-by-token streaming for demo replies so the UI, typing
 * animation and "stop" button behave exactly as they do with a real model.
 */
export function* streamDemoReply(text: string): Generator<string> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (word) yield word;
  }
}

export { sanitizeForSpeech };
