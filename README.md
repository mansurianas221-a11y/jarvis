# Jarvis — AI Voice Assistant

A premium, futuristic AI voice assistant for Android & iOS, built with **React Native (Expo) + TypeScript**.

- 🎙 **Push-to-talk** voice input (and an optional *"Hey Jarvis"* wake-word toggle)
- ⚡ **Streaming AI replies** with a typing effect
- 🔊 **Text-to-speech** with voice, speed & pitch controls
- 🌍 **English · हिन्दी · Hinglish**
- 💾 Local chat history, copy/share, retry, mute & stop-speaking
- 🎨 Dark futuristic UI — neon orb, glassmorphism, starfield, Reanimated animations
- 🔒 API keys live **only** on the server. No key is ever embedded in the app.
- 🧪 Runs in **Demo Mode** (offline, honest canned replies) when no AI backend is configured — nothing breaks.

---

## Developer

**Anas Papa** · Telegram: [**@AnaxModz**](https://t.me/AnaxModz)

---

## Project layout

```
app/                    Expo Router routes (screens)
  index.tsx             Splash
  onboarding.tsx        Onboarding + mic permission step
  about.tsx             About / developer (Telegram CTA)
  permissions.tsx       Permission & error states
  settings/voice.tsx    Voice picker
  +not-found.tsx        404 fallback
  (tabs)/               Home · Chat · History · Settings
src/
  components/           20 UI components (orb, waveform, chips, glass, …)
  lib/                  ai, stt, tts, demoEngine, i18n, storage, …
  state/                Settings, Conversations, Assistant, Toast providers
  theme/                Colors, spacing, typography, ThemeProvider
server/
  api/chat.ts           Streaming AI proxy (Vercel / Node serverless)
  api/health.ts         Health probe
scripts/
  generate-assets.js    Zero-dependency PNG generator (icons/splash)
```

---

## Setup

> **This repository cannot build APKs on a phone.** You need a computer with
> Node.js and (for native builds) Android Studio/Xcode or EAS. See **Build** below.

### 1. Install dependencies

```bash
npm install
```

`postinstall` automatically runs `node scripts/generate-assets.js`, which creates
`assets/*.png` (icon, adaptive-icon, splash, favicon). If it was skipped, run it
manually:

```bash
npm run assets
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL of your deployed `server/` routes. **Leave empty for Demo Mode.** |
| `EXPO_PUBLIC_APP_SECRET` | Shared secret sent as `x-jarvis-secret`. Must match `AI_ROUTE_SECRET`. |
| `EXPO_PUBLIC_ENABLE_WAKE_WORD` | Toggle the optional *"Hey Jarvis"* wake word. |
| `EXPO_PUBLIC_DEMO_MODE_ALLOWED` | Allow offline demo replies when no backend is set. |

**Never commit a real `.env`.** All `EXPO_PUBLIC_*` values are inlined at build
time — treat them as public. Secrets belong on the server.

### 3. Deploy the AI server

Drop the `server/` folder on Vercel (or any Node serverless host) and set these
server-side environment variables:

| Variable | Purpose |
| --- | --- |
| `AI_API_KEY` | Your AI provider key. **Never exposed to the app.** |
| `AI_MODEL` | Provider model id (default `gpt-4o-mini`). |
| `AI_BASE_URL` | Optional OpenAI-compatible base URL to use other providers. |
| `AI_ROUTE_SECRET` | Optional shared secret; the app sends it as `x-jarvis-secret`. |

The endpoint:

- `POST /api/chat` — accepts `{ messages, language, stream }`, streams
  `data: {"delta":"..."}` deltas (SSE), validates size/roles, and never leaks
  keys or upstream error internals to the client.
- `GET /api/health` — uptime probe.

---

## Build & run

Speech recognition (`expo-speech-recognition`) contains native code, so it does
**not** work in Expo Go — you must build a development build.

```bash
npm run start        # dev client / dev build
npm run android      # expo run:android  (needs Android SDK)
npm run ios          # expo run:ios      (needs Xcode, macOS)
npm run web          # expo start --web
```

**EAS build (recommended for distribution):**

```bash
npx eas build --profile development --platform android
npx eas build --platform android   # production APK/AAB
```

After installing the dev build, start the dev server with `npx expo start --dev-client`.

### No computer? Build from your phone — free

You do not need a PC. Two options:

**Option A — GitHub Actions (no account setup on your side):**
1. Push this project to GitHub.
2. The `.github/workflows/build-apk.yml` workflow builds an APK in the cloud
   automatically on push — or open **Actions → "Build Jarvis APK" → Run workflow**.
3. Download `jarvis-debug-apk` from the workflow's artifacts and install it.

**Option B — Expo cloud build (15 free Android builds/month):**
1. Install **Termux** (from GitHub releases) on your phone.
2. Inside Termux:
   ```bash
   pkg update && pkg install nodejs-lts git -y
   cd ~ && git clone <your-repo-url> JarvisApp && cd JarvisApp
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest build --platform android --profile preview
   ```
   (`eas.json` is already configured: `preview` → APK, `production` → AAB.)
3. EAS builds in the cloud and emails you a download link. **15 Android
   builds/month are free.**

> Note: speech recognition needs a **development build** (`npx expo run:android`
> or the EAS `development` profile) for full voice features. Debug/APK builds
> still run the app — text chat, TTS and demo replies work in all builds.

---

## Voice & permissions

- The microphone is only active while you hold the mic button.
- Speech is transcribed via the Android SpeechRecognizer / iOS SFSpeechRecognizer
  (on-device where the platform supports it). The app never records or stores audio.
- If the recogniser is unavailable, or permissions are denied, Jarvis falls back
  to **text chat** and shows clear explanations with a *"Open settings"* action.
- Text-to-speech voices come from the device — pick one under
  **Settings → Voice**.

## Demo Mode

With an empty `EXPO_PUBLIC_API_BASE_URL`, every request is answered by the local
`demoEngine` (time, date, math, jokes, greetings, developer info, etc.) and is
labelled **DEMO** in the UI. This keeps the app fully functional offline.

## Troubleshooting

- **"Speech recognition not available"** → speech-recognition requires a dev
  build (Expo Go unsupported). Check device language + Google speech services.
- **TTS silent on device** → install a TTS voice in system settings
  (Settings → System → Languages & input → Text-to-speech).
- **API returns 503** → `AI_API_KEY` not set on the server, or the app secret
  does not match `AI_ROUTE_SECRET`.

## Credits

Built by **Anas Papa** ([@AnaxModz](https://t.me/AnaxModz)).

Jarvis is an original app. It is not affiliated with, endorsed by, or styled
after any film, studio, or other assistant.
