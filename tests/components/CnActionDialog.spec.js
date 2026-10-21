/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionDialog: the generic "summary, checklist, reason, confirm" dialog,
 * configured from the manifest. dossiq's archive dialog (board DqArchiveren)
 * is the first consumer: the case, what its case type keeps, a readiness
 * checklist from an endpoint, a reason, a read-only note and Archive it.
 *
 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const ARCHIVE = {
	title: 'Archive this case',
	subtitle: 'The case goes to the archive and is only read afterwards.',
	summary: { source: { url: '/apps/dossiq/api/case/@objectId/summary' }, title: '{title}', meta: '{identifier} · {initiatorDisplayName}', badge: '{resultPublicLabel}' },
	facts: [{ title: 'Retention under the case type', items: [{ label: 'Archive nomination', value: '{archiveNomination}' }, { label: 'Destruction date', value: '{archiveActionDate}' }] }],
	checklist: {
		title: 'Ready to archive',
		source: { url: '/apps/dossiq/api/case/@objectId/archive/readiness' },
		itemsPath: 'checklist',
		labels: {
			ended: { label: 'Case ended', unmetDetail: 'Finish or abort the case first' },
			documents: { label: 'Documents final', detail: '{count} of {total} final' },
		},
		required: ['ended'],
	},
	permission: { source: { url: '/apps/dossiq/api/case/@objectId/acts' }, allowedPath: 'archive.allowed', reasonPath: 'archive.reason' },
	reason: { label: 'Reason', hint: 'Goes into the history of the case.' },
	note: { variant: 'info', title: 'Read only afterwards', text: 'Once archived, the case can no longer be changed.' },
	confirm: { label: 'Archive it', icon: 'ArchiveOutline', request: { method: 'POST', url: '/apps/dossiq/api/case/@objectId/archive' } },
	doneText: 'The case is archived.',
}

