# Contributing

Start with a small issue describing the problem, OS and expected behavior. For new widgets, describe the source of data and required permissions. Avoid uploading personal telemetry or device addresses.

Use Node 24 and `npm ci`. Run `npm run check` and `npm run smoke` before a PR. Add meaningful tests for energy calculations, validation, data migrations and failure behavior. For UI changes attach screenshots using labeled fixtures.

Keep estimates clearly labeled, missing values explicit and permissions user driven. Preserve backup compatibility. Changes should run on Windows and macOS or state their platform scope. Local device data, credentials and build artifacts do not belong in Git.

Small focused PRs with a clear before/after description are welcome. This project follows the MIT license.
