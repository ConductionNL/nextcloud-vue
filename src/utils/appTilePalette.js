/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The colours an app tile can take, and the colour an app gets by default.
 *
 * The colours are the eight theme token roles of the design system: primary,
 * primary-deep, accent, accent-deep, work-ink, work-text, work-muted and
 * work-field. A tile draws `--cn-app-tile-<key>`, then the theme's
 * `--sc-<key>`, then the Zuiddrecht hex, so it follows the theme. Every
 * fallback keeps a contrast of at least 3:1 against the white icon
 * (WCAG 1.4.11).
 *
 * @module utils/appTilePalette
 */

/**
 * The palette, in the order a colour picker offers it.
 *
 * @type {Array<{key: string, label: string, hex: string}>}
 */
export const APP_TILE_COLOURS = [
	{ key: 'primary', label: 'Primary', hex: '#3669a5' },
	{ key: 'primary-deep', label: 'Primary deep', hex: '#234a78' },
	{ key: 'accent', label: 'Accent', hex: '#cc0000' },
	{ key: 'accent-deep', label: 'Accent deep', hex: '#a30000' },
	{ key: 'work-ink', label: 'Ink', hex: '#1b1c1d' },
	{ key: 'work-text', label: 'Text', hex: '#3d4047' },
	{ key: 'work-muted', label: 'Muted', hex: '#5e6168' },
	{ key: 'work-field', label: 'Field', hex: '#828a95' },
]

/**
 * The default colour of the apps most people have, so a tile keeps its
 * colour across dashboards and people. Any other app gets a colour from its id.
 *
 * @type {Record<string, string>}
 */
const KNOWN_APP_COLOURS = {
	files: 'work-muted',
	mail: 'primary-deep',
	calendar: 'primary',
	spreed: 'work-ink',
	contacts: 'accent-deep',
	deck: 'work-text',
	tasks: 'primary',
	notes: 'work-text',
	photos: 'accent',
	activity: 'work-field',
	forms: 'primary-deep',
	collectives: 'work-text',
	tables: 'primary-deep',
	richdocuments: 'primary-deep',
	onlyoffice: 'accent',
	dossiq: 'primary',
	integration_openproject: 'work-ink',
	xwiki: 'primary-deep',
}

/**
 * The palette entry for a key, or null when the key is not in the palette.
 *
 * @param {string} key The colour key.
 * @return {{key: string, label: string, hex: string}|null}
 */
export function appTileColour(key) {
	return APP_TILE_COLOURS.find((colour) => colour.key === key) || null
}

/**
 * The colour key an app gets when its tile names none: a fixed one for the
 * common apps, otherwise one picked from a hash of the app id, so the same
 * app always gets the same colour.
 *
 * @param {string} appId The app id.
 * @return {string} A key of {@link APP_TILE_COLOURS}.
 */
export function defaultAppTileColour(appId) {
	const id = String(appId || '')
	if (KNOWN_APP_COLOURS[id]) {
		return KNOWN_APP_COLOURS[id]
	}
	let hash = 0
	for (let index = 0; index < id.length; index++) {
		hash = (hash * 31 + id.charCodeAt(index)) >>> 0
	}
	return APP_TILE_COLOURS[hash % APP_TILE_COLOURS.length].key
}

/**
 * The CSS value of a colour key: its custom property with the hex fallback.
 * An unknown key falls back to the app's default colour.
 *
 * @param {string} key The colour key.
 * @param {string} appId The app id, for the fallback.
 * @return {string} A CSS colour value.
 */
export function appTileColourValue(key, appId = '') {
	const colour = appTileColour(key) || appTileColour(defaultAppTileColour(appId))
	return `var(--cn-app-tile-${colour.key}, var(--sc-${colour.key}, ${colour.hex}))`
}

/**
 * The relative luminance of a `#rrggbb` colour (WCAG 2.x).
 *
 * @param {string} hex The colour.
 * @return {number} The luminance, 0..1.
 */
function luminance(hex) {
	const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
	const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The contrast ratio between white and a `#rrggbb` colour (WCAG 2.x).
 *
 * @param {string} hex The colour.
 * @return {number} The ratio, 1..21.
 */
export function contrastWithWhite(hex) {
	return 1.05 / (luminance(hex) + 0.05)
}
