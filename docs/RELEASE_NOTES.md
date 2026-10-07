# Cortexia Island 0.1.0-alpha.7

Alpha.7 fixes a packaging omission found during installed alpha.6 verification: the online tariff provider's shared city-list runtime module is included. Actual packaged-app smoke now gates publication for every architecture. Alpha.5/6 packages should be upgraded; settings and history are retained. Alpha.6 functionality follows below.

Electricity-first OLED black island with centered compact readings and eight selectable widgets.

- **Location-only setup:** enter just a Turkish city and district. EPDK supplies the current standard residential lower-tier tariff with reviewed 2026 taxes. No unit price, subscription or tier input. Source and dates stay visible; location stays local. This is a standard-tariff estimate, not the verified household contract or invoice.
- **Windows live taskbar indicator:** an independent lower-left overlay displays one or two chosen metrics: estimated cost, tracked kWh, watts, download, upload or ping. Click to open; disable in Settings. This does not replace Microsoft's weather button. Auto-hidden or non-bottom taskbars do not show it.
- **Mac droplet:** compact mode defaults to a droplet on macOS, with click-open, elastic pull-open and a native drag grip. Reduced motion supported. Forced droplet interaction was tested on Windows; real MacBook validation remains pending.
- **Electrical health:** compatible Shelly meter voltage, current, frequency, meter temperature, power factor and protection reports. Unsupported fields remain blank; no grid or PSU safety diagnosis.
- **Energy insights:** tracked average power and explicitly constant-power 100-hour projections, plus understandable energy facts.

Retains free movement across monitors, edge attachment, corner resizing of metric/detail views, hide/opacity/click-through, tray/Dock icons, 14 local backups, validated restore, CSV export, explicit updates and Turkish/English UI.

Verified locally: strict type/build checks, 16 unit tests, two-display Windows native smoke, taskbar selection/hide/open, droplet stretch/release, missing/meter electrical presentation, location-only setup and actual online EPDK application. GitHub runs quality and packaging for Windows x64 and both Mac architectures.

**Measurement:** power defaults to a model, not a wall reading. Only running/tracked time is accumulated. Network traffic is not a speed test. Cost is a PC standard-tariff estimate, not a household bill.

**Alpha limits:** unsigned packages, Apple notarization and signed updates pending. Shelly supports local unauthenticated single-channel RPC; real meter/MacBook/notebook validation remains pending. Tax rules expire after 2026 until reviewed.

Windows x64 `.exe`; Apple Silicon arm64 and Intel x64 `.dmg`/`.zip`; SHA256 manifests included.
