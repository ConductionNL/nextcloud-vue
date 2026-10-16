/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `bar`: a thin track under each row, against the largest
 * row (DqTeamwachtrij "Team vandaag") or against the row's own maximum,
 * red past it (PqWachtrij "Team vandaag").
 *
 * @spec openspec/changes/record-list-row-bar/specs/record-list-row-bar/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const TEAM = [
	{ id: 'u1', displayName: 'Pieter Jansen', availability: 'Beschikbaar', open: 6, maxConcurrent: 8 },
	{ id: 'u2', displayName: 'Fatma Yildiz', availability: 'Beschikbaar', open: 11, maxConcurrent: 10 },
	{ id: 'u3', displayName: 'Tim Mulder', availability: 'Afwezig', open: 0, maxConcurrent: 8 },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountList(content) {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'agent', avatar: '{displayName}', title: '{displayName}', meta: '{availability}', trailing: '{open} open', ...content } },
		global: { stubs: { NcLoadingIcon: true } },
	})
}

const barsOf = (w) => w.findAll('[data-testid="cn-record-list-bar"]').map((bar) => ({
	width: bar.find('.cn-record-list__bar-fill').attributes('style'),
	over: bar.classes().includes('cn-record-list__bar--over'),
	max: bar.attributes('aria-valuemax'),
}))

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: TEAM, total: 3 } })
})

describe('CnRecordListWidget bar', () => {
	it('fills each track to its share of the largest row without maxField', async () => {
		const w = mountList({ bar: { valueField: 'open' } })
		await flush()
		const bars = barsOf(w)
		expect(bars).toHaveLength(3)
		expect(bars[0].width).toMatch(/width: 54\.5/)
		expect(bars[1].width).toContain('width: 100%')
		expect(bars[2].width).toContain('width: 0%')
		expect(bars.every((bar) => !bar.over && bar.max === '11')).toBe(true)
		expect(w.findAll('[data-testid="cn-record-list-avatar"]').map((a) => a.text())).toEqual(['PJ', 'FY', 'TM'])
	})

	it('measures against maxField and turns red past it with overVariant error', async () => {
		const w = mountList({ bar: { valueField: 'open', maxField: 'maxConcurrent', overVariant: 'error' } })
		await flush()
		const bars = barsOf(w)
		expect(bars[0]).toEqual({ width: expect.stringContaining('width: 75%'), over: false, max: '8' })
		expect(bars[1]).toEqual({ width: expect.stringContaining('width: 100%'), over: true, max: '10' })
		expect(w.findAll('.cn-record-list__trailing').map((t) => t.text())).toEqual(['6 open', '11 open', '0 open'])
	})

	it('stays the default colour past the maximum without overVariant', async () => {
		const w = mountList({ bar: { valueField: 'open', maxField: 'maxConcurrent' } })
		await flush()
		expect(barsOf(w)[1].over).toBe(false)
	})

	it('draws no track without bar', async () => {
		const w = mountList({})
		await flush()
		expect(w.find('[data-testid="cn-record-list-bar"]').exists()).toBe(false)
	})
})
