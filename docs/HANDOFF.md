# Current handoff

Version: 0.1.0-alpha.7. Branch: main. Read REQUESTS.md, README and TARIFFS.md before continuing.

Alpha.6 implements city/district-only automatic EPDK setup, a selectable Windows live taskbar-area overlay, Mac default elastic droplet, meter-only electrical metadata and energy insights. Eight widget choices; energy/cost remain first. The weather button is not replaced. Mac behavior is implemented and forced-mode Windows interaction tested; real MacBook and notebook checks remain pending.

Local checks: 16 unit tests, strict type/build, audit 0, Windows native smoke on two displays, taskbar state/select/hide/open, droplet size/stretch/pull-open, electrical missing/meter warning, centered compact readings, location-only setup and actual online tariff application. Demo screenshots only are tracked; denetle and real telemetry stay in ignored .artifacts.

Alpha.6 release and quality checks passed, but installed startup verification found a missing out/shared/locations.js module. Alpha.7 includes shared runtime files and gates all releases on actual packaged-app smoke (local Windows package passes). Alpha.7 publication passed for Windows/macOS including packaged-app smoke. Published Windows installer SHA256 verified; installed version alpha.7 with exact full-profile preservation. Installed smoke, actual EPDK query and GitHub update feed (current alpha.7) passed. The actual installed app is running with live data. Continue queued requests 4–7: live Codex/Claude limits, restrained electricity animation, usage modes, boot-session energy, context menus and professional settings. Do not repeat completed foundations or publish the obsolete untagged alpha.4 changes separately.

Known limits: unsigned alpha; signed Mac updates pending; CPU-based power estimate isn't wall power; local unauthenticated single-channel Shelly only; no closed-app energy backfill; auto-hidden/non-bottom taskbar overlay unsupported; actual household tariff cannot be derived from city/district. Automatic standard residential lower-tier taxes reviewed only for 2026. Meter grid/PSU safety diagnosis is not offered.
