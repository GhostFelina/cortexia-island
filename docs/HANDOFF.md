# Current handoff — paused by owner

**Status: PAUSED at the owner's explicit request on 2026-10-07. Resume tomorrow; do not keep developing or install more packages while paused.** Project: Cortexia Island. Windows path: C:/Users/User/Desktop/Projeler/cortexia-island. Repository: https://github.com/GhostFelina/cortexia-island. Branch: main. Version: 0.1.0-alpha.8.

## Owner's latest feedback and next priorities

1. **Usage quotas are reportedly wrong.** Treat this as an open correctness issue, not a completed accurate integration. Compare the actual Codex/Claude usage pages with the widget: account matching, used vs remaining, window duration, reset timestamp, stale/replayed CLI state and source mapping. Do not invent percentages or collect OAuth credentials. Codex's real read-only provider was tested, but that alone does not validate the owner's account/page agreement. Claude is a status-line report, not independent web polling; no real Claude backend percentage verification has occurred.
2. **Electricity cost, general tracking and analysis still feel amateur to the owner.** Reconsider what is calculated, how uncertainty/coverage is communicated, and what decisions the view helps make. Build a professional useful calculation/analysis and presentation plan together; do not merely increase decoration. Keep electricity/cost as the primary theme and city/district-only tariff input. Wall measurement and CPU estimates must stay distinct; never backfill missing time or claim a household invoice.
3. **More work requested for background, theme, and Codex/Claude icons.** Record these as upcoming design tasks, not already finished assets. Explore a coherent premium background/theme system and appropriate provider branding/icons. Show previews to the owner; retain OLED black, minimalist electricity animation, readability and reduced motion.

## Implemented foundation

Alpha.7 fixed shared runtime packaging. Alpha.8 adds PC-session used energy/cost beside daily totals; same login/boot app-restart continuation; sleep/offline exclusion; tracking in background on close and configurable login startup; restrained electricity glint both between energy/power cards and between taskbar cost/kWh; island/bar-only/native-app/both choice, five Settings sections and right-click menus; ten widget choices with official Codex app-server and reversible documented Claude Code status-line connection. Windows bar rotates every ten seconds: electricity cost/kWh → Codex 5h/week → Claude 5h/week. Hover pauses and leaving resumes. Fixed metrics remain selectable.

The implementation exists, but the owner's latest quota correctness and electricity/design feedback above must be addressed next. Do not describe the product as finished or professionally validated.

## Verification and release state at pause

- 20 unit tests, strict type/build, format, audit zero; native island smoke on both connected Windows displays and native app-frame smoke. Tests include real ten-second rotation/hover waits, stable DOM electricity animation and reduced motion. Public demo screenshots use labeled fixtures.
- Alpha.8 release at tag b077f69613a1e3228c0389f9b62ee88a13b4464c succeeded: GitHub run 37674137993. Actual packaged island/native-app smoke passed for Windows x64, Mac arm64 and Mac x64. Quality run 37674134713 succeeded. Public release has 13 assets: https://github.com/GhostFelina/cortexia-island/releases/tag/v0.1.0-alpha.8.
- **Installed Windows application is a locally built alpha.8 package, not yet the final downloaded GitHub binary.** Local packaged tests passed and install exit was zero. Exact full profile preservation before first launch verified. Normal app is running; history/tariff/location preservation and boot tracking were checked. Login startup exists in HKCU Run under electron.app.Cortexia Island, with only the installed executable (no capture flags).
- A fresh-Claude-status-line setup null-state bug was caught after that local build, fixed and regression tested in b077f69 before public release. **Next time download the published alpha.8 Windows installer, verify the SHA256 manifest and reinstall** to align the installed binary with the final tag. Back up the current profile first and quit gracefully. Published installer download/hash/installation and final installed EPDK/update-feed checks remain unfinished because the owner explicitly paused.
- The owner's Claude bridge was configured using the corrected module; unrelated Claude settings preservation verified. Installed Electron's helper runtime passed with an isolated fixture under .artifacts/installed-bridge-test, never copied into live cache. Real Claude cache was not available at pause. The documented CLI must emit actual data; do not send a synthetic model request just to populate it.
- Own actual installed UI capture: ignored .artifacts/live-preview.png. Latest pre-upgrade backup: ignored .artifacts/profile-before-alpha8.json. Private files and real readings must remain out of Git. Mode onboarding remains available until the owner chooses.

## Resume procedure

Verify the actual OS/shell and this project's AGENTS.md, git status, REQUESTS.md, KNOWN_ISSUES.md, AI_USAGE.md and TARIFFS.md. Preserve changes. Read this document before doing anything else. Resume the open issues above; do not repeat completed foundations. On another device discover its actual Desktop and clone the repository; do not use Windows paths on Mac or copy node_modules/secrets.

Limits: unsigned alpha; real MacBook/notebook/meter testing and signing/notarization pending; CPU model isn't wall power; local unauthenticated single-channel Shelly; no missing-time energy backfill; unsupported auto-hidden/non-bottom/left-aligned Windows bar overlay; city/district cannot determine household contract/tier; automatic tax review currently covers 2026 only. No grid/PSU safety diagnosis.
