# Roadmap

## 0.1 alpha — desktop foundation

- [x] Original OLED black island, compact/expanded modes
- [x] Cortexia branding and browser-generated icon/hero integrated
- [x] Edge attachment, mouse dragging and four-corner resizing
- [x] Hide, opacity, click-through recovery, saved positions/sizes, taskbar/Dock icon
- [x] Live network counters, probe latency and quality
- [x] Explicit power estimate + Shelly outlet provider
- [x] Energy history, prospective tariff and CSV
- [x] Eight selectable/reorderable widgets
- [x] Local backups, restore validation and recovery
- [x] Versioned Windows/macOS packaging and release automation
- [x] User requested update check/download/install flow

## Before stable

- [ ] Validate on the user’s MacBook and Windows notebook
- [ ] Obtain Windows signing and Apple Developer notarization credentials
- [ ] Exercise real signed update installation on both OSes
- [ ] Calibrate power estimates against an actual meter
- [ ] Measure long-running CPU/RAM footprint; reduce Windows helper-process overhead
- [ ] Authenticated/multichannel Shelly devices and additional meter adapters
- [ ] Consolidate widget/provider registration and versioned extension contracts
- [ ] More complete accessibility and mixed-DPI/multi-display testing

## Next design pass — requested 2026-10-07

- [x] Alpha.3: thinner compact composition, stacked readings, notch shoulders, free cross-display dragging and optional edge attachment. Verified on both connected Windows monitors.

- [x] Alpha.4–6 refine the island and its data presentation: typography, number alignment, spacing, compact composition, mini charts and restrained material/lighting detail. Preserve readability and true black surfaces. The owner asked to queue this after the first working release.

## Next widgets — user guided

Reserve the next iteration for the owner’s requested widget list. Candidate investigations include media playback, focus timer, device temperatures, battery charge rate and notifications. Availability, measurement scope and permissions must be clear before implementation.
