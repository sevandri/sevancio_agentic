const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sevancio", {
  startSidecar: (options) => ipcRenderer.invoke("bridge:start", options),
  stopSidecar: () => ipcRenderer.invoke("bridge:stop"),
  getSidecarStatus: () => ipcRenderer.invoke("bridge:status"),
  getAppConfig: () => ipcRenderer.invoke("app:config"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (updates) => ipcRenderer.invoke("config:save", updates),
  testGemini: (key) => ipcRenderer.invoke("config:test-gemini", { key }),
  testHermes: (payload) => ipcRenderer.invoke("config:test-hermes", payload),
  previewVoice: (payload) => ipcRenderer.invoke("config:preview-voice", payload),
  getHermesHistory: () => ipcRenderer.invoke("hermes:history"),
  listHermesSessions: () => ipcRenderer.invoke("hermes:sessions"),
  createHermesSession: () => ipcRenderer.invoke("hermes:create-session"),
  toggleHud: () => ipcRenderer.invoke("hud:toggle"),
  setHudInteractive: (on) => ipcRenderer.send("hud:interactive", Boolean(on)),
  windowControl: (action) => ipcRenderer.send("win:control", action),
  onHudMode: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("hud:mode", handler);
    return () => ipcRenderer.removeListener("hud:mode", handler);
  },
  onWakeRequest: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("svc:wake", handler);
    return () => ipcRenderer.removeListener("svc:wake", handler);
  },
  onSleepRequest: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("svc:sleep", handler);
    return () => ipcRenderer.removeListener("svc:sleep", handler);
  },
  sendCommand: (command) => ipcRenderer.invoke("bridge:command", command),
  sendUiContext: (context) => ipcRenderer.send("svc:ui-context", context),
  sendAudioChunk: (chunk) => ipcRenderer.send("live:audio", chunk),
  notifyBootDone: () => ipcRenderer.send("svc:boot-done"),
  onUiAction: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("svc:ui-action", handler);
    return () => ipcRenderer.removeListener("svc:ui-action", handler);
  },
  onAudioChunk: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("live:audio", handler);
    return () => ipcRenderer.removeListener("live:audio", handler);
  },
  onAudioInterrupt: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("live:interrupt", handler);
    return () => ipcRenderer.removeListener("live:interrupt", handler);
  },
  onSidecarEvent: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("bridge:event", handler);
    return () => ipcRenderer.removeListener("bridge:event", handler);
  },
});
