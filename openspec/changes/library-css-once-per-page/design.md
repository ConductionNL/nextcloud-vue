# Design: library-css-once-per-page

## Where the copies came from (measured on :8080, 13 Oct)

- `dist/esm/index.js` began with `import './nextcloud-vue.css'`; every bundle that imports from the barrel injected the
  whole stylesheet when it ran (webpack's `sideEffects: true` on the dist).
- NC dashboard widgets (`IWidget::load()`) of dossiq, pipelinq, opencatalogi, zaakafhandelapp, stackiq, petstore and
  filinq load on `/apps/dashboard` and on every launchpad page, each with its app's `*-shared-nc-vue.js`.
- Every-page scripts: openregister (`integration-global` + its vendor chunk), hermiq (fixed in hermiq#1158).
- Installed library versions of those builds: 2.25.1 to 2.81.0.

## Scope ids

`rollup-plugin-vue` hashes the scope id from the file path, plus the source in production mode
(`hash(isProduction ? path + '\n' + source : path)`, sfc.js). The build sets `BUILD=production`, which that plugin
reads, so a changed component gets a new id and an unchanged one keeps its id (and identical rules). This affects the
published dist only: jest and the e2e harness compile from `src` with their own ids.

## One stylesheet per page

`installLibraryStyle(css, built)` (src/utils/libraryStyle.js) keeps one `<style data-cn-library="<build time>">`,
appended to the head as style-loader appended each copy. A later call with a newer build time replaces its text; an
older or equal one is ignored. The order is the build time: the release writes the version into package.json AFTER
`npm run build`, so the version is not known when the stylesheet is made.

The build emits `dist/esm/library-style.js` (the serialised installer + the stylesheet as a string) and the ESM entry
banner imports it instead of the CSS file. `dist/esm/nextcloud-vue.css` and `dist/nextcloud-vue.css` are still
emitted. The CJS build is unchanged.

## Not covered

An app that imports `css/index.css` itself gets that copy too, of its own version, on its own pages; a later per-app
cleanup can drop the import. Newest-wins can give an older app's page newer global rules; those are additive and opt-in
(the board look), so this is accepted.
