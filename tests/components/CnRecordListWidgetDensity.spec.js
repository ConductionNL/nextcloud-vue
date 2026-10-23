/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `density: "compact"` draws a record list's rows as DqProcesanalyse's "Waar
 * zaken blijven hangen": 10px above and below, 56px tall, the title at 500.
 *
 * @spec openspec/changes/record-list-density/specs/record-list/spec.md#requirement-a-record-list-can-draw-compact-rows
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const board = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(board))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

async function render(content) {
	axios.get.mockResolvedValue({ data: { results: [{ id: 'a', title: 'Bezwaar, fase Advies' }], total: 1 } })
	const w = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'bottleneck', title: '{title}', ...content } },
		global: { stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnRecordListWidget density', () => {
	it('marks a compact list', async () => {
		expect((await render({ density: 'compact' })).classes()).toContain('cn-record-list--compact')
	})

	it('leaves the default list unmarked', async () => {
		expect((await render({})).classes()).not.toContain('cn-record-list--compact')
	})

	it('draws compact dashboard rows 10px, 56px tall, the title at 500', () => {
		const dash = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list--compact'
		const row = bodiesOf(`${dash} .cn-record-list__row`)
		expect(row).toContain('padding: 10px 0;')
		expect(row).toContain('min-height: 56px;')
		expect(bodiesOf(`${dash} .cn-record-list__title`)).toContain('font-weight: 500;')
	})
})
