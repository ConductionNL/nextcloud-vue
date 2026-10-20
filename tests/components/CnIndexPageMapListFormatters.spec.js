/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZakenKaart: the map list's sub line and pills read display names through
 * the app's formatters (a case type's title, an address looked up for the
 * case), the sub line falls back when the first template does not fill, and
 * the card for the rows without a place stays under the list.
 *
 * @spec openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-a-map-list-reads-display-names-through-the-apps-formatters
 */
import fs from 'fs'
import path from 'path'
import { fillTemplate } from '../../src/utils/fillTemplate.js'
import { mapListItems } from '../../src/utils/mapList.js'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const FORMATTERS = {
	caseTypeName: (value) => ({ ct1: 'Woo-verzoek' })[value] || value,
	caseAddress: (value) => ({ c1: 'Lindelaan 40' })[value] || '',
}
const ROWS = [
	{ id: 'c1', title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', caseType: 'ct1', statusPublicLabel: 'In behandeling', lat: 51.8 },
	{ id: 'c3', title: 'Subsidie buurtfeest Oosthaven', identifier: '2026-0070', caseType: 'ct1', statusPublicLabel: 'Besluit', lat: 51.81 },
]
const LIST = {
	title: '{title}',
	sub: ['{id|caseAddress} · {identifier}', '{identifier}'],
	pills: [{ path: 'caseType', formatter: 'caseTypeName' }, { path: 'statusPublicLabel', variant: 'info' }],
}
const located = (row) => typeof row.lat === 'number'

describe('map list through the app formatters', () => {
	it('names a pill through its formatter and keeps a plain one', () => {
		const { items } = mapListItems(ROWS, LIST, { rowKey: 'id', located, formatters: FORMATTERS })
		expect(items[0].pills).toEqual([{ label: 'Woo-verzoek', variant: 'default' }, { label: 'In behandeling', variant: 'info' }])
	})

	it('fills the sub line with a formatted token, else the next template', () => {
		const { items } = mapListItems(ROWS, LIST, { rowKey: 'id', located, formatters: FORMATTERS })
		expect(items.map((item) => item.sub)).toEqual(['Lindelaan 40 · 2026-0082', '2026-0070'])
	})

	it('reads an unknown token format as an app formatter, and as is without one', () => {
		expect(fillTemplate('{id|caseAddress}', ROWS[0], undefined, { formatters: FORMATTERS })).toBe('Lindelaan 40')
		expect(fillTemplate('{id|caseAddress}', ROWS[0])).toBe('c1')
	})

	it('passes the injected formatters from the page', () => {
		const c = {
			mapConfig: { latField: 'lat', list: LIST },
			displayObjects: ROWS,
			rowKey: 'id',
			cnTranslate: (s) => s,
			cnFormatters: FORMATTERS,
			resolveRowGeometry: (row) => (located(row) ? { type: 'Point', coordinates: [4.6, row.lat] } : null),
		}
		c.mapListEnabled = CnIndexPage.computed.mapListEnabled.call(c)
		const { items } = CnIndexPage.computed.mapList.call(c)
		expect(items[0].sub).toBe('Lindelaan 40 · 2026-0082')
		expect(items[0].pills[0].label).toBe('Woo-verzoek')
	})
})

/**
 * @spec openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-the-card-for-rows-without-a-place-stays-under-the-list
 */
describe('index-page.css: the list scrolls, the card stays under it', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css/index-page.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const body = (selector) => (css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')) || [])[1] || ''

	it('scrolls the list inside the side column', () => {
		expect(body('.cn-index-page__map-list')).toContain('overflow-y: auto;')
		expect(body('.cn-index-page__map-list')).toContain('min-height: 0;')
	})

	it('keeps the rows and the card at their own height', () => {
		expect(body('.cn-index-page__map-item')).toContain('flex: none;')
		expect(body('.cn-index-page__map-missing')).toContain('flex: none;')
	})
})
