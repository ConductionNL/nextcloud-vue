# device-frames-widget

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Show several small pages side by side as phone frames.

## ADDED Requirements

### Requirement: A page can show several small pages as phone frames

The `device-frames` widget SHALL draw one frame per entry of `frames`, `width` pixels wide (default 350), with a
heading of the translated title that labels the frame, an optional status line, and the widgets named by `widgetIds`
(or the `sections` entries) stacked below. The status line SHALL be the frame's own `status`, else the shared one;
with `followConnection` it SHALL read `offlineText` while the browser is offline and `onlineText` otherwise, and change
on the online and offline events. The frames SHALL wrap, and take the full width without a bezel below 640px.

#### Scenario: Offline

- **GIVEN** a shared status following the connection, and the browser offline
- **WHEN** the widget renders
- **THEN** each frame without its own status reads the offline text in the warning tone
