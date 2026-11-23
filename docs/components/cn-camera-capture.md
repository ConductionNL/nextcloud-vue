# CnCameraCapture

A webcam snapshot for a file field. Mounting it starts the camera, so a host mounts it only when the person presses Take photo and the browser asks for permission then. It shows a live preview with Capture, then the still with Retake and Use photo. Use photo emits the picture as a JPEG `File`. Every camera track is stopped on Use photo, Cancel, an error and when the component goes away, so the camera light goes off.

`CnFileField` uses it when its `capture` prop is set and the device has a camera API but the input's `capture` attribute does nothing (a laptop). On a phone the attribute opens the phone's own camera app instead.

## Usage

```vue
<CnCameraCapture facing="user" @capture="addFile" @close="open = false" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `facing` | `String` | `'environment'` | Which camera to prefer: `environment` (rear) or `user` (front). |
| `fileName` | `String` | `''` | File name of the photo. Empty: `photo-<timestamp>.jpg`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `capture` | `File` | The person chose Use photo; the picture as a JPEG file. |
| `close` | none | Cancel, or after Use photo; the host removes the surface. |

## Slots

None.

## Accessibility

The preview is labelled "Camera preview. The camera is on." and the still has a text alternative. Capture, Retake, Use photo and Cancel are buttons. If the camera cannot be started the component says so in an alert.
