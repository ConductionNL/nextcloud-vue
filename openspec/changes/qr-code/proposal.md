# Proposal: qr-code

## Why

Board LqLes draws "Zelf inchecken, op het bord": a QR code, a typed code that changes every 30 seconds and "verandert over 18 s". LqLlCertificaat
offers a certificate to a wallet as a QR code, and PtZaaktypeWeergave draws one too. The library has no QR code. portaliq `src/site/lib/qr.js`
has an encoder without dependencies, which a decoder test reads back. learniq `SelfCheckInPanel` shows only the typed code.

## What changes

- New `src/utils/qr.js`, the encoder from portaliq, exported as `encodeQr`.
- New `CnQrCode`: `value`, `code`, `label`, `size`, `refreshUrl`, `refreshSeconds`, `mapResponse`, a countdown, and a notice when a read fails.
- No new dependencies. Nothing leaves the page to draw a code.

Item 4 of the fleet component gap list (decisions 281, 320).
