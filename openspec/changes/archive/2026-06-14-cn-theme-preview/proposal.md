# CnThemePreview — live CSS theme preview with colour pickers

## Why

The opencatalogi triage flagged `ThemeDetailPageView` as a custom because no lib widget exposes a colour-picker bank with a live preview panel. Apps editing branding / colour schemes (opencatalogi themes, decidesk skin variants) re-build the same controls every time.

## What

`src/components/CnThemePreview/CnThemePreview.vue` (~300 LOC). A row of `<input type="color">` (+ hex text-input) controls declared via `pickers[]`, plus a preview panel that applies the picked colours as inline CSS variables. `@change` / `@input` emit the full colour map on every mutation. Optional Reset button (rendered when `defaults` is set). Default preview body shows a generic sample (header, button, list, link); apps replace it via the `#preview` slot.

## Non-goals

- Persistence (consumer-side — typically OpenRegister `appConfig` or a custom register).
- Global theme application (consumer-side — write a single `<style>:root { ... }</style>` at boot).
- Contrast / WCAG validation (future capability).
- Image / pattern picker.

## References

- [nextcloud-vue#290](https://github.com/ConductionNL/nextcloud-vue/issues/290).
- Fleet brand hex reference in memory.
