# Owner requests and continuation queue

Recorded 2026-10-07. Project: **Cortexia Island**. First target: the owner's Windows desktop; later Windows notebook and MacBook.

## Implemented in the first alpha

- Understand the supplied X reference as a concept; use an original design rather than copy its appearance.
- True black island with subtle texture and lighting; attached to the upper usable screen edge by default.
- Live download/upload traffic, ping, jitter and reply loss.
- Explicit PC power estimate; optional local Shelly outlet measurement. Daily energy and estimated cost; alpha.6 retrieves a standard residential tariff automatically from city/district-only setup.
- A list to enable, disable and reorder widgets. Network, power, energy, CPU/RAM, battery and clock are included.
- Header dragging, four mouse corner handles, saved positions and separate sizes for compact/expanded/settings views.
- Full hide/show, opacity, click-through and recovery via tray or Ctrl/Command+Shift+I.
- Application icon in the Windows taskbar/Mac Dock and a tray/menu-bar icon.
- Cortexia name, original browser-generated application icon and campaign artwork, integrated into packaging, UI and README.
- Public GitHub repository, contribution/issue templates, roadmap, dependency maintenance, quality CI and versioned releases.
- Local backups/recovery/export, tests, manual update check/download/install and cross-platform package workflows.
- Windows `.exe`; Apple Silicon and Intel Mac `.dmg` plus update `.zip` files.
- Progress and actual local application previews shown to the owner.
- Alpha.4–6: direct EPDK online tariff lookup/application and source/date display. Alpha.6 asks only city/district and labels the automatic national lower-tier rate as a standard-tariff estimate.
- Alpha.6: Windows independent live taskbar-area indicator with user-selected metrics; native weather replacement is not claimed.
- Alpha.6: Mac default droplet with click-open and elastic pull-open; Windows can select it for preview. Real MacBook validation remains pending.
- Alpha.6: electrical health reports from compatible meters and transparent energy insights; no simulated safety diagnosis.

## Next iteration, explicitly queued by the owner

Follow-up implemented in alpha.3: thinner compact notch, concave shoulder transitions and free cross-monitor positioning. Alpha.4 audits the owner's private denetle.png and redesigns both views around electricity and cost. Both connected Windows displays are covered by local smoke. The original screenshot remains local because it includes desktop content.

1. Continue visual refinement based on the owner's next feedback; the cost-first typography, spacing, compact stacks and restrained surfaces are implemented in alpha.4.
2. Add the owner's next widget list when supplied. Do not assume a final list or execute arbitrary third-party code from a widget selector.
3. Install and validate on the real MacBook and Windows notebook when available.
4. Owner's next request, after completing the current release/install: live Codex and Claude 5-hour and weekly usage-limit bars. Investigate supported authenticated data sources, refresh cadence and missing/expired authorization handling. Do not invent percentages or reuse private credentials outside their intended app.
5. Add a very restrained minimalist electricity animation specifically between the energy-cost and live-power cards: a thin light trace and tiny glint, slow and aesthetic. Keep text readable and support reduced motion. Queued after the current release/install alongside the live usage bars.
6. Ask the user in the app how to use Cortexia: Windows bar only, dynamic island, or normal application window. Persist and expose the mode in Settings. Bar-only hides the other surfaces and keeps a clear route to settings; improve coherent visibility/startup/recovery transitions. Implement after the current release/install.

## External work before stable

Obtain signing/notarization credentials, exercise signed upgrades and validate an actual power meter. The first alpha remains unsigned and labels modeled power as an estimate. The browser's image tool did not expose a verifiable model version; see BRAND.md for provenance.
