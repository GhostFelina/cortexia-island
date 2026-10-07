# Changelog

## 0.1.0-alpha.3 — 2026-10-07

- Redesign compact mode with a 68 px window, stacked download/upload/ping and power readings, restrained typography, concave top shoulders and softer lower corners.
- Start in compact mode; detect actual edge attachment on every monitor and use a floating capsule away from the edge.
- Free cross-monitor dragging, geometry-based display selection, optional top-edge snapping, saved coordinates and nearest-display recovery after disconnects.
- Exercise both connected Windows displays in desktop smoke; test negative and vertical monitor coordinates.
- Avoid stealing keyboard focus during automated smoke and make `--quit` exit cleanly when the app is already closed.

## 0.1.0-alpha.2 — 2026-10-07

- Fix release merging: exclude builder diagnostic YAML from update metadata, validate manifest files and cover diagnostics/version mismatch with regression assertions.
- Explicit alpha update channel and package checksum filtering.
- Preserve the failed alpha.1 tag as build history; alpha.2 is the first published release.

## 0.1.0-alpha.1 — 2026-10-07

- Original OLED black island with compact and expanded views.
- Live adapter traffic, ping, rolling jitter and reply loss.
- Calibrated CPU-based power model with explicit estimate labeling; optional Shelly meter adapter.
- Daily measured/estimated energy, prospective tariffs and tracked-time coverage.
- Six widgets, ordering, language, display, login and reduced-motion settings.
- Atomic local store, rotating backups, corruption recovery, JSON restore and CSV.
- Versioned Windows/macOS packages, controlled update flow and GitHub quality/release workflows.
