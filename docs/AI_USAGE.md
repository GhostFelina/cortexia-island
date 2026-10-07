# AI usage: setup and scope

## Codex

Install the [official Codex CLI](https://developers.openai.com/codex/cli/) and sign in with your own ChatGPT account. Cortexia uses its installed native executable and existing sign-in through the [documented app-server](https://learn.chatgpt.com/docs/app-server), not by reading authentication files. It initializes a read-only client, calls account/rateLimits/read every 60 seconds and accepts rateLimits/updated notifications. It creates no conversation and consumes no model-generation tokens. It displays actual 5-hour and weekly windows only when those durations are reported. API-key/unsupported plans may not provide these windows.

CLI must be discoverable on PATH, in standard Homebrew/local bin locations on Mac, or the normal global npm native vendor directory on Windows. A signed release launched from Finder may have a different PATH than the terminal. Missing CLI/sign-in/data shows No data; sign in using Codex itself. Cortexia never accepts account passwords.

## Claude Code and Claude web/desktop

Use **Settings → Widgets → Connect Claude Code**, in the installed app. This configures the [official status-line extension](https://code.claude.com/docs/en/statusline). Existing user status-line settings are backed up locally and preserved by chaining; Disconnect restores them if they have not subsequently changed. Current documented usage fields require a supported subscribed plan/gateway, a current Claude Code version, and usually an API response before limits are available. Use a current official Claude Code version.

The bridge accepts five_hour.used_percentage/resets_at and seven_day.used_percentage/resets_at. It runs on Claude Code events and a 15-second status-line refresh timer; Cortexia reads the local report at its sampling cadence. This timer can replay the latest CLI state: it does **not** independently query Claude's backend or prove web usage freshness. Running signed-in Claude Code is required for these reports. Web/desktop account use is reflected only when Claude Code reports it. Web-only users can open the official usage page from the card; automatic independent web polling is not implemented.

No third-party Claude OAuth/session collection, browser scraping or custom account login is used. [Anthropic's authentication restrictions](https://code.claude.com/docs/en/legal-and-compliance) are respected. The local helper stores only usage windows and receivedAt. No conversation text, workspace paths or credentials from status-line JSON are copied into the cache. Existing CLI settings backups may contain personal configuration; they are private and must not be published.

## State and tests

Bars show **used** percentage, not remaining. Actual reset times are shown in local time. Missing windows use a dash, unsupported plans remain unavailable, reports older than two minutes are marked stale, expired windows are dropped pending a new report. Claude's source label remains Claude Code; it is not labeled an independently verified live web account. Bar-only surfaces mark missing/stale quota data with a gray dot and explanatory tooltip.

Pure tests cover duration/percentage/expiry/freshness and bridge sanitization/preservation/restoration. Labeled UI fixtures test four windows plus missing/stale data; they are separate from real account tests. The real Codex provider was exercised on the owner's Windows account. No real Claude backend percentage verification is claimed until the CLI emits it. No fake request is sent to Claude to spend a user's quota just to initialize the widget.

The default bar rotates every ten seconds: PC-session cost/kWh, Codex 5-hour/weekly, Claude 5-hour/weekly. Windows hover pauses the elapsed clock and leaving resumes it. This is a presentation interval, not a ten-second backend polling promise. General settings can disable rotation and retain fixed metric choices.
