/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The app tile palette: every colour keeps the white icon readable, and an
 * app keeps its colour.
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
import { APP_TILE_COLOURS, appTileColourValue, contrastWithWhite, defaultAppTileColour } from '../../src/utils/appTilePalette.js'

describe('app tile palette', () => {
	it.each(APP_TILE_COLOURS.map((colour) => [colour.key, colour.hex]))('%s keeps at least 3:1 against the white icon (WCAG 1.4.11)', (key, hex) => {
		expect(contrastWithWhite(hex)).toBeGreaterThanOrEqual(3)
	})

	it('is the eight theme token roles, with the Zuiddrecht blue and red', () => {
		expect(APP_TILE_COLOURS.map((colour) => colour.key)).toEqual(['primary', 'primary-deep', 'accent', 'accent-deep', 'work-ink', 'work-text', 'work-muted', 'work-field'])
		const hexes = APP_TILE_COLOURS.map((colour) => colour.hex)
		expect(hexes).toContain('#3669a5')
		expect(hexes).toContain('#cc0000')
	})

	it('computes the WCAG ratio', () => {
		expect(contrastWithWhite('#000000')).toBeCloseTo(21, 5)
		expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 5)
	})

	it('gives an app the same palette colour every time', () => {
		const keys = APP_TILE_COLOURS.map((colour) => colour.key)
		expect(defaultAppTileColour('files')).toBe('work-muted')
		expect(defaultAppTileColour('calendar')).toBe('primary')
		expect(defaultAppTileColour('some_app')).toBe(defaultAppTileColour('some_app'))
		expect(keys).toContain(defaultAppTileColour('some_app'))
		expect(keys).toContain(defaultAppTileColour(''))
	})

	it('draws a colour as its own token, then the theme token, then the hex, and an unknown key as the app default', () => {
		expect(appTileColourValue('accent')).toBe('var(--cn-app-tile-accent, var(--sc-accent, #cc0000))')
		expect(appTileColourValue('nope', 'calendar')).toBe('var(--cn-app-tile-primary, var(--sc-primary, #3669a5))')
	})
})
