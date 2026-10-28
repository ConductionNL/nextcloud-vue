/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts-figures-and-input (board PqKassadienst "Kasverschil"): tiles drawn as
 * figures with a note under the value and a tone on it, a notice band shown
 * only when the record meets its condition, one text field whose value the
 * actions send as `@input.<key>`, and a source sorted on "@self.created"
 * that is still read.
 *
 * @spec openspec/changes/facts-figures-and-input/specs/facts-widget/spec.md#requirement-tiles-can-show-figures-with-a-note-and-a-tone
 */

var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), post: jest.fn() },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => ({ uid: 'boss', isAdmin: true }),
	getRequestToken: () => 'token',
}))

import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const DIFF = { id: 'd-1', expectedAmount: 412.3, actualAmount: 399.9, diffAmount: -12.4, diffPercentage: 3, withinTolerance: false, status: 'pending' }

const FIELDS = [
	{ path: 'expectedAmount', label: 'Expected', format: 'currency' },
	{ path: 'actualAmount', label: 'Counted', format: 'currency' },
	{
		path: 'diffAmount',
		label: 'Difference',
		format: 'currency',
		tone: [{ when: { field: 'diffAmount', op: 'lt', value: 0 }, variant: 'error' }],
		note: {
			separator: ', ',
			parts: [
				{ separator: '', parts: [{ path: 'diffPercentage', format: 'number', decimals: 1 }, { text: '%' }] },
				{ path: 'withinTolerance', map: { true: 'within the margin', false: 'outside the margin' } },
			],
		},
	},
]

/**
 * Mount the widget on a record.
 *
 * @param {object} content The widget content.
 * @param {object} [record] The record.
 * @return {object} The wrapper.
 */
function mountFacts(content, record = DIFF) {
	return mount(CnFactsWidget, {
		propsData: { objectData: record, content },
		provide: { cnTranslate: (key) => key },
		stubs: {
			NcLoadingIcon: true,
			NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note-stub"><slot /></div>' },
			CnActionButtons: {
				name: 'CnActionButtons',
				props: ['actions'],
				template: '<div class="stub-actions"><button v-for="a in actions" :key="a.id" :data-id="a.id">{{ a.label }}</button></div>',
			},
		},
	})
}

describe('CnFactsWidget: figures', () => {
	it('draws tiles as figures with tileStyle: figures', () => {
		const dl = mountFacts({ layout: 'tiles', tileStyle: 'figures', fields: FIELDS }).find('dl')
		expect(dl.classes()).toEqual(expect.arrayContaining(['cn-facts-widget__rows--tiles', 'cn-facts-widget__rows--figures']))
	})

	it('writes the note under the value and tones a shortage red', () => {
		const w = mountFacts({ layout: 'tiles', tileStyle: 'figures', fields: FIELDS })
		expect(w.find('[data-testid="cn-fact-note-diffAmount"]').text()).toMatch(/^3[.,]0%, outside the margin$/)
		expect(w.find('[data-testid="cn-fact-diffAmount"] .cn-facts-widget__value-text--error').exists()).toBe(true)
		expect(w.find('[data-testid="cn-fact-actualAmount"] .cn-facts-widget__value-text--error').exists()).toBe(false)
	})
})

describe('CnFactsWidget: a notice with a condition', () => {
	const notice = { text: 'Outside the margin.', variant: 'error', visibleWhen: { field: 'withinTolerance', value: false } }

	it('shows the notice when the record meets the condition', () => {
		expect(mountFacts({ fields: FIELDS, notice }).find('[data-testid="cn-facts-notice"]').exists()).toBe(true)
	})

	it('hides it when the record does not', () => {
		const w = mountFacts({ fields: FIELDS, notice }, { ...DIFF, withinTolerance: true })
		expect(w.find('[data-testid="cn-facts-notice"]').exists()).toBe(false)
	})
})

describe('CnFactsWidget: one input the actions send', () => {
	const content = {
		fields: FIELDS,
		input: { key: 'reason', label: 'Reason for rejection', placeholder: 'Needed to reject' },
		actions: [{ id: 'reject', label: 'Reject', type: 'api-call', url: '/apps/x/reject', payload: { diffId: '@source.id', reason: '@input.reason' } }],
	}

	it('draws a labelled field and hands the typed text to the action', async () => {
		const w = mountFacts(content)
		const field = w.find('[data-testid="cn-facts-input"]')
		expect(field.attributes('placeholder')).toBe('Needed to reject')
		expect(w.find(`label[for="${field.attributes('id')}"]`).text()).toBe('Reason for rejection')
		expect(w.findComponent({ name: 'CnActionButtons' }).props('actions')[0].payload).toEqual({ diffId: 'd-1', reason: '' })
		await field.setValue('Recount tomorrow')
		expect(w.findComponent({ name: 'CnActionButtons' }).props('actions')[0].payload).toEqual({ diffId: 'd-1', reason: 'Recount tomorrow' })
	})
})

describe('CnFactsWidget: an input with a condition', () => {
	it('is drawn only while the record meets it', () => {
		const content = { fields: FIELDS, input: { key: 'reason', label: 'Reason', visibleWhen: { field: 'status', value: 'pending' } } }
		expect(mountFacts(content).find('[data-testid="cn-facts-input"]').exists()).toBe(true)
		expect(mountFacts(content, { ...DIFF, status: 'approved' }).find('[data-testid="cn-facts-input"]').exists()).toBe(false)
	})
})

describe('CnFactsWidget: a source sorted on @self.created', () => {
	it('is read: the sort names a field, not a token', async () => {
		mockGet.mockResolvedValue({ data: { results: [DIFF], total: 1 } })
		const w = mount(CnFactsWidget, {
			propsData: {
				objectId: 'shift-1',
				content: {
					source: { register: 'pipelinq', schema: 'cashDiff', filter: { shift: '@objectId' }, sort: { field: '@self.created', dir: 'desc' } },
					fields: [{ path: 'actualAmount', label: 'Counted' }],
				},
			},
			stubs: { NcLoadingIcon: true },
		})
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][1].params).toEqual({ shift: 'shift-1', '_order[@self.created]': 'desc', _limit: 1 })
		expect(w.find('[data-testid="cn-fact-actualAmount"]').text()).toContain('399')
	})
})
