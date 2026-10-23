/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board index header's counts (DqContracten, DqPrivacy): `headerMeta` can
 * name the count of another list, `{count:<name>}` from `headerMetaCounts`
 * ("38 contracten bij 21 leveranciers"), and when the note after the
 * breadcrumb already carries a count the board leaves out its own
 * "{shown} of {total}" line.
 */
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	fetchFilterCounts: jest.fn(),
	fetchListTotal: jest.fn(),
}))

const { fetchListTotal } = require('../../src/utils/fetchFilterCounts.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const { headerMetaText, headerMetaCarriesCount, headerMetaCountKey, headerDescriptionBase: headerDescription } = CnIndexPage.computed

/**
 * A stand-in for the component's `this`.
 *
 * @param {object} over Fields to set.
 * @return {object} The context.
 */
function ctx(over = {}) {
	const c = {
		presentation: {},
		presented(key) { return this.presentation[key] },
		cnTranslate: (s) => s,
		effectivePagination: { total: 38 },
		effectiveObjects: new Array(20).fill({}),
		headerMetaCountValues: {},
		headerMetaCounts: null,
		isBoardLook: true,
		countSubtitle: '',
		description: '',
		activeScopePresentation: {},
		countTextByView: null,
		...over,
	}
	c.headerMetaCarriesCount = headerMetaCarriesCount.call(c)
	c.presentedCountText = CnIndexPage.computed.presentedCountText.call(c)
	return c
}

describe('CnIndexPage header meta counts', () => {
	it('fills {count:<name>} from the loaded totals', () => {
		const c = ctx({ presentation: { headerMeta: '{total} contracten bij {count:suppliers} leveranciers' }, headerMetaCountValues: { suppliers: 21 } })
		expect(headerMetaText.call(c)).toBe('38 contracten bij 21 leveranciers')
	})

	it('leaves the note out while a named count is unknown, never with a gap', () => {
		const c = ctx({ presentation: { headerMeta: '{total} contracten bij {count:suppliers} leveranciers' } })
		expect(headerMetaText.call(c)).toBe('')
		c.headerMetaCountValues = { suppliers: null }
		expect(headerMetaText.call(c)).toBe('')
	})

	it('reads each named list once, as its total', async () => {
		fetchListTotal.mockResolvedValueOnce(21)
		const c = ctx({ headerMetaCounts: { suppliers: { register: 'contracts', schema: 'supplier', filter: { active: true } }, broken: { register: 'x' } } })
		c.headerMetaCountKey = headerMetaCountKey.call(c)
		await CnIndexPage.methods.loadHeaderMetaCounts.call(c)
		expect(fetchListTotal).toHaveBeenCalledTimes(1)
		expect(fetchListTotal).toHaveBeenCalledWith('contracts', 'supplier', { active: true }, {})
		expect(c.headerMetaCountValues).toEqual({ suppliers: 21 })
	})

	it('counts the rows whose field is set with {rows:<field>} (DqAanMijToegewezen)', () => {
		const rows = [{ coveredFor: { name: 'Anouk' } }, { coveredFor: null }, {}, { coveredFor: { name: 'Bram' } }]
		const c = ctx({ presentation: { headerMeta: '{total} zaken, {rows:coveredFor} als waarnemer' }, headerMetaRows: rows })
		expect(headerMetaText.call(c)).toBe('38 zaken, 2 als waarnemer')
	})

	it('leaves out a bracketed part while a count in it is zero, and keeps it otherwise', () => {
		const meta = '{total} zaken op uw naam[, waarvan {rows:coveredFor} als waarnemer] · meest urgente eerst'
		const covered = ctx({ presentation: { headerMeta: meta }, effectivePagination: { total: 7 }, headerMetaRows: [{ coveredFor: { name: 'Anouk' } }, {}] })
		expect(headerMetaText.call(covered)).toBe('7 zaken op uw naam, waarvan 1 als waarnemer · meest urgente eerst')
		const own = ctx({ presentation: { headerMeta: meta }, effectivePagination: { total: 7 }, headerMetaRows: [{}, { coveredFor: null }] })
		expect(headerMetaText.call(own)).toBe('7 zaken op uw naam · meest urgente eerst')
	})

	it('counts a {rows:<field>} note as a count, so the board line steps aside', () => {
		expect(headerMetaCarriesCount.call(ctx({ presentation: { headerMeta: '{rows:coveredFor} als waarnemer' } }))).toBe(true)
	})

	it('drops the board count line when the note carries a count', () => {
		expect(headerDescription.call(ctx({ presentation: { headerMeta: '{total} open' } }))).toBe('')
		expect(headerDescription.call(ctx({ presentation: { headerMeta: 'bij {count:suppliers} leveranciers' } }))).toBe('')
	})

	it('keeps the count line when the note has no count, or the page sets countText', () => {
		expect(headerDescription.call(ctx({ presentation: { headerMeta: 'Alleen lopende contracten' } }))).toBe('20 of 38')
		expect(headerDescription.call(ctx({ presentation: {} }))).toBe('20 of 38')
		expect(headerDescription.call(ctx({ presentation: { headerMeta: '{total} open', countText: '{shown} van {total} contracten' } }))).toBe('20 van 38 contracten')
	})

	it('is a manifest key: names map to a register and a schema', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const page = (config) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'contracts', route: '/contracts', type: 'index', title: 'Contracts', config: { register: 'contracts', schema: 'contract', ...config } }],
		})
		expect(validateManifestV2(page({ headerMeta: 'bij {count:suppliers}', headerMetaCounts: { suppliers: { register: 'contracts', schema: 'supplier' } } })).valid).toBe(true)
		expect(validateManifestV2(page({ headerMetaCounts: { suppliers: { register: 'contracts' } } })).valid).toBe(false)
	})
})
