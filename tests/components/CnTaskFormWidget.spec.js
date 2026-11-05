/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak "Vraag uit de flow": the question, a text area, a date and a choice,
 * a required field refused under it, the help line, "Opslaan als voorlopig"
 * and "Afronden", and a kept draft put back with a notice.
 *
 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md
 */
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnTaskFormWidget from '../../src/components/CnTaskFormWidget/CnTaskFormWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { CnTaskFormWidget as Exported } from '../../src/components/index.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const TASK = {
	uuid: 't-1',
	form: {
		kind: 'inline',
		description: 'Is de hoorzitting gehouden?',
		fields: [
			{ field: 'report', label: 'Verslag van de hoorzitting', required: true, widget: 'textarea', order: 1 },
			{ field: 'heldOn', label: 'Datum hoorzitting', type: 'date', order: 2 },
			{ field: 'advice', label: 'Advies van de commissie', options: [{ value: 'unknown', label: 'Nog niet bekend' }, { value: 'founded', label: 'Gegrond' }], order: 3 },
		],
	},
}

const CONTENT = {
	help: 'Opslaan als voorlopig slaat de verplichte velden over.',
	completeUrl: '/apps/dossiq/api/case-tasks/{id}/complete',
	draft: { url: '/apps/dossiq/api/case-tasks/{id}/draft', method: 'put' },
	draftLabel: 'Opslaan als voorlopig',
	completeLabel: 'Afronden',
}

const stubs = {
	CnCardNotices: { name: 'CnCardNotices', props: ['notices'], template: '<div class="notices"><p v-for="n in notices" :key="n.id" :class="`notice-${n.id}`">{{ n.text }}</p></div>' },
	NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
	NcTextArea: { name: 'NcTextArea', props: ['modelValue', 'helperText', 'error'], template: '<textarea class="area" />' },
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'type', 'helperText'], template: '<input class="text" :data-type="type" />' },
	NcSelect: { name: 'NcSelect', props: ['options', 'inputLabel'], template: '<div class="select" />' },
}

/**
 * @param {object} content The widget content.
 * @return {object} The mounted widget.
 */
function mountWidget(content = CONTENT) {
	return mount(CnTaskFormWidget, { props: { content, objectData: TASK }, global: { stubs } })
}

beforeEach(() => {
	axios.get.mockReset().mockRejectedValue({ response: { status: 404 } })
	axios.post.mockReset().mockResolvedValue({ data: {} })
	axios.put.mockReset().mockResolvedValue({ data: {} })
	emit.mockReset()
})

describe('CnTaskFormWidget', () => {
	it('is registered as task-form and exported', () => {
		expect(getWidgetTypeEntry('task-form').renderer).toBe(CnTaskFormWidget)
		expect(Exported).toBe(CnTaskFormWidget)
	})

	it('draws the question, a text area, a date, a choice and the help line', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.find('[data-testid="cn-task-form-widget-description"]').text()).toBe('Is de hoorzitting gehouden?')
		expect(w.find('.area').exists()).toBe(true)
		expect(w.find('input.text').attributes('data-type')).toBe('date')
		expect(w.findComponent({ name: 'NcSelect' }).props('options').map((o) => o.label)).toEqual(['Nog niet bekend', 'Gegrond'])
		expect(w.find('[data-testid="cn-task-form-widget-help"]').text()).toContain('verplichte velden')
	})

	it('refuses Complete under an empty required field and sends nothing', async () => {
		const w = mountWidget()
		await flushPromises()
		await w.find('[data-testid="cn-task-form-widget-complete"]').trigger('click')
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findComponent({ name: 'NcTextArea' }).props('helperText')).toBe('Completing was refused: fill in Verslag van de hoorzitting.')
	})

	it('completes with the answers through the app route and refreshes the page', async () => {
		const w = mountWidget()
		await flushPromises()
		w.findComponent({ name: 'NcTextArea' }).vm.$emit('update:modelValue', 'Gehouden')
		await w.find('[data-testid="cn-task-form-widget-complete"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case-tasks/t-1/complete', { outcome: 'done', data: { report: 'Gehouden' } })
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', expect.objectContaining({ id: 't-1' }))
	})

	it('shows a refusal in the server\'s words in the card', async () => {
		axios.post.mockRejectedValue({ response: { status: 409, data: { message: 'De stap is al afgerond.' } } })
		const w = mountWidget()
		await flushPromises()
		w.findComponent({ name: 'NcTextArea' }).vm.$emit('update:modelValue', 'x')
		await w.find('[data-testid="cn-task-form-widget-complete"]').trigger('click')
		await flushPromises()
		expect(w.find('.notice-refused').text()).toBe('De stap is al afgerond.')
	})

	it('saves as provisional with the required field still empty', async () => {
		const w = mountWidget()
		await flushPromises()
		await w.find('[data-testid="cn-task-form-widget-draft"]').trigger('click')
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith('/apps/dossiq/api/case-tasks/t-1/draft', { values: {} })
		expect(w.find('.notice-draft-saved').exists()).toBe(true)
	})

	it('puts a kept draft back with a notice of how much came back', async () => {
		axios.get.mockReset().mockResolvedValue({ data: { values: { report: 'Half', advice: 'founded' }, savedAt: '2026-10-06T16:40:00' } })
		const w = mountWidget()
		await flushPromises()
		expect(w.find('.notice-draft-restored').text()).toMatch(/^Unsaved input restored: 2 of 3 fields from your previous visit, .+16:40\. Check them and save\.$/)
		expect(w.findComponent({ name: 'NcTextArea' }).props('modelValue')).toBe('Half')
	})

	it('has no draft button without draft (control)', async () => {
		const w = mountWidget({ completeLabel: 'Afronden' })
		await flushPromises()
		expect(w.find('[data-testid="cn-task-form-widget-draft"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})
})
