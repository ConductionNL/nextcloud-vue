/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Heuristic: does a string look like a raw SVG path (the `d` attribute), as
 * opposed to an icon-registry name, a CSS class, or an image URL?
 *
 * Matches a leading move command (`M`/`m`) followed by a coordinate, which is
 * how every `@mdi/js` / vue-material-design path begins. Centralised here so
 * the icon surfaces (CnIconBrowser, CnIconBrowserPanel, CnDashboardIcon,
 * CnWidgetIcon, CnDashTileWidgetForm) share one definition and can't drift.
 *
 * @param {*} value - the candidate value (only strings can match).
 * @return {boolean} true when the value looks like an SVG path string.
 */
export function isSvgPath(value) {
	return typeof value === 'string' && /^[Mm][\d\s.,-]/.test(value)
}
