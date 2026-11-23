# A field can be filled by scanning a code

## Why
buildiq's forms take a serial number or a ticket code from a scan (`pages-qr-and-barcodes` D2). The form renderer had
no field that reads a code from the camera.

## What changes
CnScanField and `utils/barcodeScan.js`: the browser's `BarcodeDetector` reads QR, Code 128 and EAN-13 from the camera,
opened only on Scan; typing always works. `cnRenderFormField` renders `type: "scan"` with it. No dependency added.