const CASE = { title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', initiatorDisplayName: 'Sanne de Vries', resultPublicLabel: 'Verleend', archiveNomination: 'Destroy', archiveActionDate: '' }

/**
 * Answer the dialog's reads.
 *
 * @param {object} overrides Bodies by url end.
 */
function answer(overrides = {}) {
	const bodies = {
		summary: CASE,
		readiness: { checklist: [{ id: 'ended', met: true }, { id: 'documents', met: false, count: 4, total: 7 }, { id: 'openTasks', met: null, label: 'Open tasks' }] },
		acts: { archive: { allowed: true } },
		...overrides,
	}
	axios.get.mockImplementation((url) => Promise.resolve({ data: bodies[url.split('/').pop()] }))
}

/**
 * Mount the dialog.
 *
 * @param {object} config The config.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The dialog.
 */
async function mountDialog(config = ARCHIVE) {
	const w = mount(CnActionDialog, {
		props: { config, objectId: 'z-82' },
		global: { stubs: { CnDialog: { name: 'CnDialog', props: ['name', 'subtitle', 'eyebrow'], template: '<div class="dialog" :data-name="name"><slot /><slot name="actions" /></div>' }, NcTextArea: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<textarea :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' }, CnIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnActionDialog', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		invalidateEndpointSourceCache()
	})

	it('draws the summary, the facts and the checklist read from the endpoints', async () => {
		answer()
		const w = await mountDialog()
		expect(w.find('.dialog').attributes('data-name')).toBe('Archive this case')
		const summary = w.find('[data-testid="cn-action-dialog-summary"]')
		expect(summary.text()).toContain('Verlichting fietspad Lindelaan')
		expect(summary.text()).toContain('2026-0082 · Sanne de Vries')
		expect(summary.text()).toContain('Verleend')
		expect(w.find('[data-testid="cn-action-dialog-facts"]').text()).toContain('Not set')
		expect(w.find('[data-testid="cn-action-dialog-check-ended"]').attributes('data-met')).toBe('true')
		expect(w.find('[data-testid="cn-action-dialog-check-documents"]').text()).toContain('4 of 7 final')
		expect(w.find('[data-testid="cn-action-dialog-check-openTasks"]').text()).toContain('Could not be read')
		expect(w.find('[data-testid="cn-action-dialog-note"]').exists()).toBe(true)
		expect(axios.get.mock.calls.map((c) => c[0])).toContain('/nc/apps/dossiq/api/case/z-82/archive/readiness')
	})

	it('confirms only with the required items met and a reason, then posts it and says done', async () => {
		answer()
		const w = await mountDialog()
		const confirm = () => w.find('[data-testid="cn-action-dialog-confirm"]')
		expect(confirm().attributes('disabled')).toBeDefined()
		await w.find('[data-testid="cn-action-dialog-reason"]').setValue('Done and decided')
		expect(confirm().attributes('disabled')).toBeUndefined()
		axios.post.mockResolvedValue({ data: {} })
		await confirm().trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/dossiq/api/case/z-82/archive', { reason: 'Done and decided' })
		expect(w.find('[data-testid="cn-action-dialog-done"]').text()).toBe('The case is archived.')
		expect(w.emitted('done')[0][0]).toEqual({ reason: 'Done and decided' })
	})

	it('stays closed while a required item is not met, or the reader may not act', async () => {
		answer({ readiness: { checklist: [{ id: 'ended', met: false }] } })
		let w = await mountDialog()
		await w.find('[data-testid="cn-action-dialog-reason"]').setValue('x')
		expect(w.find('[data-testid="cn-action-dialog-confirm"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-action-dialog-check-ended"]').text()).toContain('Finish or abort the case first')

		invalidateEndpointSourceCache()
		answer({ acts: { archive: { allowed: false, reason: 'Only a coordinator may archive.' } } })
		w = await mountDialog()
		await w.find('[data-testid="cn-action-dialog-reason"]').setValue('x')
		expect(w.find('[data-testid="cn-action-dialog-confirm"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-action-dialog-refusal"]').text()).toBe('Only a coordinator may archive.')
	})

	it('shows the server refusal when the action fails', async () => {
		answer()
		const w = await mountDialog()
		await w.find('[data-testid="cn-action-dialog-reason"]').setValue('x')
		axios.post.mockRejectedValue({ response: { data: { message: 'The case is still open.' } } })
		await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-refusal"]').text()).toBe('The case is still open.')
		expect(w.find('[data-testid="cn-action-dialog-done"]').exists()).toBe(false)
	})

	it('dispatches a manifest action with the reason instead of posting', async () => {
		answer()
		const dispatch = jest.fn(async () => true)
		const config = { title: 'Close the case', reason: { required: true }, confirm: { label: 'Close it', action: { type: 'handler', handler: 'closeCase', args: ['z-82'] } } }
		const w = mount(CnActionDialog, {
			props: { config, objectId: 'z-82' },
			global: { provide: { cnDispatchAction: dispatch }, stubs: { CnDialog: { template: '<div><slot /><slot name="actions" /></div>' }, NcTextArea: { props: ['modelValue'], emits: ['update:modelValue'], template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' }, CnIcon: true } },
		})
		await flushPromises()
		await w.find('textarea').setValue('No longer needed')
		await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledWith({ type: 'handler', handler: 'closeCase', args: ['z-82', { reason: 'No longer needed' }] })
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('is a modal every app can open by name, the app entry winning', () => {
		const { dispatchAction } = require('../../src/utils/actionsDispatcher.js')
		const { resolveModalEntry } = require('../../src/utils/builtInModals.js')
		const openModal = jest.fn()
		dispatchAction({ type: 'open-modal', target: 'CnActionDialog', props: { config: ARCHIVE, objectId: 'z-82' } }, { registry: {}, openModal })
		expect(openModal).toHaveBeenCalledWith('CnActionDialog', { config: ARCHIVE, objectId: 'z-82' })
		expect(resolveModalEntry({}, 'CnActionDialog')).toMatchObject({ kind: 'modal' })
		const own = { kind: 'modal', component: {} }
		expect(resolveModalEntry({ CnActionDialog: own }, 'CnActionDialog')).toBe(own)
		expect(resolveModalEntry({}, 'Nothing')).toBeNull()
	})
})

describe('CnActionDialog fields and a permission read from a list', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		invalidateEndpointSourceCache()
	})

	it('reads the matching entry of a list for the permission and fills the eyebrow from the record', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({
			data: url.endsWith('/acts')
				? { acts: [{ act: 'reopen', allowed: true }, { act: 'archive', allowed: false, reason: 'Only an archivist may archive.' }] }
				: CASE,
		}))
		const w = await mountDialog({
			...ARCHIVE,
			eyebrow: 'Close off · {identifier}',
			checklist: undefined,
			permission: { source: { url: '/apps/dossiq/api/case/@objectId/acts' }, listPath: 'acts', match: { act: 'archive' }, allowedPath: 'allowed', reasonPath: 'reason' },
		})
		expect(w.findComponent({ name: 'CnDialog' }).props('eyebrow')).toBe('Close off · 2026-0082')
		expect(w.find('[data-testid="cn-action-dialog-refusal"]').text()).toBe('Only an archivist may archive.')
		await w.find('textarea').setValue('Closed')
		expect(w.find('[data-testid="cn-action-dialog-confirm"]').attributes('disabled')).toBeDefined()
	})

	it('asks its fields, lets an option fill an empty one, and sends them', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const PLAN = {
			title: 'Plan an item',
			fields: [
				{ field: 'template', type: 'select', required: false, options: [{ value: 'call-back', label: 'Call someone back', fills: { title: 'Call someone back' } }] },
				{ field: 'title', label: 'What is it' },
				{ field: 'startsAt', type: 'datetime', label: 'When' },
			],
			confirm: { label: 'Schedule it', request: { url: '/apps/dossiq/api/personal-queue/planned-items' } },
		}
		const w = mount(CnActionDialog, {
			props: { config: PLAN },
			global: { stubs: { CnDialog: { name: 'CnDialog', props: ['name', 'eyebrow'], template: '<div><slot /><slot name="actions" /></div>' }, NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<div class="select" />' }, NcTextField: { name: 'NcTextField', props: ['modelValue', 'label', 'type'], emits: ['update:modelValue'], template: '<input :type="type" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' }, CnIcon: true } },
		})
		await flushPromises()
		const confirm = () => w.find('[data-testid="cn-action-dialog-confirm"]')
		expect(confirm().attributes('disabled')).toBeDefined()
		w.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { id: 'call-back', fills: { title: 'Call someone back' } })
		await flushPromises()
		expect(w.find('input[aria-label="What is it"]').element.value).toBe('Call someone back')
		expect(w.find('input[aria-label="When"]').attributes('type')).toBe('datetime-local')
		await w.find('input[aria-label="When"]').setValue('2026-10-21T09:00')
		await confirm().trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/dossiq/api/personal-queue/planned-items', { template: 'call-back', title: 'Call someone back', startsAt: '2026-10-21T09:00' })
		expect(w.emitted('done')[0][0]).toEqual({ template: 'call-back', title: 'Call someone back', startsAt: '2026-10-21T09:00', reason: '' })
	})
})

describe('CnActionDialog checkbox field', () => {
	/**
	 * @spec openspec/changes/action-dialog-checkbox-field/specs/action-dialog-checkbox-field/spec.md#requirement-an-action-dialog-field-can-be-a-checkbox
	 */
	it('draws a checkbox with a label filled from the record, checked by default, and sends it as a boolean', async () => {
		axios.post.mockReset()
		axios.post.mockResolvedValue({ data: {} })
		answer()
		const config = {
			...ARCHIVE,
			fields: [{ field: 'notifyRequester', type: 'checkbox', label: 'Let {initiatorDisplayName} know the case is closed', hint: 'A message in the portal', default: true }],
		}
		const w = mount(CnActionDialog, {
			props: { config, objectId: 'z-82' },
			global: { stubs: {
				CnDialog: { name: 'CnDialog', props: ['name', 'subtitle', 'eyebrow'], template: '<div><slot /><slot name="actions" /></div>' },
				NcTextArea: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
				NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue'], emits: ['update:modelValue'], template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
				CnIcon: true,
			} },
		})
		await flushPromises()
		const box = w.find('[data-testid="cn-action-dialog-field-notifyRequester"]')
		expect(box.text()).toContain('Let Sanne de Vries know the case is closed')
		expect(box.text()).toContain('A message in the portal')
		expect(box.find('input').element.checked).toBe(true)
		await w.find('textarea').setValue('Done')
		await box.find('input').setValue(false)
		expect(w.find('[data-testid="cn-action-dialog-confirm"]').attributes('disabled')).toBeUndefined()
		await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].notifyRequester).toBe(false)
	})
})

describe('CnActionDialog opened with an unresolved token', () => {
	it('takes the record id from the route, and the dispatcher resolves a prop token when it can', async () => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: CASE })
		mount(CnActionDialog, {
			props: { config: { summary: { source: { url: '/apps/dossiq/api/case/@objectId/summary' }, title: '{title}' } }, objectId: '@objectId' },
			global: { mocks: { $route: { params: { id: 'z-9' } } }, stubs: { CnDialog: { template: '<div><slot /><slot name="actions" /></div>' }, CnIcon: true } },
		})
		await flushPromises()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/case/z-9/summary')

		const { dispatchAction } = require('../../src/utils/actionsDispatcher.js')
		const openModal = jest.fn()
		dispatchAction({ type: 'open-modal', target: 'CnActionDialog', props: { objectId: '@objectId', config: { title: 'Archive' } } }, { registry: {}, openModal, tokenCtx: { objectId: 'z-82' } })
		expect(openModal).toHaveBeenCalledWith('CnActionDialog', { objectId: 'z-82', config: { title: 'Archive' } })
	})
})
