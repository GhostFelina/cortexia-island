# Changelog

## 0.1.0-alpha.5 — 2026-10-07

- Center compact metric content between symmetric brand/expand controls at every window width.
- Refine compact spacing, value alignment, champagne separators and subtle upper light reflection; assert centering and no overflow in native smoke.
- Persist manual location/subscription selections and clear online provenance when the selected tariff tier or subscription changes.
- Include the electricity-first redesign and direct EPDK setup introduced in the alpha.4 source revision. Alpha.4 was not tagged remotely; alpha.5 is the packaged follow-up.

## 0.1.0-alpha.4 — 2026-10-07

- Make electricity and cost the primary theme: prominent daily estimated cost, tracked kWh, current-power hourly estimate and secondary network readings.
- Replace the compact network-first HUD with balanced cost/power stacks, 440 px default width, clearer units and restrained champagne accents.
- Add a visible no-tariff action that opens Settings and focuses the electricity price; preserve unpriced history.
- Add first-launch city/district and subscription setup; retrieve supported national residential tariff XLSX directly from EPDK and apply verified tax-inclusive prices with dates. Unsupported tariffs remain manual; location is never transmitted.
- Use bundled official Lucide icons with third-party license notices.
- Extend desktop smoke with energy-first hierarchy, daily/hourly cost, empty tariff and tariff setup persistence assertions.
- Preserve customized widget ordering while migrating the untouched old default to energy/power/network.

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
