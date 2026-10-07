# Owner requests and continuation queue

Recorded 2026-10-07. Project: **Cortexia Island**. First target: the owner's Windows desktop; later Windows notebook and MacBook.

## Implemented in the first alpha

- Understand the supplied X reference as a concept; use an original design rather than copy its appearance.
- True black island with subtle texture and lighting; attached to the upper usable screen edge by default.
- Live download/upload traffic, ping, jitter and reply loss.
- Explicit PC power estimate; optional local Shelly outlet measurement. Daily energy and estimated cost from an owner-entered tariff.
- A list to enable, disable and reorder widgets. Network, power, energy, CPU/RAM, battery and clock are included.
- Header dragging, four mouse corner handles, saved positions and separate sizes for compact/expanded/settings views.
- Full hide/show, opacity, click-through and recovery via tray or Ctrl/Command+Shift+I.
- Application icon in the Windows taskbar/Mac Dock and a tray/menu-bar icon.
- Cortexia name, original browser-generated application icon and campaign artwork, integrated into packaging, UI and README.
- Public GitHub repository, contribution/issue templates, roadmap, dependency maintenance, quality CI and versioned releases.
- Local backups/recovery/export, tests, manual update check/download/install and cross-platform package workflows.
- Windows `.exe`; Apple Silicon and Intel Mac `.dmg` plus update `.zip` files.
- Progress and actual local application previews shown to the owner.
- Alpha.4: first-launch city/district and subscription/tier setup, direct EPDK online tariff lookup/application, source/date display and manual fallback for unsupported plans.

## Next iteration, explicitly queued by the owner

Follow-up implemented in alpha.3: thinner compact notch, concave shoulder transitions and free cross-monitor positioning. Alpha.4 audits the owner's private denetle.png and redesigns both views around electricity and cost. Both connected Windows displays are covered by local smoke. The original screenshot remains local because it includes desktop content.

1. Continue visual refinement based on the owner's next feedback; the cost-first typography, spacing, compact stacks and restrained surfaces are implemented in alpha.4.
2. Add the owner's next widget list when supplied. Do not assume a final list or execute arbitrary third-party code from a widget selector.
3. Install and validate on the real MacBook and Windows notebook when available.

## External work before stable

Obtain signing/notarization credentials, exercise signed upgrades and validate an actual power meter. The first alpha remains unsigned and labels modeled power as an estimate. The browser's image tool did not expose a verifiable model version; see BRAND.md for provenance.
