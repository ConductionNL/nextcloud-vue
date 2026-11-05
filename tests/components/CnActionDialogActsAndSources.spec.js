/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action dialog posts each act to its own endpoint, shows a field only for
 * one act, reads select options from an endpoint, sends "ticked means shared"
 * as the items left out, and ticks items in columns that exclude each other.
 *
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const stubs = {
	CnDialog: { name: 'CnDialog', template: '<div><slot /><slot name="actions" /></div>' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'filterable', 'inputLabel'], emits: ['update:modelValue', 'search'], template: '<div class="select" />' },
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input class="text">' },
	NcTextArea: true,
	NcNoteCard: { name: 'NcNoteCard', template: '<div class="note"><slot /></div>' },
	NcCheckboxRadioSwitch: {
		name: 'NcCheckboxRadioSwitch',
		props: ['modelValue', 'type', 'ariaLabel'],
		emits: ['update:modelValue'],
		template: '<label class="check" :data-on="String(modelValue)" :aria-label="ariaLabel"><slot /></label>',
	},
	NcButton: {
		name: 'NcButton',
		props: ['disabled'],
		emits: ['click'],
		template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	CnChoiceCards: { name: 'CnChoiceCards', props: ['modelValue', 'options', 'label'], emits: ['update:modelValue'], template: '<div class="cards" />' },
	CnIcon: true,
}

const PARTNERS = { organisations: [
	{ id: 'o1', name: 'Utrecht', domain: 'utrecht.nl', type: 'partner' },
	{ id: 'o2', name: 'Self', type: 'own' },
	{ id: 'o3', name: 'Zeist', type: 'partner' },
] }

const SHARE = {
	title: 'Share',
	fields: [
		{ field: 'mode', type: 'cards', default: 'share', options: [{ value: 'share', label: 'Share' }, { value: 'handover', label: 'Hand over' }] },
		{ field: 'organisation', type: 'select', optionsSource: { url: '/apps/x/organisations', responsePath: 'organisations', match: { type: 'partner' } }, optionLabel: ['{name} ({domain})', '{name}'] },
		{ field: 'permission', type: 'select', visibleWhen: { field: 'mode', equals: 'share' }, default: 'read', options: [{ value: 'read', label: 'Read' }] },
		{ field: 'shared', type: 'checks', visibleWhen: { field: 'mode', equals: 'share' }, default: 'all', sendUnticked: true, sendAs: 'fieldExclusions', options: [{ value: 'title', label: 'Title' }, { value: 'status', label: 'Status' }] },
	],
	note: { text: 'fallback', textsBy: { field: 'mode', cases: { share: 'You see what they do.', handover: 'They become the owner.' } } },
	confirm: {
		label: 'Go',
		requestsBy: { field: 'mode', cases: {
			share: { url: '/apps/x/shares', label: 'Share it', body: { partnerId: '{fields.organisation}', shareType: 'partner' } },
			handover: { url: '/apps/x/transfers', method: 'PUT', label: 'Hand it over', fieldsInBody: false, body: { targetOrganization: '{fields.organisation}' } },
		} },
	},
}

function mountDialog(config) {
	return mount(CnActionDialog, { props: { objectId: 'c1', config }, global: { stubs } })
}

function button(w, label) {
	return w.findAll('button').find((b) => b.text() === label)
}

function selectOf(w, name) {
	return w.find(`[data-testid="cn-action-dialog-field-${name}"]`).findComponent({ name: 'NcSelect' })
}

async function chooseMode(w, mode) {
	w.findComponent({ name: 'CnChoiceCards' }).vm.$emit('update:modelValue', mode)
	await flushPromises()
}

async function chooseOrganisation(w) {
	selectOf(w, 'organisation').vm.$emit('update:modelValue', { id: 'o1' })
	await flushPromises()
}

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockReset()
	axios.post.mockReset()
	axios.put.mockReset()
	axios.get.mockResolvedValue({ data: PARTNERS })
	axios.post.mockResolvedValue({ data: {} })
	axios.put.mockResolvedValue({ data: {} })
})

describe('options from an endpoint', () => {
	it('lists the entries the match keeps, labelled by the first template that fills', async () => {
		const w = mountDialog(SHARE)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/x/organisations', expect.anything())
		expect(selectOf(w, 'organisation').props('options').map((o) => [o.id, o.label])).toEqual([['o1', 'Utrecht (utrecht.nl)'], ['o3', 'Zeist']])
	})

	it('says a failed read in the configured words instead of offering an empty list', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const config = { ...SHARE, fields: [{ ...SHARE.fields[1], optionsSource: { ...SHARE.fields[1].optionsSource, errorText: 'The grounds could not be read.' } }] }
		const w = mountDialog(config)
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-options-error-organisation"]').text()).toBe('The grounds could not be read.')
	})

	it('reads again with the typed term when the source searches', async () => {
		jest.useFakeTimers()
		const config = { ...SHARE, fields: [{ ...SHARE.fields[1], optionsSource: { url: '/apps/x/people', search: true, searchParam: 'q' } }] }
		const w = mountDialog(config)
		await flushPromises()
		expect(selectOf(w, 'organisation').props('filterable')).toBe(false)
		selectOf(w, 'organisation').vm.$emit('search', 'jan')
		jest.advanceTimersByTime(300)
		await flushPromises()
		expect(axios.get).toHaveBeenLastCalledWith('/nc/apps/x/people', { params: { q: 'jan' } })
		jest.useRealTimers()
	})
})

