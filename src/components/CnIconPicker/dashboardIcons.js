/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dashboard icon registry — re-exported from the single canonical registry in
 * `CnWidgetGrid/widgetIcons.js`.
 *
 * This file previously held a SEPARATE, smaller copy of the same registry. It
 * drifted from widgetIcons.js: icon names added there (e.g. `FolderOutline`,
 * `AlertCircleOutline`, `CheckCircleOutline`, `ClipboardCheckOutline`) were
 * never mirrored here. Because the library barrel re-exports
 * `getIconComponent` / `DASHBOARD_ICONS` from THIS module, consumers got the
 * stale set and those icons fell back to the default glyph. Bundling two
 * registry modules also emitted a duplicate `DASHBOARD_ICONS` into the dist
 * (`DASHBOARD_ICONS$1`) that a consumer's webpack could collapse onto the wrong
 * copy. Collapsing to one source of truth removes both problems; the icon set,
 * `getIconComponent`, `DEFAULT_ICON` and `isCustomIconUrl` are unchanged in
 * behaviour — there is just one of each now.
 */

export { DASHBOARD_ICONS, DEFAULT_ICON, getIconComponent, isCustomIconUrl } from '../CnWidgetGrid/widgetIcons.js'
