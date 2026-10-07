# Adding a widget

The alpha has an allowlist of eight built-in widgets. Users can enable, disable and reorder them. It does not load arbitrary executable plugins. Electrical health requires actual compatible meter fields; energy insights state their projection assumptions. The Windows taskbar-area indicator selects one or two metrics from the same live snapshot, without renderer access to the OS shell.

1. Add the ID and snapshot contract to `shared/types.ts`.
2. Add the ID to `WIDGETS` in `main/core.ts`; retain backup compatibility and provide defaults for optional new fields.
3. Add a provider reading in `main/telemetry.ts`. Use a bounded interval and timeout, represent unavailable data with `null`, and state required OS permissions.
4. Register title, description and icon in `catalog` in `src/app.ts`, implement its card and `paint` update.
5. Add relevant provider/validation tests and a labeled demo fixture for visual verification. Include keyboard behavior and reduced motion.

Future registry-based providers will consolidate these steps once the next requested widgets are known. Do not grant renderer shell access to implement a widget. Widgets involving messages, microphones, location or accounts need an explicit user-driven permission flow.
