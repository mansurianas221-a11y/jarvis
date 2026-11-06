# 📱 Phone se hi Jarvis ka APK banao (computer ke bina)

Ye guide sirf **phone + internet** ke liye hai. Do raste hain — dono free:

- **Rasta A — GitHub Actions:** code GitHub par daalo, APK cloud me ban jayega,
  neeche download link milega. (Tumne yahi chuna hai.)
- **Rasta B — Expo EAS (Termux se):** GitHub ki zarurat nahi, seedha phone se
  cloud build. 15 Android builds/month free.

> ⚠️ APK build **phone ke andar** nahi hota (uske liye Node + JDK + Android SDK
> chahiye jo phone me nahi hote). Ye dono raste **cloud me** build karte hain —
> isliye internet zaroori hai.

---

## Rasta A — GitHub Actions (recommended)

### A1. GitHub par repo banao
1. Phone browser me **github.com** kholo → sign up / login.
2. Top-right **+** → **New repository**.
3. Name: `jarvis` · **Private** ya **Public** (dono chalega) → **Create repository**.

### A2. Code phone se upload karo
GitHub website par folder drag-drop mobile me flaky hota hai. Sabse pakka tarika
**GitHub ke andar hi naya file banana** hai, ya **Termux** (neeche) — par sabse
aasan: ek **Git client app** use karo.

**Aasan tarika (koi bhi Git app):**
1. Play Store se **"Termux"** ya koi Git client install karo.
2. Termux kholo aur ye commands chalao:

```bash
termux-setup-storage                 # storage permission do (Allow)
pkg update -y && pkg install git -y
cd ~
git clone https://github.com/<TUMHARA-USERNAME>/jarvis.git
cp -r /sdcard/MT2/JarvisApp/. jarvis/
cd jarvis
git add -A
git commit -m "Jarvis app"
git push
```
> `<TUMHARA-USERNAME>` apne GitHub username se badlo. Push karte waqt GitHub
> username + **Personal Access Token** (password ki jagah) maangega:
> GitHub → Settings → Developer settings → Personal access tokens → Generate
> (scope: `repo`). Wo token password ki tarah paste karo.

### A3. Build hone do
Push hote hi GitHub tumhara build chala dega:
1. Repo → **Actions** tab kholo.
2. **"Build Jarvis APK"** workflow dikhega — yellow dot = chal raha hai,
   green ✅ = ban gaya (5–15 min; pehli baar thoda zyada).
3. Agar push par na chale: **Actions → Build Jarvis APK → Run workflow**.

### A4. APK download + install
1. Green ✅ wale run par tap karo.
2. Neeche **Artifacts** → **`jarvis-apk`** tap → `.zip` download.
3. Zip ko extract karo (koi bhi file manager) → **`jarvis-<number>.apk`** milega.
4. Us APK par tap → **Install** (unknown sources allow karna pad sakta hai).

Bas! App standalone chalega — Metro server ki zarurat nahi.

---

## Rasta B — Expo EAS (Termux se, GitHub ke bina)

```bash
termux-setup-storage
pkg update -y && pkg install nodejs-lts git -y

cd /sdcard/MT2/JarvisApp      # ya apna path
git init && git add -A && git commit -m init   # EAS ke liye (optional par safe)

npm install                   # assets bhi ban jayenge
npx eas-cli@latest login      # Expo account banao (free) aur login
npx eas-cli@latest build --platform android --profile preview
```

- `preview` profile → **APK** (seedha install hoga).
- Build cloud me hoga; khatam hone par EAS ek **download link** dega (aur mail bhi).
- 15 Android builds/month free.

> Full voice features (speech recognition) ke liye **development build** chahiye:
> `npx eas-cli@latest build --platform android --profile development` — lekin ye
> dev client hai jo dev server maangta hai. Sirf install-karke-chalane ke liye
> **preview** profile hi use karo.

---

## APK install karne ke baad

- **Bina kisi setup ke:** app **Demo Mode** me chalega — text chat, voices,
  saare features offline test kar sakte ho (AI replies canned honge).
- **Asli AI replies chahiye:** `server/` folder ko Vercel par deploy karo aur
  app me `EXPO_PUBLIC_API_BASE_URL` set karo (dekho README → "Deploy the AI server").
  Server deploy karne ke baad workflow / `.env` me wo URL daalo aur dobara build karo.

## Agar build fail ho

Sabse pehle: **Actions tab → fail wala run → "Build standalone release APK"
step kholo → error ka screenshot / text bhejo.** Neeche common errors:

| Error (jaisa dikhega) | Matlab | Fix |
|---|---|---|
| `npm ERR! ... postinstall` | `scripts/` folder push nahi hua | poora project push karo (`git add -A`) |
| `Cannot find module 'expo-router'` etc. | `package.json`/`node_modules` adhoora | `npm install` step ka log dekho |
| `SDK location not found` | `ANDROID_HOME` set nahi | workflow me `setup-android@v3` already hai |
| `NDK not found` / `No version of NDK matched` | NDK 26.1.10909125 install nahi hua | workflow me `sdkmanager` step already hai (dobara run karo) |
| `Execution failed for task ':app:...'` with Kotlin | version mismatch | `expo-build-properties` already pin karta hai |
| `Git branch has uncommitted changes` | prebuild dirty tree | `EXPO_NO_GIT_STATUS=1` already set hai |
| `fatal: not a git repository` | repo theek se init nahi hua | `git init` + `git add -A` + `git commit` |
| Actions tab khaali / koi workflow nahi | `.github/` folder push nahi hua | hidden folder bhi push karo |

**`git add -A` zaroori hai** — warna `.github/`, `.gitignore` jaise hidden
files push nahi hote aur Actions tab khaali rehta hai.

```bash
cd ~/jarvis
git add -A          # -A = saari files, hidden bhi
git status          # check karo .github/ dikh raha hai
git commit -m "Jarvis"
git push
```

## AndroidIDE / "Android Code Studio" se NAHI hoga

Important: **AndroidIDE sirf plain Java/Kotlin Android apps build karta hai.**
Jarvis ek **React Native + Expo** app hai — uske liye **Node.js + Metro bundler**
chahiye, jo AndroidIDE me nahi hota. Isliye AndroidIDE me ye project import
karke build karne ki koshish mat karo — pehle se hi fail hoga.

React Native app ke liye sirf 2 raste hain: **GitHub Actions** ya **EAS Build**
(dono cloud me — neeche). Iske alawa kuch nahi chalta bina computer ke.

---

### Developer
**Anas Papa** · Telegram [@AnaxModz](https://t.me/AnaxModz)
