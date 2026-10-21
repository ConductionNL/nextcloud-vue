/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAttentionFlagWidget — a person's flag, the system's markers and the
 * organisation's assessment on one strip, kept apart. Ported from dossiq's
 * CaseAttentionPanel specs (caseAttentionFlag, caseTabMarkers).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-carry-an-attention-flag
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockEmit = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) },
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: (...a) => mockEmit(...a), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnAttentionFlagWidget/index.js'

const CnAttentionFlagWidget = require('../../src/components/CnAttentionFlagWidget/CnAttentionFlagWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const CONTENT = {
	endpoint: '/apps/x/api/item/@objectId/attention',
	markersPath: 'attentionMarkers',
	panelLabels: { 'item-work': 'Work' },
	assessment: { path: 'riskAssessment', reviewDateField: 'reviewDate' },
}

const stubs = {
	NcTextField: {
		props: ['modelValue', 'label'],
		emits: ['update:modelValue'],
		template: '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
	},
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
}

async function mountFlag(answer, record = { id: 'r-1' }, content = CONTENT) {
	mockGet.mockResolvedValue({ data: answer })
	const wrapper = mount(CnAttentionFlagWidget, {
		props: { content, objectId: 'r-1', objectData: record, register: 'x', schema: 'item' },
		global: { stubs },
	})
	await flush()
	await flush()
	return wrapper
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockEmit.mockReset()
})

describe('CnAttentionFlagWidget', () => {
	it('registers the attention-flag type for detail pages', () => {
		expect(getWidgetTypeEntry('attention-flag').renderer).toBe(CnAttentionFlagWidget)
	})

	it('reads the flag from the record\'s endpoint', async () => {
		await mountFlag({ raised: false, flag: {}, history: [] })
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/item/r-1/attention')
	})

	it('raises with the reason that was written, and says the record changed', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [] })
		mockPost.mockResolvedValue({ data: { raised: true, flag: { reason: 'Neighbour complaint' }, history: [{ act: 'raised', reason: 'Neighbour complaint', moment: '1' }] } })
		await wrapper.find('input').setValue('Neighbour complaint')
		await wrapper.find('[data-testid="cn-attention-flag-raise"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/x/api/item/r-1/attention/raise', { reason: 'Neighbour complaint' })
		expect(wrapper.find('[data-testid="cn-attention-flag-raised"]').text()).toContain('Neighbour complaint')
		expect(wrapper.emitted('object-changed')).toBeTruthy()
		expect(mockEmit).toHaveBeenCalledWith('cn:page:refresh')
	})

	it('offers clearing on a flagged record, with its own reason', async () => {
		const wrapper = await mountFlag({ raised: true, flag: { reason: 'x' }, history: [] })
		mockPost.mockResolvedValue({ data: { raised: false, flag: {}, history: [] } })
		await wrapper.find('input').setValue('Handled')
		await wrapper.find('[data-testid="cn-attention-flag-clear"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/x/api/item/r-1/attention/clear', { reason: 'Handled' })
	})

	it('will not send an act with nothing written', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [] })
		const button = wrapper.find('[data-testid="cn-attention-flag-raise"]')
		expect(button.attributes('disabled')).toBeDefined()
		await button.trigger('click')
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('shows the server refusal as written', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [] })
		mockPost.mockRejectedValue({ response: { data: { error: 'Only a handler may flag this.' } } })
		await wrapper.find('input').setValue('Why')
		await wrapper.find('[data-testid="cn-attention-flag-raise"]').trigger('click')
		await flush()
		const refusal = wrapper.find('[data-testid="cn-attention-flag-refusal"]')
		expect(refusal.text()).toBe('Only a handler may flag this.')
		expect(refusal.attributes('role')).toBe('alert')
	})

	it('shows every raising and clearing', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [{ act: 'raised', reason: 'a', moment: '1' }, { act: 'cleared', reason: 'b', moment: '2' }] })
		const rows = wrapper.findAll('[data-testid="cn-attention-flag-history"] li')
		expect(rows.map((r) => r.attributes('data-act'))).toEqual(['raised', 'cleared'])
	})

	it('draws nothing where the endpoint does not exist', async () => {
		mockGet.mockRejectedValue({ response: { status: 404 } })
		const wrapper = mount(CnAttentionFlagWidget, { props: { content: CONTENT, objectId: 'r-1', objectData: {} }, global: { stubs } })
		await flush()
		await flush()
		expect(wrapper.find('[data-testid="cn-attention-flag"]').exists()).toBe(false)
	})

	it('names the panel a marker points at, else its id, and offers no dismissal', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [] }, {
			id: 'r-1',
			attentionMarkers: [
				{ marker: 'advice-overdue', tab: 'item-work', reason: 'Advice is overdue' },
				{ marker: 'scan-failed', tab: 'item-unknown', reason: 'Virus scan failed' },
			],
		})
		expect(wrapper.find('[data-testid="cn-attention-flag-marker-advice-overdue"]').text()).toContain('Work')
		expect(wrapper.find('[data-testid="cn-attention-flag-marker-scan-failed"]').text()).toContain('item-unknown')
		expect(wrapper.findAll('[data-testid="cn-attention-flag-markers"] button')).toHaveLength(0)
	})

	it('draws the assessment for a reader who may see it, and nothing where it was filtered out', async () => {
		const seen = await mountFlag({ raised: false, flag: {}, history: [] }, { id: 'r-1', riskAssessment: { level: 'high', ground: 'Earlier threats', reviewDate: '2099-01-01' } })
		expect(seen.find('[data-testid="cn-attention-flag-assessment"]').text()).toContain('High')
		expect(seen.find('[data-testid="cn-attention-flag-review-due"]').exists()).toBe(false)
		const hidden = await mountFlag({ raised: false, flag: {}, history: [] }, { id: 'r-1' })
		expect(hidden.find('[data-testid="cn-attention-flag-assessment"]').exists()).toBe(false)
	})

	it('says an assessment past its review date is due for review', async () => {
		const wrapper = await mountFlag({ raised: false, flag: {}, history: [] }, { id: 'r-1', riskAssessment: { level: 'low', reviewDate: '2020-01-01' } })
		expect(wrapper.find('[data-testid="cn-attention-flag-review-due"]').exists()).toBe(true)
	})
})
