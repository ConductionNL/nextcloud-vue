# Tasks: diagnostics-reports-name-their-app

- [ ] **T1**: `src/utils/diagnostics.js`: `bindDiagnosticsApp(pinia, appId)`, an `appId` on every report, `trackedFetch(url, init, source, scope)` reading the app from the store's pinia, `reportBindingProblems` and `reportDiagnosticOnce` per app. Test: `tests/utils/diagnostics.spec.js`.
- [ ] **T2**: `CnAppRoot` binds its pinia, provides `cnDiagnosticsAppId`, stamps `appId` in `cnDiagnostics`, and stamps `pageId` only on its own or unknown reports. Test: `tests/components/CnAppRootDiagnostics.spec.js`.
- [ ] **T3**: The store and its plugins pass themselves to `trackedFetch`; `CnPageRenderer`, `CnWidgetGrid`, `CnIndexPage` and `CnDetailPage` tag their reports with `cnDiagnosticsAppId`. Test: `tests/store/useObjectStoreDiagnostics.spec.js`, `tests/components/CnPageRendererDiagnostics.spec.js`.
