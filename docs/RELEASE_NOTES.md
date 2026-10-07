# Cortexia Island 0.1.0-alpha.5

An original OLED black island focused on PC electricity and estimated cost, with optional Shelly outlet readings, network health and six configurable widgets.

Alpha.5 centers compact content between symmetric end controls, refines numerical alignment and restrained material detail, and tests centering/no overflow. Includes the alpha.4 electricity-first source changes below.

Alpha.4 puts today's estimated cost first in compact and expanded views. Tracked kWh, instantaneous watts and the hourly estimate at current power complete the electricity story. Missing tariffs lead to a clear setup action; historical unpriced consumption stays unpriced. Network traffic becomes a secondary panel. Typography, spacing, material restraint and bundled Lucide icons refine the visual hierarchy. Smoke tests cover cost math on screen and the tariff setup journey.

First launch now asks for city/district and subscription/tier. The supported Turkish national single-rate residential tariff is read directly from EPDK's latest effective XLSX and applied with reviewed 2026 taxes. Price, source, effective date and check date are visible. Location stays local. Unsupported SKTT/special/commercial/time-of-use plans use the invoice price. Failed or malformed responses never replace a configured tariff. Tax rules expire after 2026 pending review; see TARIFFS.md.

Alpha.3 refines the compact view into a thin notch with concave top shoulders and stacked readings. Drag the grip/brand to any monitor; optional top-edge snapping works on each screen and switches back to a floating capsule away from the edge. Geometry tests cover negative/vertical monitor coordinates and removal; local Windows smoke exercises both connected displays. The app opens compact by default.

Includes local automatic backups, validated restore, CSV export, tray/shortcut controls, Turkish/English UI, reduced motion, strict TypeScript, tested energy math, desktop smoke tests and versioned Windows/macOS packages.

Includes edge attachment, header dragging, four-corner resizing, saved sizes, opacity, click-through recovery and taskbar/Dock icons. The alpha.1 publish run caught diagnostic YAML in update metadata; alpha.2 fixes and tests the release filter and explicitly selects the alpha channel.

**Measurement:** current network traffic is not a speed test. Default power is a model, not a wall reading. Consumption covers tracked time only. Enter your own electricity tariff; this is a PC cost estimate, not a household bill.

**Alpha limits:** packages are unsigned; signing/notarization is planned. macOS updater installation requires signed releases; use DMG packages for now. Shelly supports local, unauthenticated single-channel Gen2/Gen3 RPC. Real MacBook and notebook verification remains to be completed.

Windows: x64 `.exe`. macOS: arm64 for Apple Silicon; x64 for Intel. SHA256 manifests are provided. Use Ctrl/⌘+Shift+I to show/hide the island and Settings to configure your widgets.
