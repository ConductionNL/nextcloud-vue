## 1. Widget

- [x] 1.1 `expected`, `pendingNote`, `legalHold`, `transfer` in CnRetentionWidget (tests: tests/components/CnRetentionWidget.spec.js, 3 red before)
- [x] 1.2 Docs in docs/components/cn-retention-widget.md
- [ ] 1.3 dossiq configures the case Archiving card (DqZaakArchivering)
- [x] 1.4 `expected.selectionListLookup` reads a selection list URL as words through `referenceLabel` (cached per URL, URL tail as fallback); rows that differ read "Depends on the result" (tests: tests/utils/referenceLabel.spec.js, CnRetentionWidget.spec.js)
