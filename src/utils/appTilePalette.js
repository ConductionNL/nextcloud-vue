/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The colours an app tile can take, and the colour an app gets by default.
 *
 * Each colour is a CSS custom property with a hex fallback, so a theme can
 * redefine `--cn-app-tile-<key>` and the tile follows. The fallbacks follow
 * the Zuiddrecht palette (blue #3669A5, red #CC0000). Every fallback keeps a
 * contrast of at least 3:1 against the white icon (WCAG 1.4.11).
 *
 * @module utils/appTilePalette
 */

/**
 * The palette, in the order a colour picker offers it.
 *
 * @type {Array<{key: string, label: string, hex: string}>}
 */
export const APP_TILE_COLOURS = [
	{ key: 'blue', label: 'Blue', hex: '#3669a5' },
	{ key: 'red', label: 'Red', hex: '#cc0000' },
	{ key: 'green', label: 'Green', hex: '#2f6b4a' },
	{ key: 'navy', label: 'Navy', hex: '#234a78' },
	{ key: 'purple', label: 'Purple', hex: '#6b3fa0' },
	{ key: 'teal', label: 'Teal', hex: '#00747a' },
	{ key: 'orange', label: 'Orange', hex: '#b54708' },
	{ key: 'slate', label: 'Slate', hex: '#4a5566' },
]

/**
 * The default colour of the apps most people have, so a tile keeps its
 * colour across dashboards and people. Any other app gets a colour from its id.
 *
 * @type {Record<string, string>}
 */
const KNOWN_APP_COLOURS = {
	files: 'blue',
	mail: 'navy',
	calendar: 'red',
	spreed: 'teal',
	contacts: 'orange',
	deck: 'purple',
	tasks: 'green',
	notes: 'orange',
	photos: 'purple',
	activity: 'slate',
	forms: 'green',
	collectives: 'teal',
	tables: 'navy',
	richdocuments: 'blue',
	onlyoffice: 'red',
	integration_openproject: 'teal',
	xwiki: 'navy',
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
	return `var(--cn-app-tile-${colour.key}, ${colour.hex})`
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