describe('an endpoint per act', () => {
	it('posts the share with the field values, the whole token as the chosen id, and the exclusions', async () => {
		const w = mountDialog(SHARE)
		await flushPromises()
		await chooseOrganisation(w)
		w.findAllComponents({ name: 'NcCheckboxRadioSwitch' })[1].vm.$emit('update:modelValue', false)
		await flushPromises()
		await button(w, 'Share it').trigger('click')
		await flushPromises()
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toBe('/nc/apps/x/shares')
		expect(body).toMatchObject({ partnerId: 'o1', shareType: 'partner', permission: 'read', fieldExclusions: ['status'] })
		expect(body).not.toHaveProperty('shared')
	})

	it('puts the handover to its own url with only its body, and hides the share-only fields', async () => {
		const w = mountDialog(SHARE)
		await flushPromises()
		await chooseMode(w, 'handover')
		await chooseOrganisation(w)
		expect(w.find('[data-testid="cn-action-dialog-field-permission"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-action-dialog-field-shared"]').exists()).toBe(false)
		expect(w.find('.note').text()).toBe('They become the owner.')
		await button(w, 'Hand it over').trigger('click')
		await flushPromises()
		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.put).toHaveBeenCalledWith('/nc/apps/x/transfers', { targetOrganization: 'o1' })
	})

	it('hides a field that depends on a hidden field', async () => {
		const config = { ...SHARE, fields: [SHARE.fields[0], { field: 'limit', type: 'checkbox', default: true, visibleWhen: { field: 'mode', equals: 'share' } }, { field: 'picked', type: 'text', required: false, visibleWhen: { field: 'limit', equals: true } }] }
		const w = mountDialog(config)
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-field-picked"]').exists()).toBe(true)
		await chooseMode(w, 'handover')
		expect(w.find('[data-testid="cn-action-dialog-field-picked"]').exists()).toBe(false)
	})

	it('does not require a hidden field', async () => {
		const config = { ...SHARE, fields: [SHARE.fields[0], { field: 'only', type: 'text', visibleWhen: { field: 'mode', in: ['share'] } }] }
		const w = mountDialog(config)
		await flushPromises()
		expect(button(w, 'Share it').attributes('disabled')).toBeDefined()
		await chooseMode(w, 'handover')
		expect(button(w, 'Hand it over').attributes('disabled')).toBeUndefined()
	})
})

describe('a checks field in columns', () => {
	const SPLIT = {
		title: 'Split',
		source: { url: '/apps/x/split-policy' },
		requireOneOf: ['documents', 'parties', 'partiesOnBoth'],
		fields: [
			{ field: 'documents', type: 'checks', required: false, visibleWhen: { path: 'allowed', includes: 'documents' }, options: [{ value: 'd1', label: 'Quote' }] },
			{ field: 'partyRows', type: 'checks', required: false, exclusive: true, visibleWhen: { path: 'allowed', includes: 'parties' }, options: [{ value: 'p1', label: 'Jan' }], columns: [{ field: 'parties', label: 'Moves' }, { field: 'partiesOnBoth', label: 'On both' }] },
		],
		confirm: { label: 'Split', request: { url: '/apps/x/split' } },
	}

	function partyChecks(w) {
		return w.find('[data-testid="cn-action-dialog-columns-partyRows-p1"]').findAllComponents({ name: 'NcCheckboxRadioSwitch' })
	}

	it('shows the sections the record allows, and asks for one tick before splitting', async () => {
		axios.get.mockResolvedValue({ data: { allowed: ['parties'] } })
		const w = mountDialog(SPLIT)
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-field-documents"]').exists()).toBe(false)
		expect(partyChecks(w)).toHaveLength(2)
		expect(button(w, 'Split').attributes('disabled')).toBeDefined()
		partyChecks(w)[0].vm.$emit('update:modelValue', true)
		await flushPromises()
		expect(button(w, 'Split').attributes('disabled')).toBeUndefined()
	})

	it('refuses an item ticked in both columns, and sends each column as its own list', async () => {
		axios.get.mockResolvedValue({ data: { allowed: ['parties'] } })
		const w = mountDialog(SPLIT)
		await flushPromises()
		partyChecks(w)[0].vm.$emit('update:modelValue', true)
		partyChecks(w)[1].vm.$emit('update:modelValue', true)
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-conflict-partyRows"]').exists()).toBe(true)
		expect(button(w, 'Split').attributes('disabled')).toBeDefined()
		partyChecks(w)[0].vm.$emit('update:modelValue', false)
		await flushPromises()
		await button(w, 'Split').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1]).toMatchObject({ parties: [], partiesOnBoth: ['p1'] })
	})
})
