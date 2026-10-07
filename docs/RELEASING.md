# Releases and rollback

Use SemVer. Alpha tags end in `-alpha.N`. `package.json`, `package-lock.json`, `VERSION` and the Git tag must agree. CI rejects a mismatched tag.

```sh
npm run check
npm run smoke
npm audit --audit-level=moderate
npm version 0.1.0-alpha.2 --no-git-tag-version
# Update CHANGELOG and RELEASE_NOTES, review source and commit.
git tag v0.1.0-alpha.2
git push origin main --tags
```

The release matrix builds Windows x64, macOS arm64 and macOS x64 on their own OS runners. Only when every matrix build passes does the publish job create a GitHub prerelease. Packages have versions and architectures in filenames. SHA256 manifests accompany them.

Each architecture uploads a separate artifact folder. The publish job merges matching macOS channel manifests into one file with both architectures, so the updater can choose the correct ZIP without overwriting metadata. It checks matching versions and the presence of both architectures before publishing. Unsigned macOS update installation is not supported in the alpha; use release packages.

Windows signing and macOS signing/notarization require owner-supplied credentials stored in GitHub Actions secrets, never in the repo. Current alpha CI intentionally creates unsigned artifacts. Stable releases must add signing, notarization and a signed upgrade test before claiming trusted automatic installation. Release checksums provide integrity checking, not publisher identity.

Updates are requested from Settings; download and install are separate user actions. Data is saved before restarting. Never downgrade a profile to a build that cannot read its schema. Before rollback, export JSON; install the prior compatible version from Releases and restore a compatible backup if needed.

Change `releaseType`/prerelease policy and the release workflow together when moving to stable. Keep prerelease and stable distribution channels deliberate.
