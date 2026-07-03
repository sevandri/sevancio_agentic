# S E V A N C I O

**Suara. Eksekusi. Otomasi.** — Voice-first desktop companion berbasis AI dua-brains.

[License: MIT](LICENSE) · [Built with Electron](#tech-stack) · [Quick Start](#quick-start)

---

## ✨ Apa itu Sevancio?

Sevancio adalah **voice-first desktop companion** yang menggabungkan:

- 🎙️ **Gemini Live** untuk percakapan realtime — lo ngomong, dia jawab instan, bisa disela
- 🛠️ **Hermes Agent** untuk kerja berat — research, coding, files, terminal, browser automation
- 🖐️ **MediaPipe hand tracking** — kontrol UI pakai tangan di udara
- 🪟 **Glass HUD mode** — overlay transparan di atas seluruh layar

Ketika Hermes selesai mengerjakan task background, Sevancio **proaktif ngomong**: *"Quick update — Hermes is back with the result."*

---

## 🧠 Two-Brain Architecture

```
Kamu (Voice) → Gemini Live (percakapan realtime)
                    ↓ propose → confirm → submit
              Hermes Agent (background tasks via API)
                    ↓ SSE event stream → live UI updates
                    ↓ completion event → proactive announcement
```

**Prinsip Kunci:**
1. **Gemini Live** handle percakapan — lo ngomong, dia jawab instan
2. **Hermes Agent** handle pekerjaan — research, coding, file ops
3. **Sevancio** adalah jembatan — proposal → readback → konfirmasi → submit
4. Task return `run_id` langsung — **tidak pernah blocking**
5. Hasil dilaporkan **hanya dari API**, tidak pernah di-invent

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** dan npm
- **Hermes Agent** terinstall dengan gateway running
- **Gemini API key** dari [Google AI Studio](https://aistudio.google.com/apikey)
- macOS, Windows, atau Linux

### Install & Run

```bash
git clone https://github.com/sevandri/sevancio_agentic.git
cd sevancio_agentic
npm install
npm run dev
```

### Enable Hermes API

```bash
echo 'API_SERVER_ENABLED=true' >> ~/.hermes/.env
echo 'API_SERVER_KEY=sevancio-local-dev' >> ~/.hermes/.env
hermes gateway restart
```

First launch → onboarding wizard muncul untuk setup Gemini key, Hermes config, voice.

### Production Build

```bash
npm start            # build + launch production bundle
npm run package:mac  # macOS .app
npm run dist:win     # Windows distributable
```

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| **W** / **S** | Wake / Sleep |
| **⌥ Space** | Toggle Glass HUD |
| **"Hey Sevancio"** | Wake by voice (opt-in) |

### Gestures

| Gesture | Action |
|---------|--------|
| ☝️ Point & hold 0.3s | Click |
| ✋ Open palm | Scroll |
| 🙌 Two palms | Resize reader |
| ✊ Fist | Close reader |

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Shell | Electron (cross-platform) |
| UI | React 19 + TypeScript + Vite |
| Voice | Gemini Live (`@google/genai`) |
| Agent | Hermes Agent local API |
| Gesture | MediaPipe Tasks Vision |
| Wake word | ONNX Runtime Web |
| Font | Outfit + Satoshi + JetBrains Mono |

---

## 📁 Project Structure

```
sevancio/
├── engine/           # Electron main process (Gemini session, Hermes bridge)
├── ui/               # React frontend
│   ├── widgets/      # UI components
│   ├── core/hooks/   # React hooks
│   ├── lib/          # Utilities
│   └── styles/       # CSS design system
├── assets/           # Icons and branding
├── bridge/           # Python helper scripts
├── wake-model/       # ONNX wake word models
└── scripts/          # Dev launchers
```

---

## 📄 License

MIT — build wild things with it.
