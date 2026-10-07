# Cortexia Island 0.1.0-alpha.8

Electricity remains the focus: **used electricity and estimated cost for this PC session**, plus today's total, live power and a quiet miniature electricity animation.

- PC-session kWh/cost survive app restart in the same login/boot. Login startup enabled once on migration and configurable; closing the window keeps tracking in tray. Sleep, pre-login, closed-app and missing-reading gaps are excluded.
- First setup asks for island, bar-only, normal application or island + bar. Five clear Settings sections, right-click app menus, native app frame/minimize/resize and visibility recovery.
- Ten selectable widgets: new official Codex 5-hour/weekly usage and reversible Claude Code status-line connection. Actual percentages/reset times, missing/stale states and source labels. Codex refreshes at 60 seconds/notifications. Claude requires running signed-in Claude Code; its status-line timer is not an independent web backend poll. Web/desktop usage appears only when the CLI reports it. See AI_USAGE.md.
- Default 10-second bar cycle: PC electricity cost/kWh → Codex 5-hour/week → Claude 5-hour/week. Windows hover pauses/resumes; General settings can return to fixed choices. Rotation does not change backend refresh intervals.
- Windows/Mac bar selection includes session energy/cost and AI usage. Windows is an independent overlay, not a weather-button replacement; auto-hidden/non-bottom taskbars are unsupported.
- Retains city/district-only automatic EPDK standard national residential lower-tier setup, backups/restore/CSV, update checks, cross-monitor drag/corner resize, centered compact view, droplet and reduced motion.

Checks: 20 unit tests, strict types/build, dependency audit, native island smoke with both connected Windows displays, new quota/mode/menu/session states, and native app-frame smoke. Actual packaged executables in both modes gate Windows x64 and Mac arm64/x64 publication.

Power defaults to a CPU model, not wall measurement; cost is a standard-tariff PC estimate, not the household invoice. Only tracked active time is accumulated. Real meter/MacBook/notebook validation and signing/notarization remain pending. Tax review expires after 2026.

Windows x64 `.exe`; Apple Silicon and Intel `.dmg`/`.zip`; versioned update manifests and SHA256 checksums. Data and existing tariff/history are retained on upgrade.
The taskbar cost/kWh pair also includes the restrained electricity glint. Live updates preserve the indicator DOM so the animation continues smoothly; reduced-motion disables it.
