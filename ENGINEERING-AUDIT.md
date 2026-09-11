# Engineering Audit

## 1. Issues inspected

Inspected the repository source files, `manifest.json`, README, vendored Chart.js dependency, and recent Git history. No package manifest, automated tests, or project-specific validation scripts were present.

The main implementation areas reviewed were background tracking (`background.js`), popup behavior (`popup.js`), dashboard rendering/reset behavior (`dashboard.js`), extension configuration (`manifest.json`), and documentation.

## 2. Issues identified

- `background.js` depends on an in-memory `setInterval` for tracking. Manifest V3 background service workers can be suspended, making interval-based state unreliable.
- The active tracking state is kept only in memory, so a service-worker restart can lose the current session.
- Navigation within the same tab is not explicitly handled, so changing domains without activating another tab can attribute elapsed time incorrectly.
- `dashboard.js` registers duplicate storage-change listeners.
- `dashboard.js` creates charts without retaining/destroying the previous Chart instance.
- `dashboard.js` contains an incomplete `updateChart()` implementation, so later storage changes do not properly refresh the displayed chart/list.
- The dashboard reset handler calls `loadTimeData()`, which is not defined in `dashboard.js`.
- `background.js` contains obsolete commented code and an unused `saveTimeData()` function.
- No automated tests or validation scripts were found.

## 3. Issues selected for implementation and why

The selected changes focus on correctness and reliability without changing the user-facing purpose of TabWatch:

1. Replace fragile interval-only tracking with persisted active-session state and event-based elapsed-time accounting. This addresses Manifest V3 service-worker suspension and allows tracking to recover after a worker restart.
2. Handle tab navigation so domain changes are accounted for correctly.
3. Simplify and repair dashboard rendering so one chart instance is updated instead of creating duplicate charts/listeners.
4. Fix dashboard reset behavior by rendering from storage directly.
5. Remove dead background code to reduce maintenance risk.

No new testing framework was introduced because the repository contains no existing test infrastructure or package manifest.

## 4. Files changed

- `background.js`
- `dashboard.js`
- `ENGINEERING-AUDIT.md`

## 5. What was changed

`background.js` now persists the active tracking session in `chrome.storage.local`, calculates elapsed time from timestamps instead of depending on a continuously running service-worker interval, responds to tab activation/window focus/navigation events, and safely ignores unsupported extension/browser URLs.

`dashboard.js` now maintains a single chart instance, uses one storage-change listener, renders the current data consistently, and resets the stored data without calling an undefined function. Dead update/reload behavior was removed.

## 6. Verification performed and its results

The repository was inspected against its existing source/configuration and Git history. No automated test or package-script validation infrastructure exists in the repository.

Verification performed:

- Confirmed the changed JavaScript remains internally consistent with the existing Manifest V3 APIs and DOM IDs.
- Confirmed the existing `timeData` storage shape is preserved so popup behavior remains compatible.
- Confirmed the manifest remains the source of the existing background service-worker and dashboard assets.
- Reviewed the changes against the existing implementation to ensure the core tracking, popup, dashboard, and reset functionality remains represented.

A live Chrome-extension run was not available through the repository tooling, so browser-level behavior could not be executed here.

## 7. Remaining concerns or uncertainties

The repository has no automated tests, so browser-level regressions cannot be detected automatically. Manual testing in Chrome should cover tab switching, navigation between domains in the same tab, switching browser windows, leaving browser focus, reopening the extension after inactivity, dashboard updates, and reset behavior.

The extension also requests `<all_urls>` host access. This was not removed because changing permissions could alter existing behavior and the repository does not document a narrower intended scope.
