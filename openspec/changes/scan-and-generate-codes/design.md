# Design: scan-and-generate-codes

Read at nextcloud-vue development `3e606bf10`, buildiq's
`pages-qr-and-barcodes` change on buildiq development, and the npm
registry entries for `@zxing/library` 0.23.0, `@zxing/browser` 0.2.1,
`jsbarcode` 3.12.3, `qrcode` 1.5.4 and `barcode-detector` 3.2.2.

## What is there

- No scanner, decoder or code drawing exists in `src/`. `package.json`
  lists no such library under `dependencies` (`:129-166`) or
  `peerDependencies` (`:220`).
- `cnRenderFormField` knows seven types (`src/composables/cnFormFieldRenderer.js:127`).
- A self-fetch `CnIndexPage` drives its list through `useSelfFetchList`
  (`src/components/CnIndexPage/CnIndexPage.vue:2568`). The list narrows
  by a property with `onFilterChange(key, values)`
  (`src/composables/useListView.js:226-235`). A row click opens the
  record through `onRowClick` (`CnIndexPage.vue:5498-5532`), which the
  page renderer routes to the detail page. `fetchCollection` writes the
  result into the page's collection state (`src/store/useObjectStore.js:582-589`),
  so a lookup through it would replace the list.
- `CnActionsBar` draws the Add button beside the search
  (`src/components/CnActionsBar/CnActionsBar.vue:112-122`).
- Detail-page widgets register into `dashboardWidgetRegistry` with
  `surfaces: ['detail-page']`, as `object-geo` does
  (`src/components/CnObjectGeoWidget/dashboardRegistration.js:20-37`).
  The registration module is imported from
  `src/components/CnWidgetGrid/registerDashboardWidgets.js:65` and kept
  by the `**/dashboardRegistration.js` entry in `package.json`
  `sideEffects` (`:21`).
- A heavy optional library has a pattern: `@toast-ui/editor` sits in
  `dependencies`, is external in both rollup configs
  (`rollup.config.js:291`, `rollup.config.vue3.mjs:100`) and is loaded
  with a dynamic `import()` only when used
  (`src/components/CnMarkdownEditor/CnMarkdownEditor.vue:389`).
- `scripts/check-bundled-peers.mjs` asserts only against
  `peerDependencies` (`:62`). `scripts/check-dist-sideeffects.mjs`
  checks that a component's render survives a consumer's production
  build, using the `cn-app-root` marker (`:90`).
- The open change `form-file-and-camera-fields` specifies a camera
  still capture, `CnCameraCapture`, which starts the camera only on a
  button press and stops it on close (its design D4).

## Decisions

### D1. Decode natively when the browser can, with `@zxing/library` otherwise

The scanner uses the browser's `BarcodeDetector` when it exists and
reports `qr_code`, `code_128` and `ean_13` among its formats. Otherwise
it loads `@zxing/library` 0.23.0 with a dynamic `import()`, reads each
sampled frame from a canvas into an `RGBLuminanceSource`, and decodes it
with `MultiFormatReader` through a `HybridBinarizer`, hinted to QR_CODE,
CODE_128 and EAN_13. `@zxing/library` is Apache-2.0, ships an ESM build, and has
one runtime dependency (`ts-custom-error`).

Rejected: `barcode-detector` (MIT). It fetches a WebAssembly build of
zxing-cpp from a CDN by default, which a Nextcloud content security
policy blocks, and self-hosting the WebAssembly adds a build step.
Rejected: `@zxing/browser` (MIT). Its camera helpers duplicate the
stream handling the scanner owns, and it declares `@zxing/library` as a
peer, which would add a peer to this library's contract.

### D2. How the dependency meets the repo's peer and bundle rules

`@zxing/library` holds no page-wide singleton and no state shared with
the consumer, so it is a plain dependency: it goes in `dependencies`,
never in `peerDependencies`. `check-bundled-peers.mjs` checks only
peers, so it is untouched. It is made external in both rollup configs
beside `@toast-ui/`, so the dist does not vendor it; the consumer's
webpack puts it in a lazy chunk behind the dynamic import. No barrel
exports it and no module imports it at the top level, so it adds no
`sideEffects` entry, and `check-dist-sideeffects.mjs` still probes the
same render path. The lane owner runs both gates once after the build
and records the result.

### D3. One scanner dialog, used by the action and the field

