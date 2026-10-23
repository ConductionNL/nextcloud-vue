/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The cases list says per view what it shows under its title: the table
 * "gesorteerd op termijn" (DqZaken), the board "bordweergave per status"
 * (DqWerkbord), the map only the count before its places (DqZakenKaart).
 *
 * @spec openspec/changes/count-text-per-view/specs/index-page/spec.md#requirement-the-count-line-can-differ-per-view
 */

import { applyQueryPreset } from '../../src/utils/queryPresets.js'
import { applySavedViewOverrides } from '../../src/utils/savedViewOverrides.js'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const PAGE_LINE = '{shown} of {total} open cases in your teams, sorted by deadline'
const BY_VIEW = {
	board: '{shown} of {total} open cases in your teams · board view by status',
	map: '{shown} of {total} open cases in your teams',
}
const NL = {
	[PAGE_LINE]: '{shown} van {total} lopende zaken in uw teams · gesorteerd op termijn',
	[BY_VIEW.board]: '{shown} van {total} lopende zaken in uw teams · bordweergave per status',
	[BY_VIEW.map]: '{shown} van {total} lopende zaken in uw teams',
}

/**
 * The header's count line for a page in the board look.
 *
 * @param {string} mode The open view.
 * @param {object} [over] Context overrides.
 * @return {string} The line.
 */
function line(mode, over = {}) {
	const ctx = {
		isBoardLook: true,
		effectivePagination: { total: 48 },
		effectiveObjects: new Array(8).fill({}),
		currentViewMode: mode,
		countText: PAGE_LINE,
		countTextByView: BY_VIEW,
		countSubtitle: '',
		headerMetaCarriesCount: false,
		activeScopePresentation: {},
		sourceTerm: '',
		cnTranslate: (text) => NL[text] || text,
		...over,
	}
	ctx.ownPresentation = { countText: ctx.countText }
	ctx.presented = (key) => CnIndexPage.methods.presented.call(ctx, key)
	ctx.presentedCountText = CnIndexPage.computed.presentedCountText.call(ctx)
	return CnIndexPage.computed.headerDescriptionBase.call(ctx)
}

describe('the count line per view', () => {
	it('says the board view in its own words', () => {
		expect(line('board')).toBe('8 van 48 lopende zaken in uw teams · bordweergave per status')
		expect(line('map')).toBe('8 van 48 lopende zaken in uw teams')
	})

	it('keeps the page\'s line in a view it does not name, or without any', () => {
		expect(line('table')).toBe('8 van 48 lopende zaken in uw teams · gesorteerd op termijn')
		expect(line('board', { countTextByView: null })).toBe('8 van 48 lopende zaken in uw teams · gesorteerd op termijn')
	})

	it('uses a scope\'s own line in every view', () => {
		expect(line('board', { activeScopePresentation: { countText: '{shown} of {total} in this folder' } })).toBe('8 of 48 in this folder')
	})

	it('sets the page\'s lines aside when a saved view sets its own', () => {
		const config = { countText: PAGE_LINE, countTextByView: BY_VIEW }
		expect(applySavedViewOverrides(config, { countText: '{shown} of {total} open cases without a handler · oldest first' }).countTextByView).toBeNull()
		expect(applySavedViewOverrides(config, { columns: ['title'] }).countTextByView).toBe(BY_VIEW)
	})

	it('sets the page\'s lines aside when a query preset sets its own', () => {
		const config = { countText: PAGE_LINE, countTextByView: BY_VIEW }
		expect(applyQueryPreset(config, { match: { caseType: 'x' }, countText: '{shown} of {total} permits' }).countTextByView).toBeNull()
		expect(applyQueryPreset(config, { match: { caseType: 'x' }, title: 'Permits' }).countTextByView).toBe(BY_VIEW)
	})
})
