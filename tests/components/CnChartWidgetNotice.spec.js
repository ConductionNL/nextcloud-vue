/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A chart can carry a toned notice under it whose words carry values from the
 * page record, turned into words through the matrix's label maps
 * (DqHandhaving: "Advies: last onder dwangsom ...").
 *
 * @spec openspec/changes/chart-notice/specs/chart-notice/spec.md#requirement-a-chart-can-carry-a-notice-with-record-values
 */
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	__esModule: true,
	fetchReferenceObjects: jest.fn(() => Promise.resolve([])),
}))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const SOURCE = {
	register: 'app',
	schema: 'matrix-cell',
	filter: { matrix: '@object.matrixVersion' },
	rowField: 'behaviour',
	columnField: 'consequence',
	valueField: 'step',
	rowLabels: { 2: 'Behaviour 2: unaware' },
	columnLabels: { C: 'Consequence C: serious' },
	valueLabels: { order: 'Order subject to a penalty' },
}
const NOTICE = {
	lead: 'Advice: {intervention}',
	text: 'From matrix version {version}, {behaviour} and {consequence}.',
	values: { intervention: '@object.advice', version: '@object.matrixVersion', behaviour: '@object.behaviour', consequence: '@object.consequence' },
	labels: { intervention: 'values', behaviour: 'rows', consequence: 'columns' },
}
const dutch = {
	'Advice: {intervention}': 'Advies: {intervention}',
	'From matrix version {version}, {behaviour} and {consequence}.': 'Uit matrix versie {version}, {behaviour} en {consequence}.',
	'Order subject to a penalty': 'last onder dwangsom',
	'Behaviour 2: unaware': 'gedrag 2: onwetend',
	'Consequence C: serious': 'gevolg C: ernstig',
}

function mountWith(object, notice = NOTICE) {
	return mount(CnChartWidget, {
		props: { type: 'matrix', cellSource: SOURCE, notice },
		global: { provide: { cnWorkspaceContext: {}, cnObjectContext: { objectId: 'h1', object }, cnTranslate: (key) => dutch[key] || key } },
	})
}

describe('CnChartWidget notice', () => {
	it('fills the lead and text from the record, in words, as an info note', async () => {
		const w = mountWith({ advice: 'order', matrixVersion: 2, behaviour: '2', consequence: 'C' })
		await flush()
		const notice = w.find('[data-testid="cn-chart-widget-notice"]')
		expect(notice.exists()).toBe(true)
		expect(notice.find('strong').text()).toBe('Advies: last onder dwangsom')
		expect(notice.text()).toBe('Advies: last onder dwangsom Uit matrix versie 2, gedrag 2: onwetend en gevolg C: ernstig.')
		expect(notice.attributes('data-tone')).toBe('info')
	})

	it('takes its tone', async () => {
		const w = mountWith({ advice: 'order', matrixVersion: 2, behaviour: '2', consequence: 'C' }, { ...NOTICE, tone: 'warning' })
		await flush()
		expect(w.find('[data-testid="cn-chart-widget-notice"]').attributes('data-tone')).toBe('warning')
	})

	it('shows nothing while a value is missing, never half a sentence', async () => {
		const w = mountWith({ matrixVersion: 2, behaviour: '2', consequence: 'C' })
		await flush()
		expect(w.find('[data-testid="cn-chart-widget-notice"]').exists()).toBe(false)
	})

	it('shows nothing without a notice', async () => {
		const w = mountWith({ advice: 'order' }, null)
		await flush()
		expect(w.find('[data-testid="cn-chart-widget-notice"]').exists()).toBe(false)
	})
})
