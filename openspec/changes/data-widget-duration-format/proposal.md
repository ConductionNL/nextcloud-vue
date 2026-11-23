# A term reads in words, with its extension

## Why
DqZaak "Termijn en betaling" draws "Wettelijke termijn: 4 weken, te verdagen met 2". Live drew the stored period, "P28D".

## What changes
- A field override (data widget) or facts entry with `format: 'duration'` reads a one-unit ISO period in words. A day count that is whole weeks reads as weeks: `P28D` is "4 weken".
- `extendBy` names the object's extension period. When the object holds one it follows as ", te verdagen met 2", with the unit said once when both periods share it.
- Built on `formatTermDuration` (also registered as the `termDuration` formatter). New l10n key "{term}, extendable by {extension}".
