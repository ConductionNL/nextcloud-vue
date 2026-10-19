/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDecisionListWidget: the `decision-list` widget, a worklist of per-row
 * decisions (dossiq's MyArchivalReviews on DqMijnWerk; hermiq, learniq and
 * integriq approvals).
 *
 * @spec openspec/changes/decision-list-widget/specs/decision-list-widget/spec.md#requirement-a-worklist-of-per-row-decisions
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnDecisionListWidget from '../../src/components/CnDecisionListWidget/CnDecisionListWidget.vue'
import { BUILT_IN_WIDGETS } from '../../src/components/CnWidgetGrid/builtInWidgets.js'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))

const REVIEWS = {
	source: { url: '/apps/openregister/api/archival/reviews/pending' },
	itemsPath: 'results',
	idField: 'entryId',
	title: '{title}',
	meta: 'Disposal date: {archiefactiedatum}',
	answers: [
		{ value: 'destroy', label: 'Destroy' },
		{ value: 'retain', label: 'Retain', fields: [{ field: 'newArchiefactiedatum', type: 'date', label: 'New disposal date' }] },
		{ value: 'transfer', label: 'Transfer' },
	],
	reason: { label: 'Why?' },
	submit: { request: { url: '/apps/openregister/api/archival/destruction-lists/{listId}/entries/{entryId}/decision' } },
	emptyText: 'You hold no archival decisions right now.',
}

const ENTRIES = [
	{ entryId: 'e-1', listId: 'l-1', title: 'Zaak 2019-0012', archiefactiedatum: '2026-11-01' },
	{ entryId: 'e-2', listId: 'l-1', title: 'Zaak 2019-0013', archiefactiedatum: '2026-11-02' },
]

const STUBS = {
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel'], emits: ['update:modelValue'], template: '<div class="select" />' },
	NcTextField: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
	NcDateTimePickerNative: { name: 'NcDateTimePickerNative', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<div class="date" />' },
	NcEmptyContent: { props: ['name', 'description'], template: '<div class="empty-content">{{ name }} {{ description }}<slot name="action" /></div>' },
	NcLoadingIcon: true,
}

/**
 * Mount the widget and let it read.
 *
 * @param {object} content The config.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountList(content = REVIEWS) {
	const w = mount(CnDecisionListWidget, { props: { content }, global: { stubs: STUBS } })
	await flushPromises()
	return w
}

/**
 * Pick an answer on a row.
 *
 * @param {import('@vue/test-utils').VueWrapper} w The widget.
 * @param {string} id The row id.
 * @param {string} value The answer.
 * @return {Promise<void>}
 */
async function pick(w, id, value) {
	w.find(`[data-testid="cn-decision-list-row-${id}"]`).findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { id: value })
	await flushPromises()
}

const submitButton = (w, id) => w.find(`[data-testid="cn-decision-list-submit-${id}"]`)

describe('CnDecisionListWidget', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { results: ENTRIES } })
	})

	it('is the decision-list built-in widget and lists the rows with title and meta', async () => {
		expect(BUILT_IN_WIDGETS['decision-list']).toBe(CnDecisionListWidget)
		const w = await mountList()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/openregister/api/archival/reviews/pending')
		const row = w.find('[data-testid="cn-decision-list-row-e-1"]')
		expect(row.text()).toContain('Zaak 2019-0012')
		expect(row.text()).toContain('Disposal date: 2026-11-01')
		expect(row.findComponent({ name: 'NcSelect' }).props('options').map((o) => o.label)).toEqual(['Destroy', 'Retain', 'Transfer'])
	})

	it('asks the answer\'s own fields, and sends only a complete decision, then drops the row', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountList()
		await pick(w, 'e-1', 'retain')
		const row = () => w.find('[data-testid="cn-decision-list-row-e-1"]')
		await row().find('input').setValue('Still in use by the court')
		expect(row().findComponent({ name: 'NcDateTimePickerNative' }).exists()).toBe(true)
		expect(submitButton(w, 'e-1').attributes('disabled')).toBeDefined()
		row().findComponent({ name: 'NcDateTimePickerNative' }).vm.$emit('update:modelValue', new Date(2031, 0, 15))
		await flushPromises()
		expect(submitButton(w, 'e-1').attributes('disabled')).toBeUndefined()
		await submitButton(w, 'e-1').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/archival/destruction-lists/l-1/entries/e-1/decision', { answer: 'retain', reason: 'Still in use by the court', newArchiefactiedatum: '2031-01-15' })
		expect(w.find('[data-testid="cn-decision-list-row-e-1"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-decision-list-row-e-2"]').exists()).toBe(true)
		expect(w.emitted('decided')[0][0].id).toBe('e-1')
	})

	it('keeps a refused row with the server\'s words', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'This list is already closed.' } } })
		const w = await mountList()
		await pick(w, 'e-2', 'destroy')
		await w.find('[data-testid="cn-decision-list-row-e-2"] input').setValue('Term passed')
		await submitButton(w, 'e-2').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-decision-list-row-e-2"]').text()).toContain('This list is already closed.')
	})

	it('tells empty from broken, and retries', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const empty = await mountList()
		expect(empty.find('[data-testid="cn-decision-list-empty"]').text()).toBe('You hold no archival decisions right now.')

		invalidateEndpointSourceCache()
		axios.get.mockRejectedValueOnce(new Error('Network down'))
		const broken = await mountList()
		expect(broken.find('[data-testid="cn-decision-list-error"]').text()).toContain('Network down')
		axios.get.mockResolvedValue({ data: { results: ENTRIES } })
		await broken.find('[data-testid="cn-decision-list-retry"]').trigger('click')
		await flushPromises()
		expect(broken.findAll('.cn-decision-list__row')).toHaveLength(2)
	})

	it('drops the reason when configured off', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountList({ ...REVIEWS, reason: false, answerField: 'verdict' })
		await pick(w, 'e-1', 'transfer')
		await submitButton(w, 'e-1').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1]).toEqual({ verdict: 'transfer' })
	})
})
