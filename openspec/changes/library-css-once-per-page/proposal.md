---
kind: code
---

# Proposal: library-css-once-per-page

## Summary

A Nextcloud page often runs several apps' builds of this library at once. The NC dashboard and every launchpad page load
each app's dashboard widgets; OpenRegister and hermiq load scripts on every page. Each of those bundles that imports
the library barrel injects the WHOLE library stylesheet: `dist/esm/index.js` starts with `import './nextcloud-vue.css'`.
Measured on :8080: up to 8 apps' copies on one page, at library versions from 2.25 to 2.81. Two things then go wrong:

- Scoped component rules collide across versions. The scope id is a hash of the file path only (outside a production
  build), so `.cn-object-list-widget__add[data-v-da58f8e2]` is the same selector in 2.57.3 and 2.81.0. The older copy
  overrides the newer one wherever it comes later or carries `!important` (pipelinq's lead page kept a 16px footer
  bleed over #1529's 12px).
- Global rules (the board look, utilities) from an old copy override the page's own.

## Scope

1. Scope ids hash the component's path AND source (`rollup-plugin-vue` production ids), so two versions of a changed
   component never share a selector; an unchanged component keeps its id and identical rules.
2. The ESM entry injects the stylesheet through a library-owned module: one `<style data-cn-library>` per page, the
   NEWEST library version wins (an older copy is replaced, a newer one is kept).
3. `dist/nextcloud-vue.css` and `dist/esm/nextcloud-vue.css` stay published for apps that import the file directly.

No change is required in the apps. An app's own `import '@conduction/nextcloud-vue/css/index.css'` becomes redundant on
its own pages and can be dropped later.
