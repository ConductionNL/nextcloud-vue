/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action dialog draws a board's choice rows, plain checkbox and spacing,
 * names the chosen entry in its done text and body, and can end with a toast
 * and close rather than a done text in the dialog.
 *
 * @spec openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md
 */
import axios from '@nextcloud/axios'
import { showSuccess } from '@nextcloud/dialogs'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const stubs = {
	CnDialog: { name: 'CnDialog', template: '<div><slot /><slot name="actions" /></div>' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], emits: ['update:modelValue', 'search'], template: '<div class="select" />' },
	NcTextField: true,
	NcTextArea: true,
	NcNoteCard: { name: 'NcNoteCard', template: '<div class="note"><slot /></div>' },
	NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue'], emits: ['update:modelValue'], template: '<label class="check"><slot /></label>' },
	NcButton: { name: 'NcButton', props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	CnChoiceCards: { name: 'CnChoiceCards', props: ['modelValue', 'options', 'label', 'layout', 'columns', 'hideLabel'], emits: ['update:modelValue'], template: '<div class="cards" />' },
	CnIcon: true,
}

const PARTNERS = { organisations: [{ id: 7, name: 'Utrecht', domain: 'utrecht.nl' }] }

const SHARE = {
	gap: 16,
	closeOnDone: true,
	fields: [
		{ field: 'mode', type: 'cards', layout: 'rows', columns: 2, hideLabel: true, default: 'share', options: [{ value: 'share', label: 'Share' }] },
		{ field: 'organisation', type: 'select', optionsSource: { url: '/apps/x/organisations', responsePath: 'organisations' } },
		{ field: 'limit', type: 'checkbox', look: 'plain', label: 'Share only some fields' },
	],
	confirm: {
		errorText: 'The case could not be shared.',
		requestsBy: { field: 'mode', cases: { share: {
			url: '/apps/x/shares',
			fieldsInBody: false,
			doneText: 'The case is shared with {chosen.organisation.name}.',
			body: { caseId: '{objectId}', partnerId: '{fields.organisation}' },
		} } },
	},
}

/**
 * Mount the dialog on a config.
 *
 * @param {object} config The config.
 * @return {object} The wrapper.
 */
function mountDialog(config) {
	return mount(CnActionDialog, { props: { objectId: 'c1', config }, global: { stubs } })
}

/**
 * Choose the partner and confirm.
 *
 * @param {object} w The wrapper.
 * @return {Promise<void>}
 */
async function chooseAndConfirm(w) {
	w.find('[data-testid="cn-action-dialog-field-organisation"]').findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { id: '7' })
	await flushPromises()
	await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
	await flushPromises()
}

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockReset()
	axios.post.mockReset()
	showSuccess.mockReset()
	axios.get.mockResolvedValue({ data: PARTNERS })
})

describe('CnActionDialog board look', () => {
	it('passes rows, columns and a hidden label to the choice cards', async () => {
		const w = mountDialog(SHARE)
		await flushPromises()
		const cards = w.findComponent({ name: 'CnChoiceCards' })
		expect(cards.props('layout')).toBe('rows')
		expect(cards.props('columns')).toBe(2)
		expect(cards.props('hideLabel')).toBe(true)
	})

	it('draws a plain checkbox and sets the room between the parts', async () => {
		const w = mountDialog(SHARE)
		await flushPromises()
		expect(w.find('.cn-action-dialog__checkbox--plain').exists()).toBe(true)
		expect(w.find('.cn-action-dialog').attributes('style')).toContain('gap: 16px')
	})

	it('draws as before without the new keys', async () => {
		const w = mountDialog({ fields: [{ field: 'mode', type: 'cards', options: [] }, { field: 'tell', type: 'checkbox' }] })
		await flushPromises()
		expect(w.findComponent({ name: 'CnChoiceCards' }).props('layout')).toBe('cards')
		expect(w.find('.cn-action-dialog__checkbox--plain').exists()).toBe(false)
		expect(w.find('.cn-action-dialog').attributes('style')).toBeUndefined()
	})
})

describe('CnActionDialog outcome', () => {
	it('sends the record id, toasts the chosen entry and closes', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog(SHARE)
		await flushPromises()
		await chooseAndConfirm(w)
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/x/shares', { caseId: 'c1', partnerId: '7' })
		expect(showSuccess).toHaveBeenCalledWith('The case is shared with Utrecht.')
		expect(w.emitted('close')).toHaveLength(1)
		expect(w.find('[data-testid="cn-action-dialog-done"]').exists()).toBe(false)
	})

	it('shows the filled done text in the dialog without closeOnDone', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog({ ...SHARE, closeOnDone: false })
		await flushPromises()
		await chooseAndConfirm(w)
		expect(w.find('[data-testid="cn-action-dialog-done"]').text()).toBe('The case is shared with Utrecht.')
		expect(showSuccess).not.toHaveBeenCalled()
		expect(w.emitted('close')).toBeUndefined()
	})

	it('words a failure the server does not, with errorText', async () => {
		axios.post.mockRejectedValue({ response: { data: {} } })
		const w = mountDialog(SHARE)
		await flushPromises()
		await chooseAndConfirm(w)
		expect(w.find('[data-testid="cn-action-dialog-refusal"]').text()).toBe('The case could not be shared.')
		expect(w.emitted('close')).toBeUndefined()
	})

	it('keeps the server\'s own words over errorText', async () => {
		axios.post.mockRejectedValue({ response: { data: { error: 'No consent for this partner.' } } })
		const w = mountDialog(SHARE)
		await flushPromises()
		await chooseAndConfirm(w)
		expect(w.find('[data-testid="cn-action-dialog-refusal"]').text()).toBe('No consent for this partner.')
	})
})
