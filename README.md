# 📱 FreshScan Mobile — iOS & Android App

> Food freshness classifier — built with Expo (React Native)  
> Works on both iOS and Android. Builds in the cloud via EAS (no Mac needed!).

---

## Prerequisites

- Node.js 18+ installed → [nodejs.org](https://nodejs.org)
- Your **FastAPI backend already deployed** on Render (from the web app step)
- A free **Expo account** → [expo.dev](https://expo.dev)

---

## Project Structure

```
freshscan-mobile/
├── App.tsx          ← Full app UI and logic
├── app.json         ← Expo config (bundle IDs, permissions, splash)
├── eas.json         ← EAS cloud build config
├── package.json
├── tsconfig.json
└── assets/          ← Add your icon.png and splash.png here
```

---

## 🚀 Setup & Build in 5 Steps

### Step 1 — Connect to your Backend

Open `App.tsx` and find line 8:

```ts
const API_URL = 'https://YOUR-APP-NAME.onrender.com/analyze';
```

Replace with your actual Render backend URL:

```ts
const API_URL = 'https://freshscan-api.onrender.com/analyze';
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Run locally on your phone (instant preview)

```bash
# Install Expo Go on your phone from App Store / Play Store
npx expo start
# Scan the QR code with Expo Go (Android) or Camera app (iOS)
```

This lets you test the app instantly — no build required!

---

### Step 4 — Set up EAS for cloud builds (iOS + Android)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Link this project to your Expo account
eas init
# This updates the projectId in app.json automatically
```

---

### Step 5 — Build your app in the cloud (no Mac needed!)

**Android APK** (test on any Android device):
```bash
eas build --platform android --profile preview
```

**iOS** (requires a free Apple Developer account):
```bash
eas build --platform ios --profile preview
```

**Both at once:**
```bash
eas build --platform all --profile preview
```

EAS builds in their cloud — you get a download link when done (~10-15 min).  
Install the APK directly on Android. iOS requires TestFlight or App Store.

---

## Add App Icons & Splash Screen

Place these files in `/assets/`:

| File | Size |
|---|---|
| `icon.png` | 1024×1024 px |
| `splash.png` | 1284×2778 px |
| `adaptive-icon.png` | 1024×1024 px (Android) |

Use [appicon.co](https://appicon.co) to generate all sizes from one image for free.

---

## Apple Developer Account (for iOS)

- Free account → can build with EAS but **cannot publish** to App Store
- $99/year → publish to App Store
- Sign up at [developer.apple.com](https://developer.apple.com)

EAS handles all the certificates and provisioning profiles for you automatically.

---

## How the App Works

```
User opens app
  → Taps "Camera" or "Library"
  → Picks/takes a food photo
  → Taps "Analyze Freshness"
  → App sends base64 image to your FastAPI backend on Render
  → Backend calls Gemini Vision API
  → Returns verdict: fresh / okay / avoid + confidence + tags
  → App displays result card
```

---

## Resume Line

> *Built a cross-platform iOS & Android food quality classifier using Expo (React Native), Google Gemini Vision API, and FastAPI — deployed via EAS cloud builds with no Mac required.*

---

## Stack

| Layer | Tech |
|---|---|
| Mobile Framework | Expo (React Native) + TypeScript |
| AI | Google Gemini Vision (Free tier) |
| Backend | FastAPI on Render.com |
| Cloud Builds | Expo EAS Build (Free tier) |
| Platforms | iOS + Android |
