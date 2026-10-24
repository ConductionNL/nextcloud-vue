/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list with `density: "stacked"` stands its rows 10px apart with no
 * rule and no row padding (DqDagAfsluiten "Morgen eerst"). jsdom draws no
 * layout, so the class is checked on the list and the rules are read from the
 * component and the board sheet.
 *
 * @spec openspec/changes/record-list-stacked-density/specs/record-list-stacked-density/spec.md#requirement-a-record-list-can-stack-its-rows
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const component = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8'))
const board = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8'))
const BOARD = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

/**
 * The declarations of the rule with this selector.
 *
 * @param {string} css The sheet.
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnRecordListWidget: stacked rows', () => {
	it('marks the list stacked', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'a', title: 'A' }], total: 1 } })
		const wrapper = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'case', presentation: 'rows', title: '{title}', density: 'stacked' } },
			global: { stubs: { NcLoadingIcon: true, RouterLink: true } },
		})
		await flushPromises()
		expect(wrapper.find('.cn-record-list').classes()).toContain('cn-record-list--stacked')
	})

	it('stands the rows 10px apart without padding or rule, in the board look too', () => {
		expect(rule(component, '.cn-record-list--stacked .cn-record-list__list')).toMatch(/gap:\s*10px/)
		expect(rule(component, '.cn-record-list--stacked .cn-record-list__row')).toMatch(/padding:\s*0/)
		expect(rule(component, '.cn-record-list--stacked .cn-record-list__item + .cn-record-list__item')).toMatch(/border-top:\s*0/)
		expect(rule(board, `${BOARD} .cn-record-list--stacked .cn-record-list__row`)).toMatch(/padding-block:\s*0/)
		expect(rule(board, `${BOARD} .cn-record-list--stacked.cn-record-list--rows .cn-record-list__item + .cn-record-list__item`)).toMatch(/border-top:\s*0/)
	})
})
