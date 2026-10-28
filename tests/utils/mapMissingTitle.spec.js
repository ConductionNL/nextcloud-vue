/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The map's missing-address card names what it counts when the app says so
 * (`mapConfig.list.missingTitle`, `{ singular, plural }` with `{total}`):
 * DqZakenKaart "8 zaken zonder adres". Without it the card keeps the
 * library's "8 without an address".
 *
 * @spec openspec/changes/map-missing-title-names-the-rows/specs/map-missing-title-names-the-rows/spec.md
 */
import { mapMissingTitleText } from '../../src/utils/mapList.js'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'nl',
	getCanonicalLocale: () => 'nl-NL',
	translate: (_app, s) => s,
	translatePlural: (_app, one, many, count, vars) => (count === 1 ? one : many).replace('%n', String(count)).replace('{total}', String(vars ? vars.total : count)),
}))

describe('mapMissingTitleText', () => {
	it('reads the app\'s singular and plural with the count', () => {
		const declared = { singular: '{total} case without an address', plural: '{total} cases without an address' }
		expect(mapMissingTitleText(declared, 8, { appId: 'dossiq' })).toBe('8 cases without an address')
		expect(mapMissingTitleText(declared, 1, { appId: 'dossiq' })).toBe('1 case without an address')
		expect(mapMissingTitleText(declared, 8, { translate: (s) => s.replace('cases', 'zaken') })).toBe('8 zaken without an address')
	})

	it('falls back to the library\'s line', () => {
		expect(mapMissingTitleText(undefined, 8)).toBe('8 without an address')
		expect(mapMissingTitleText({ singular: '' }, 2)).toBe('2 without an address')
	})
})
