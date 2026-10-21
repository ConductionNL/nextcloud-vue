# CnCameraCapture

A webcam snapshot for a file field, or a barcode reader. Mounting it starts the camera, so a host mounts it only when the person presses Take photo and the browser asks for permission then. It shows a live preview with Capture, then the still with Retake and Use photo. Use photo emits the picture as a JPEG `File`. Every camera track is stopped on Use photo, Cancel, an error and when the component goes away, so the camera light goes off.

`CnFileField` uses it when its `capture` prop is set and the device has a camera API but the input's `capture` attribute does nothing (a laptop). On a phone the attribute opens the phone's own camera app instead.

## Usage

```vue
<CnCameraCapture facing="user" @capture="addFile" @close="open = false" />
```

### Barcode mode

With `mode="barcode"` the component reads the preview with the browser's BarcodeDetector until a frame holds one of `formats`, then stops the camera and emits `scan` with the value and its format. A field next to the camera lets the person type the code instead (`manualFallback`). When the browser cannot read any of the formats, or the camera cannot start, the component says so and offers typed entry only, without asking for the camera.

```vue
<CnCameraCapture mode="barcode" :formats="['ean_13', 'code_128']" @scan="lookUp" @close="scanning = false" />
```

Reusers: shillinq's warehouse scanner (count, pick, receive, transfer), pipelinq product scan at the till, keepiq archive box labels, buildiq material receipt.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `facing` | `String` | `'environment'` | Which camera to prefer: `environment` (rear) or `user` (front). |
| `fileName` | `String` | `''` | File name of the photo. Empty: `photo-<timestamp>.jpg`. |
| `mode` | `String` | `'photo'` | `photo` takes a picture; `barcode` reads a barcode and emits `scan`. |
| `formats` | `Array` | `['qr_code', 'ean_13', 'code_128', 'code_39', 'code_93']` | Barcode mode: the BarcodeDetector formats to look for. |
| `manualFallback` | `Boolean` | `true` | Barcode mode: offer typed entry next to the camera. Typed entry is always offered when the camera cannot read barcodes. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `capture` | `File` | The person chose Use photo; the picture as a JPEG file. |
| `scan` | `String`, `String` | Barcode mode: a code was read or typed. The value, then its format (`manual` when typed). |
| `close` | none | Cancel, or after Use photo or a scan; the host removes the surface. |

## Slots

None.

## Accessibility

The preview is labelled "Camera preview. The camera is on." and the still has a text alternative. Capture, Retake, Use photo and Cancel are buttons. If the camera cannot be started the component says so in an alert.

In barcode mode the group is labelled "Scan barcode", the preview says it reads a barcode, and a hint asks to point the camera at it. The typed-entry field has a visible label. A camera or decoder that cannot be used is announced as a status, not an alert, because typed entry still works.
