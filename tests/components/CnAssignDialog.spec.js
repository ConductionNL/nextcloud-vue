/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAssignDialog: hand a record to another user or team with a note and
 * switches, configured from the manifest. dossiq's case handover (board
 * DqOverdragen) is the first consumer; pipelinq tickets share it.
 *
 * @spec openspec/changes/assign-dialog/specs/assign-dialog/spec.md#requirement-a-manifest-configures-an-assign-dialog
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnAssignDialog from '../../src/components/CnAssignDialog/CnAssignDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'
import { searchNextcloudGroups, searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('../../src/utils/userAutocomplete.js', () => ({ searchNextcloudGroups: jest.fn(), searchNextcloudUsers: jest.fn() }))

const HANDOVER = {
	title: 'Hand this case to another team',
	eyebrow: 'Hand over · {identifier}',
	source: { url: '/apps/dossiq/api/case/@objectId/summary' },
	assignee: { kinds: ['group'], label: 'New team', currentPath: 'assignedGroupPublicName', currentHint: 'Now with {team}. The new team picks its own handler.', currentAs: 'team', hint: 'The new team picks its own handler.', allowTyped: true, field: 'team' },
	note: { label: 'Why it is moving', field: 'reason' },
	toggles: [{ field: 'doorzending', label: 'Tell the applicant, this is a doorzending (Awb 2:3)', note: 'Leave it off for a move inside the organisation.' }],
	confirm: { label: 'Hand it over', request: { url: '/apps/dossiq/api/case/@objectId/handover' } },
	doneText: 'The case is with its new team.',
}

const SearchSelect = {
	name: 'CnSearchSelect',
	props: ['modelValue', 'options', 'inputLabel', 'labelOutside', 'loading', 'placeholder'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="ss" />',
}

/**
 * Mount the dialog.
 *
 * @param {object} config The config.
 * @param {object} provide Extra provides.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The dialog.
 */
async function mountDialog(config = HANDOVER, provide = {}) {
	const w = mount(CnAssignDialog, {
		props: { config, objectId: 'z-82' },
		global: {
			provide,
			stubs: {
				CnSearchSelect: SearchSelect,
				CnDialog: { name: 'CnDialog', props: ['name', 'subtitle', 'eyebrow'], template: '<div class="dialog" :data-name="name" :data-eyebrow="eyebrow"><slot /><slot name="actions" /></div>' },
				NcTextArea: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<textarea :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
				NcCheckboxRadioSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
				CnIcon: true,
			},
		},
	})
	await flushPromises()
	return w
}

/**
 * Type a term and let the search run.
 *
 * @param {import('@vue/test-utils').VueWrapper} w The dialog.
 * @param {string} term The term.
 * @return {Promise<void>}
 */
async function type(w, term) {
	w.findComponent(SearchSelect).vm.$emit('search', term)
	jest.advanceTimersByTime(300)
	await flushPromises()
}

const confirmButton = (w) => w.find('[data-testid="cn-assign-dialog-confirm"]')

describe('CnAssignDialog', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		axios.get.mockReset()
		axios.post.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { identifier: '2026-0082', assignedGroupPublicName: 'Vergunningen' } })
		searchNextcloudGroups.mockResolvedValue([{ id: 'legal', label: 'Juridische zaken', subline: '' }])
		searchNextcloudUsers.mockResolvedValue([{ id: 'anouk', label: 'Anouk Visser', subline: '' }])
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('reads the record for the eyebrow and says who has it now', async () => {
		const w = await mountDialog()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/case/z-82/summary')
		expect(w.find('.dialog').attributes('data-eyebrow')).toBe('Hand over · 2026-0082')
		expect(w.text()).toContain('Now with Vergunningen. The new team picks its own handler.')
		expect(w.text().match(/picks its own handler/g)).toHaveLength(1)

		axios.get.mockResolvedValue({ data: { identifier: '2026-0083' } })
		const nobody = await mountDialog()
		expect(nobody.text()).toContain('The new team picks its own handler.')
		expect(nobody.text()).not.toContain('Now with')
	})

	/**
	 * @spec openspec/changes/assign-dialog-toggle-from-record/specs/assign-dialog-toggle-from-record/spec.md#requirement-an-assign-dialog-toggle-is-filled-from-the-record
	 */
	it('fills a toggle\'s label and note from the record (DqOverdragen)', async () => {
		axios.get.mockResolvedValue({ data: { identifier: '2026-0082', initiatorDisplayName: 'Sanne de Vries' } })
		const w = await mountDialog({ ...HANDOVER, toggles: [{ field: 'doorzending', label: 'Tell the applicant ({identifier})', note: '{initiatorDisplayName} then gets a message that the case moves.' }] })
		const toggle = w.find('[data-testid="cn-assign-dialog-toggle-doorzending"]')
		expect(toggle.text()).toContain('Tell the applicant (2026-0082)')
		expect(toggle.text()).toContain('Sanne de Vries then gets a message that the case moves.')
	})

	it('draws the assignee label above the field, not only for assistive technology (DqOverdragen "Nieuw team")', async () => {
		const w = await mountDialog()
		const select = w.findComponent(SearchSelect)
		expect(select.props('inputLabel')).toBe('New team')
		expect(select.props('labelOutside')).toBe(false)
		w.unmount()
	})

	it('shows a toggle\'s noteFallback when the record lacks a value its note names', async () => {
		axios.get.mockResolvedValue({ data: { identifier: '2026-0082' } })
		const w = await mountDialog({ ...HANDOVER, toggles: [{ field: 'doorzending', label: 'Tell the applicant', note: '{initiatorDisplayName} then gets a message.', noteFallback: 'The applicant then gets a message.' }] })
		expect(w.find('[data-testid="cn-assign-dialog-toggle-doorzending"]').text()).toContain('The applicant then gets a message.')
		w.unmount()
	})

	it('searches the configured kinds and offers what was typed when allowed', async () => {
		const w = await mountDialog()
		await type(w, 'Jur')
		expect(searchNextcloudGroups).toHaveBeenCalledWith('Jur', { limit: 20 })
		expect(searchNextcloudUsers).not.toHaveBeenCalled()
		expect(w.findComponent(SearchSelect).props('options').map((o) => [o.id, o.kind])).toEqual([['legal', 'group'], ['Jur', 'typed']])

		const people = await mountDialog({ ...HANDOVER, assignee: { kinds: ['user', 'group'] } })
		await type(people, 'Anouk')
		expect(people.findComponent(SearchSelect).props('options').map((o) => o.id)).toEqual(['legal', 'anouk'])
	})

	it('confirms only with an assignee and a note, then sends the choice and says done', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountDialog()
		await type(w, 'Jur')
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'legal')
		await flushPromises()
		expect(confirmButton(w).attributes('disabled')).toBeDefined()
		await w.find('textarea').setValue('Bezwaar hoort bij Juridische zaken')
		await w.find('[data-testid="cn-assign-dialog-toggle-doorzending"] input').setChecked(true)
		expect(confirmButton(w).attributes('disabled')).toBeUndefined()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/dossiq/api/case/z-82/handover', { team: 'legal', reason: 'Bezwaar hoort bij Juridische zaken', doorzending: true })
		expect(w.find('[data-testid="cn-assign-dialog-done"]').text()).toBe('The case is with its new team.')
		expect(w.emitted('done')[0][0]).toEqual({ team: 'legal', reason: 'Bezwaar hoort bij Juridische zaken', doorzending: true })
	})

	it('shows a refusal in the server\'s words and stays open', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'That team could not be found.' } } })
		const w = await mountDialog({ ...HANDOVER, note: false })
		await type(w, 'Jur')
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'Jur')
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1]).toEqual({ team: 'Jur', doorzending: false })
		expect(w.find('[data-testid="cn-assign-dialog-refusal"]').text()).toBe('That team could not be found.')
		expect(w.find('[data-testid="cn-assign-dialog-done"]').exists()).toBe(false)
	})

	it('dispatches a manifest action with the choice, and sends the kind when asked', async () => {
		const dispatch = jest.fn().mockResolvedValue()
		const w = await mountDialog({ assignee: { kinds: ['user'], kindField: 'assigneeType' }, note: { required: false }, confirm: { action: { type: 'handler', handler: 'reassign', args: ['t-1'] } } }, { cnDispatchAction: dispatch })
		await type(w, 'Anouk')
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'anouk')
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledWith({ type: 'handler', handler: 'reassign', args: ['t-1', { assignee: 'anouk', assigneeType: 'user', note: '' }] })
	})

	it('is a modal every app can open by name', () => {
		const { resolveModalEntry } = require('../../src/utils/builtInModals.js')
		expect(resolveModalEntry({}, 'CnAssignDialog')).toMatchObject({ kind: 'modal' })
	})

	it('takes the record id from the route when objectId is still a token', async () => {
		const w = mount(CnAssignDialog, {
			props: { config: HANDOVER, objectId: '@objectId' },
			global: { mocks: { $route: { params: { id: 'z-9' } } }, stubs: { CnSearchSelect: SearchSelect, CnDialog: { template: '<div><slot /><slot name="actions" /></div>' }, CnIcon: true } },
		})
		await flushPromises()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/case/z-9/summary')
		w.unmount()
	})
})
