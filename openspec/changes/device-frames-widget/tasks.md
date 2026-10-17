# Tasks: device-frames-widget

### Task 1: Device frames
- **spec_ref**: `openspec/changes/device-frames-widget/specs/device-frames-widget/spec.md#requirement-a-page-can-show-several-small-pages-as-phone-frames`
- **files**: `src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue`, `src/components/CnDeviceFramesWidget/index.js`, `src/utils/libraryWidgetKeys.js`, `e2e/harness/DeviceFramesHarness.vue`
- [x] Implement: widget, registration, exports, harness page
- [x] Test: `tests/components/CnDeviceFramesWidget.spec.js`; measured at 1440 (three 350px frames side by side) and 390 (stacked, full width, no sideways scroll)
