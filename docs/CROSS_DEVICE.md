# Cross-device setup

Repository: https://github.com/GhostFelina/cortexia-island

On Windows this workspace starts at `Desktop/Projeler/cortexia-island`. On macOS discover the real Desktop path and clone into a project folder; do not use a Windows path.

```sh
git clone https://github.com/GhostFelina/cortexia-island.git
cd cortexia-island
npm ci
npm run check
npm run dev
```

Use Node 24. Recreate dependencies per OS; do not copy `node_modules`, Electron binaries, build outputs, credentials or user data between machines. UTF-8 source and the lockfile are portable. Download the correct release architecture for ordinary installation; installed apps do not need Node.

Windows desktop: first live-data exercise. Windows notebook: verify battery, charging, display scaling, suspend/resume and default route changes. MacBook: verify tray/menu bar, top safe area, arm64/x64 package, CPU/network counters, battery and local time. macOS 13+ is required for Electron 44.

Each device keeps its own consumption history. JSON exports transfer profiles intentionally; import replaces the target profile after confirmation and creates a local backup. There is no automatic telemetry synchronization.
