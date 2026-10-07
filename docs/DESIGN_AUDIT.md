# Electricity and cost design audit

2026-10-07 · Cortexia Island 0.1.0-alpha.4

## Evidence and scope

Reviewed the owner's Desktop/denetle.png and actual Electron captures of compact, expanded and missing-tariff views. The supplied screenshot contains personal desktop content and stays in ignored local artifacts. Public images use explicitly labeled demo fixtures, not the owner's telemetry. This is a visual hierarchy and task-flow audit, not a commercial readiness certification or a full accessibility audit.

## Findings and changes

1. **High — primary purpose missing.** The compact view emphasized network traffic and watts while cost was absent. Daily estimated cost now leads both views; tracked kWh and power remain visible. The expanded view adds hourly estimated cost at current power. Network is secondary.
2. **High — setup gap.** A missing tariff prevented useful cost interpretation. A visible “Elektrik tarifeni ekle” action now opens Settings and focuses the price field. No invented default price or retroactive billing is used.
3. **Medium — weak visual hierarchy.** Small competing labels, an oversized dark footprint and decorative glow weakened readability. Balanced value stacks, a 68 px compact window, subtle separators, quieter true-black surfaces and restrained champagne electricity accents establish a clearer reading order. Official Lucide icons replace custom icon paths.
4. **Medium — movement constraints.** Earlier refinement added free monitor dragging, per-view corner resizing and concave edge shoulders. Geometry chooses the actual display, including negative/vertical coordinates and removal recovery. These behaviors remain exercised with the redesign.

## Validation

- Alpha.5 centers compact metric content between symmetric controls and verifies the center and absence of overflow in native smoke.
- Thirteen unit tests cover energy math, online tariffs, history, settings, backup recovery, monitor geometry and release metadata.
- Native Electron smoke checks the visible daily/hourly demo cost, energy-first card order, missing-tariff focus and persisted price, plus hide/show, resizing, opacity recovery, widgets and both connected Windows monitors.
- Renderer captures were visually reviewed. Keyboard focus and reduced motion are exercised; broad screen-reader and contrast auditing remain before stable release.
- First-launch city/district setup and actual EPDK quote application were added after the owner's next request; actual online validation passed locally, with location-free requests.

## Product boundary

Default PC watts are an estimate from the configured CPU power profile; a compatible outlet meter is required for wall measurement. Costs cover tracked, priced samples only. These are useful PC cost estimates rather than household bills. Signed distribution, real MacBook/notebook checks and meter hardware validation remain stable-release requirements.

Alpha.6 removes subscription/tier/unit-price controls from tariff onboarding. The taskbar composition uses two small typographic stacks and a brand anchor. A droplet provides a quiet Mac compact control with elastic pull feedback. Electrical information remains optional to keep cost hierarchy clear. Native smoke verifies actual own-window interactions; real MacBook ergonomics and broader taskbar/DPI layouts remain to be checked.
