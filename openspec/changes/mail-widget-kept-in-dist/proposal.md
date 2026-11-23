# Proposal: mail-widget-kept-in-dist

## Why

DqZaakEmail draws "Mail opstellen", "Mail koppelen" and the "E-mailsjabloon" row. On the live case page the Email tab
showed only the linked mail card: the `mail` widget rendered nothing. Its registration lived in CnMailTab/index.js, a
module the package's `sideEffects` allowlist does not keep, so the build dropped the registrar's bare import of it and
the published dist never registered the `mail` type.

## What changes

The registration moves to CnMailTab/dashboardRegistration.js, a name the allowlist keeps, and the registrar imports
that file. A packaging test asserts every module that registers a dashboard widget type is kept by `sideEffects`.
