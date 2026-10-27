# Android release automation

How the JulineMart Android release bundle (AAB) is built, signed and versioned, and how CI is set up. Phase 1 builds a CI artifact only; nothing is uploaded to Google Play automatically.

## Manual releases (unchanged)

1. Bump `defaultVersionCode` and `defaultVersionName` at the top of `android/app/build.gradle`.
2. `npm run cap:sync`, then Android Studio → Build → Generate Signed Bundle/APK with the existing keystore (alias `julinemart`).
3. Upload `android/app/release/app-release.aab` in Play Console.

With no `JULINEMART_*` environment variables set, `build.gradle` behaves exactly as before: the release build is unsigned until the wizard signs it.

## Build overrides (CI)

| Variable | Purpose |
|---|---|
| `JULINEMART_VERSION_CODE` | versionCode. A whole number from the checked-in default up to 2100000000. Also accepted as `-PJULINEMART_VERSION_CODE=`. |
| `JULINEMART_VERSION_NAME` | versionName, e.g. `1.2`. Also accepted as `-PJULINEMART_VERSION_NAME=`. |
| `JULINEMART_KEYSTORE_FILE` | Path to the upload keystore. |
| `JULINEMART_KEYSTORE_PASSWORD`, `JULINEMART_KEY_ALIAS`, `JULINEMART_KEY_PASSWORD` | Signing credentials. Environment only, never `-P`, files or source. |
| `JULINEMART_EXPECTED_FIREBASE_PROJECT` | Optional. `validateGoogleServicesJson` fails if `google-services.json` is for another project. |

Set all four signing variables or none; a partial set fails the build. `./gradlew :app:validateGoogleServicesJson` checks that `google-services.json` exists, parses, and has an Android client for `com.julinemart.app`. Without that file, the build quietly drops push notifications.

The versionCode is always typed in by hand. Play rejects any code that isn't higher than every code already uploaded to any track, so check Play Console → App bundle explorer first. Don't use the GitHub run number: it restarts if the workflow is renamed and knows nothing about manual uploads.

## Web assets

`capacitor.config.ts` sets `server.url` to `https://julinemart.com`, so the WebView loads the live site and the bundled `out/` directory is never shown. `next build` does not write to `out/` (no static export). The published v1.1 bundle contained no `index.html` at all. CI recreates the 41-byte `out/index.html` used for local builds (hash-checked) so that `npx cap sync android` runs exactly as it does locally.

## Workflow: `.github/workflows/android-release-build.yml`

Manual trigger only (Actions → "Android release build (artifact only)" → Run workflow), with inputs `version_code`, `version_name` and `signing` (`signed` or `unsigned`). Its job uses the `android-release` GitHub environment; GitHub creates it on the first run if it doesn't exist.

GitHub only offers "Run workflow" for manually triggered workflows that exist on the default branch (`stable-production`). The file must be merged there before the first run. Once it is, you can run it against another branch with the branch picker or `gh workflow run android-release-build.yml --ref <branch>`. If the `android-release` environment later gets a deployment-branch rule, it must allow the branch you run from.

Secrets, preferably stored in the `android-release` environment:

| Secret | How to produce it (on your machine) |
|---|---|
| `GOOGLE_SERVICES_JSON_BASE64` | `[Convert]::ToBase64String([IO.File]::ReadAllBytes('android\app\google-services.json'))` |
| `ANDROID_KEYSTORE_BASE64` | The same command, run on the existing keystore file. Never generate a new key. |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | From your password manager. |

A signed run fails unless the bundle's certificate SHA-256 matches the published v1.1 upload certificate (`5E:76:81:3F:…:FA:D7:FB:0D`). The AAB is kept as a workflow artifact for 14 days.

## Phase 2: manually triggered closed-testing deploy

Start only after these Play Console checks:

1. App integrity: Play App Signing is on, and the **upload key** SHA-256 equals `EXPECTED_UPLOAD_CERT_SHA256` in the workflow.
2. App bundle explorer: note the highest versionCode on any track.
3. Testing → Closed testing: note the exact track ID (`alpha` for the default closed track, or the custom track's name).
4. Google Cloud: enable the Google Play Android Developer API and create a service account. In Play Console → Users and permissions, invite it for this app only, with permission to release to **testing tracks only**, not production.
5. Do one signed artifact-only run, download the AAB, and upload it by hand to the closed track. This proves the CI-signed bundle is accepted.

Then change the workflow:

- Add a `deploy_closed_testing` boolean input (default `false`), or a separate `workflow_dispatch` workflow that downloads the artifact from a chosen run.
- Add a `deploy` job with `needs: build`, `if: inputs.deploy_closed_testing && inputs.signing == 'signed'`, and its own `environment: play-closed-testing` holding the `PLAY_SERVICE_ACCOUNT_JSON` secret, with required reviewers if your GitHub plan supports them.
- In that job, download the artifact and upload it with `r0adkll/upload-google-play` (pinned to a commit SHA). Use `packageName: com.julinemart.app`, `track: <closed track ID>`, `status: draft` at first, then `completed` once trusted.

## Production approval

- The CI service account can't release to production (step 4 above). That's the hard guarantee.
- Promote a tested closed-testing release by hand in Play Console (Release → Promote). Turn on Managed publishing for an extra explicit publish step.
- If production promotion is ever automated, give it a separate workflow and a `play-production` environment with required reviewers and a `stable-production`-only branch rule. Use a separate service account whose key lives only in that environment. Promote the already-tested versionCode (for example `fastlane supply --track <closed> --track_promote_to production`) rather than re-uploading.