`CnCodeScannerDialog` (`src/dialogs/`, an `NcDialog`) takes `formats`
(default all three) and emits `detected` with `{ value, format }`. It
starts the rear camera (`facingMode: environment`) when it opens, shows
the preview, decodes about five frames a second, and stops every track
on detection, on close and on unmount. A text input sits under the
preview the whole time; Enter in it emits `detected` with format
`typed`. When the camera is refused, missing or blocked by the page
policy, the dialog says so and keeps the input.

The camera stream handling is shared with `CnCameraCapture` from
`form-file-and-camera-fields` through one composable,
`useCameraStream`, whichever change lands first.

Rejected: decoding on the server. A frame would leave the device, and a
round trip per frame is too slow for a hand-held phone.

### D4. The scan action looks up before it touches the list

`config.scan: { enabled, field, onMatch, formats? }` on an index page
shows a Scan button in `CnActionsBar`. On `detected`, the page sends one
lookup, `GET` on the page's objects endpoint with `{field}={value}` and
`_limit=2`, through axios rather than the store, so the list does not
change yet.

- No result: a notice says "No record has this code." and the list
  stays as it was.
- One result and `onMatch: open`: the page opens it through
  `onRowClick`, as a click on its row would.
- Otherwise: the page calls `onFilterChange(field, [value])`, so the
  list shows the matches and the filter chip can be removed as usual.

Rejected: filtering first and opening when one row is left. The list
would flash a filtered state before navigating, and a no-match would
have to undo the user's filter.

### D5. The form field is a text input with a Scan button

`CnScanField` renders an `NcTextField` with a Scan trailing button that
opens the scanner with the field's `formats`. A detected value replaces
the text; the user can edit it before Submit. A handheld scanner that
types like a keyboard works in the input without the dialog.

### D6. The code widget draws SVG in the browser

`CnObjectCodeWidget` registers as widget type `code` with
`surfaces: ['detail-page']` and content `{ title, format, source,
field }`. `source: field` reads that property of the loaded object;
`source: address` uses the absolute URL of the detail route the widget
is on, from `$router.resolve($route)`, without query or hash.

- QR: drawn from `@zxing/library`'s `QRCodeWriter`, loaded on demand,
  as one SVG path of the module grid.
- Code 128 and EAN-13: drawn by a small encoder in the library,
  `src/utils/barcodeEncode.js`, because `@zxing/library` 0.23.0 encodes
  only QR (`esm/core/MultiFormatWriter.js:51-73` in the package has its
  EAN-13 and Code 128 writers commented out). EAN-13 takes 12 digits and adds the check digit, or
  13 digits with a correct one. Code 128 takes printable ASCII.

A value the format cannot hold shows a sentence saying why, not a
broken code. Download as SVG saves the drawn SVG with the record title
in the file name.

Rejected: `jsbarcode` (MIT) for the barcodes. It ships no ESM entry and
draws into a DOM node. Rejected: `qrcode` (MIT) for QR. It pulls
`pngjs` and `yargs` in as runtime dependencies.

## Files

- `src/dialogs/CnCodeScannerDialog.vue`: new.
- `src/composables/useCameraStream.js`: new, or shared with
  `form-file-and-camera-fields`.
- `src/composables/useCodeDecoder.js`: new; native detector or
  `@zxing/library`.
- `src/components/CnScanField/`: new; `src/composables/cnFormFieldRenderer.js`.
- `src/components/CnObjectCodeWidget/`: new, with
  `dashboardRegistration.js` imported from `registerDashboardWidgets.js`.
- `src/utils/barcodeEncode.js`: new.
- `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/CnActionsBar/CnActionsBar.vue`: the Scan button and
  lookup.
- `src/schemas/app-manifest.schema.json`, `src/schemas/app-manifest-v2.schema.json`,
  `src/utils/validateManifest.js`: `config.scan`, the `scan` type.
- `package.json`, `rollup.config.js`, `rollup.config.vue3.mjs`: the
  dependency and its external rule.

## Security and privacy

Frames never leave the device. The camera starts only when the user
opens the scanner. A scanned value is data: it is sent as a query
parameter to the page's own objects endpoint and shown as text, never
used as a URL to navigate to. A QR code that holds a record's address
reveals that address to whoever sees it; opening it still needs a
signed-in user with access to the record, as the buildiq design notes.

## Accessibility

The Scan button has a text label. The preview has a text alternative
saying the camera is on. The typed input is always present, so the
dialog works without a camera, a pointer or sight of the preview. A
detection is announced in a polite live region. The code widget's SVG
has `role="img"` and an `aria-label` that states the format and the
encoded value.

## Theming

The code is drawn in `--color-main-text` on `--color-main-background`,
so it keeps enough contrast in dark mode to scan; the downloaded SVG
always uses black on white.
