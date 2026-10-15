# Proposal: dates-in-the-users-locale

## Summary

Every date and number the library formats reads in the locale the user chose in Nextcloud, not the browser's.

## Why

Zuiddrecht rehearsal R2 (15 October 2026): on an nl_NL instance opened in an English browser, the case page showed "10/15/2026" (data widget) and "November 12, 2026" (countdown tile). `toLocaleDateString(undefined)` and its siblings answer in the browser's locale, and 73 call sites in the library passed `undefined` or nothing.

## What changes

- `src/utils/userLocale.js`: `userLocale()` answers Nextcloud's canonical locale (`nl-NL`), or undefined when there is none or Intl rejects it.
- Every `toLocaleDateString`, `toLocaleTimeString` and `toLocaleString` call that passed `undefined` or no locale passes `userLocale()`.
