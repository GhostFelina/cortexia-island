# Cortexia Island 0.1.0-alpha.2

First alpha: an original OLED black island with network health, calibrated power estimates, optional Shelly outlet readings, daily energy/cost tracking and six configurable widgets.

Includes local automatic backups, validated restore, CSV export, tray/shortcut controls, Turkish/English UI, reduced motion, strict TypeScript, tested energy math, desktop smoke tests and versioned Windows/macOS packages.

Includes edge attachment, header dragging, four-corner resizing, saved sizes, opacity, click-through recovery and taskbar/Dock icons. The alpha.1 publish run caught diagnostic YAML in update metadata; alpha.2 fixes and tests the release filter and explicitly selects the alpha channel.

**Measurement:** current network traffic is not a speed test. Default power is a model, not a wall reading. Consumption covers tracked time only. Enter your own electricity tariff; this is a PC cost estimate, not a household bill.

**Alpha limits:** packages are unsigned; signing/notarization is planned. macOS updater installation requires signed releases; use DMG packages for now. Shelly supports local, unauthenticated single-channel Gen2/Gen3 RPC. Real MacBook and notebook verification remains to be completed.

Windows: x64 `.exe`. macOS: arm64 for Apple Silicon; x64 for Intel. SHA256 manifests are provided. Use Ctrl/⌘+Shift+I to show/hide the island and Settings to configure your widgets.
