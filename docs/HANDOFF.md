# Current handoff

Version: 0.1.0-alpha.5. Branch: main. All owner requests and the continuation queue are recorded in REQUESTS.md.

The initial desktop foundation is implemented. Read README, ROADMAP, ARCHITECTURE and RELEASING before continuing. The owner will supply the next widget ideas. Keep the reference concept as inspiration; design remains original.

Windows desktop is the first target. Alpha.2 and alpha.3 published successfully for Windows x64, Mac arm64 and Mac x64. Alpha.4 audits the owner's denetle.png and puts electricity/cost first in both views; the private screenshot and real telemetry remain ignored. First-launch city/district and subscription/tier setup reads the official EPDK XLSX and applies a supported residential rate with reviewed 2026 taxes. Local type/build checks, 13 unit tests and smoke pass; smoke exercises both connected Windows displays. Actual online tariff retrieval/application passed locally. Complete alpha.4 release, installed update-feed verification and final live preview before ending setup. MacBook and Windows notebook real-device checks are deferred until those devices are available. Meter readings require hardware; no meter is assumed present. Read TARIFFS.md and DESIGN_AUDIT.md for scope.

Known limitations: unsigned alpha packages; Mac signed update installation pending signing; estimated power uses CPU profile only; Shelly unauthenticated single channel only; no executable extension loading; no closed-app energy backfill. Currency becomes fixed once priced energy history exists. New widget registry consolidation is planned after requested widgets are known.
