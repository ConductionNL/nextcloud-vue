/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `tiles: true` draws a record list's rows as framed tiles in a grid
 * (DqZaaktypeOverzicht "Statussen": two columns of 260px at the least, 8px
 * apart, each row 8px 10px inside a hairline edge with radius 8, the title at
 * 14px regular, the colour dot before it and the flag text at its end).
 *
 * @spec openspec/changes/record-list-row-tiles/specs/record-list/spec.md#requirement-a-record-list-can-draw-its-rows-as-tiles
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

async function render(content) {
	axios.get.mockResolvedValue({ data: { results: [{ id: 'a', name: 'Ontvangen', colour: '#234a78', start: true }], total: 1 } })
	const w = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'statusType', title: '{name}', ...content } },
		global: { stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	return w
}

const TILES = '.cn-record-list.cn-record-list--tiles'

describe('CnRecordListWidget tiles', () => {
	it('marks a rows list with tiles', async () => {
		const w = await render({ presentation: 'rows', tiles: true, dot: 'colour', flags: [{ field: 'start', label: 'Start' }] })
		expect(w.classes()).toContain('cn-record-list--tiles')
		expect(w.find('[data-testid="cn-record-list-dot"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-record-list-flag"]').text()).toBe('Start')
	})

	it('leaves a list without tiles, and a non-rows list, unmarked', async () => {
		expect((await render({ presentation: 'rows' })).classes()).not.toContain('cn-record-list--tiles')
		expect((await render({ presentation: 'cards', tiles: true })).classes()).not.toContain('cn-record-list--tiles')
	})

	it('lays the tiles out in a grid of 260px at the least, 8px apart', () => {
		const list = rule(`${TILES} .cn-record-list__list`)
		expect(list).toMatch(/display:\s*grid/)
		expect(list).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(260px,\s*1fr\)\)/)
		expect(list).toMatch(/gap:\s*8px/)
	})

	it('frames each row 8px 10px inside a hairline edge, radius 8', () => {
		const row = rule(`${TILES} .cn-record-list__list .cn-record-list__item .cn-record-list__row`)
		expect(row).toMatch(/padding:\s*8px 10px/)
		expect(row).toMatch(/border:\s*1px solid/)
		expect(row).toMatch(/border-radius:\s*8px/)
	})

	it('sets the title at 14px regular', () => {
		const title = rule(`${TILES} .cn-record-list__list .cn-record-list__item .cn-record-list__title`)
		expect(title).toMatch(/font-size:\s*14px/)
		expect(title).toMatch(/font-weight:\s*400/)
	})
})
