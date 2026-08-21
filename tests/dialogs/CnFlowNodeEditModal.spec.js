/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A step is edited through a FORM, and the form cannot break the step.
 *
 * The dialog derives one field per option the engine declares (configKeys),
 * edits a DRAFT, and only Done commits — so a half-typed JSON value can never
 * land on the node, and Cancel always leaves the step as it was.
 */
import { mount } from '@vue/test-utils'
import CnFlowNodeEditModal from '../../src/dialogs/CnFlowNodeEditModal.vue'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * Mount the dialog over a store holding one editable node.
 *
 * @param {object} node Node fields to merge over the default.
 * @param {Array<object>} catalog The node catalogue.
 * @return {object} The wrapper and the store.
 */
function mountModal(node = {}, catalog = []) {
	// tests/setup.js installs a fresh pinia per test, both active and into
	// mounted components — calling useFlowStore() here resolves the SAME
	// instance the dialog will, which is what lets the store be seeded
	// before data() snapshots the node into the draft.
	const store = useFlowStore()
	store.nodeCatalog = catalog
	store.flow = {
		name: 'x',
		nodes: [{ id: 'n1', type: 'openregister.end', config: {}, ...node }],
		edges: [],
	}
	store.editingNodeId = 'n1'

	const wrapper = mount(CnFlowNodeEditModal, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
				NcButton: { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled'] },
				NcSelect: true,
				NcCheckboxRadioSwitch: {
					template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:model-value\', $event.target.checked)"><slot /></label>',
					props: ['modelValue'],
				},
				NcTextArea: {
					template: '<textarea :value="modelValue" @input="$emit(\'update:model-value\', $event.target.value)" />',
					props: ['modelValue', 'error', 'helperText', 'label'],
				},
				NcTextField: {
					template: '<input :value="modelValue" @input="$emit(\'update:model-value\', $event.target.value)" />',
					props: ['modelValue', 'label', 'helperText', 'placeholder'],
				},
			},
			mocks: { t: (app, s) => s },
		},
	})

	return { wrapper, store }
}

describe('CnFlowNodeEditModal', () => {
	it('renders one field per declared option, plus keys already set', () => {
		const { wrapper } = mountModal(
			{ config: { extra: 'already-here' } },
			[{
				id: 'openregister.end',
				displayName: 'End',
				description: 'End the flow here.',
				configKeys: ['error', 'message'],
			}],
		)

		// Declared vocabulary first, in the engine's order, then extras.
		expect(wrapper.vm.formKeys).toEqual(['error', 'message', 'extra'])
		expect(wrapper.text()).toContain('End the flow here.')
	})

	it('gives a boolean its switch and a structured value its JSON area', () => {
		const { wrapper } = mountModal({
			config: { enabled: true, headers: { a: 1 } },
		})

		expect(wrapper.vm.widgetFor('enabled')).toBe('switch')
		expect(wrapper.vm.widgetFor('headers')).toBe('json')
		expect(wrapper.vm.widgetFor('method')).toBe('method')
		expect(wrapper.vm.widgetFor('anything')).toBe('text')
	})

	it('commits the draft on Done — and only on Done', async () => {
		const { wrapper, store } = mountModal({ config: { message: 'old' } })

		wrapper.vm.setKey('message', 'new')
		// The node is untouched while the dialog is open.
		expect(store.flow.nodes[0].config.message).toBe('old')

		wrapper.vm.done()
		expect(store.flow.nodes[0].config.message).toBe('new')
		expect(store.editingNodeId).toBeNull()
	})

	it('discards the draft on Cancel', () => {
		const { wrapper, store } = mountModal({ config: { message: 'old' } })

		wrapper.vm.setKey('message', 'new')
		wrapper.vm.cancel()

		expect(store.flow.nodes[0].config.message).toBe('old')
		expect(store.editingNodeId).toBeNull()
	})

	it('refuses to commit while a JSON field does not parse', async () => {
		const { wrapper } = mountModal({ config: { headers: { a: 1 } } })

		wrapper.vm.setJsonKey('headers', '{ not json')
		await wrapper.vm.$nextTick()

		// The broken text stays visible for fixing; Done is off; the draft
		// keeps the last valid value.
		expect(wrapper.vm.hasErrors).toBe(true)
		expect(wrapper.vm.draft.config.headers).toEqual({ a: 1 })
	})

	it('renders a select field as a picker fed from its declared optionsFrom URL', async () => {
		const axios = require('@nextcloud/axios').default
		axios.get.mockResolvedValueOnce({
			data: {
				results: [
					{ '@self': { uuid: 'u-1' }, name: 'CKAN production' },
					{ '@self': { uuid: 'u-2' }, name: 'CKAN staging' },
				],
			},
		})

		const { wrapper } = mountModal(
			{ type: 'openconnector.source-call', config: { source: 'u-9' } },
			[{
				id: 'openconnector.source-call',
				displayName: 'Call a source',
				configForm: [
					{
						key: 'source',
						label: 'Source',
						type: 'select',
						optionsFrom: '/apps/openregister/api/objects/openconnector/source',
					},
				],
			}],
		)
		await new Promise((resolve) => setTimeout(resolve))
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.widgetFor('source')).toBe('select')
		expect(wrapper.vm.selectOptions.source.map((o) => o.label)).toEqual([
			'CKAN production',
			'CKAN staging',
		])
		// A stored value outside the loaded options is preserved, never blanked.
		expect(wrapper.vm.selectedOption('source')).toEqual({ id: 'u-9', label: 'u-9' })
	})

	it('renders a reference field as a picker over that register/schema\'s objects', async () => {
		const axios = require('@nextcloud/axios').default
		axios.get.mockResolvedValueOnce({
			data: {
				results: [
					{ '@self': { uuid: 'm-1' }, name: 'CKAN → dataset' },
					{ '@self': { uuid: 'm-2' }, name: 'CKAN → organisation' },
				],
			},
		})

		const { wrapper } = mountModal(
			{ type: 'openconnector.apply-mapping', config: { mappingId: 'm-2' } },
			[{
				id: 'openconnector.apply-mapping',
				displayName: 'Apply a mapping',
				configForm: [
					{
						key: 'mappingId',
						label: 'Mapping',
						type: 'reference',
						reference: { register: 'openconnector', schema: 'mapping' },
					},
				],
			}],
		)
		await new Promise((resolve) => setTimeout(resolve))
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.widgetFor('mappingId')).toBe('reference')
		// The URL is DERIVED from the pair — the declaration carries no URL,
		// which is the whole difference from optionsFrom.
		expect(axios.get).toHaveBeenCalledWith(
			'/index.php/apps/openregister/api/objects/openconnector/mapping',
		)
		expect(wrapper.vm.selectOptions.mappingId.map((o) => o.label)).toEqual([
			'CKAN → dataset',
			'CKAN → organisation',
		])
		// The stored uuid resolves to a NAME — the point of the field. Before
		// this it was a bare text box showing `m-2` and nothing else.
		expect(wrapper.vm.selectedOption('mappingId')).toEqual({
			id: 'm-2',
			label: 'CKAN → organisation',
		})
	})

	it('falls back to a text box when a reference names only half a pair', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const { wrapper } = mountModal(
			{ type: 'openconnector.apply-mapping', config: { mappingId: 'm-2' } },
			[{
				id: 'openconnector.apply-mapping',
				displayName: 'Apply a mapping',
				configForm: [
					{
						key: 'mappingId',
						label: 'Mapping',
						type: 'reference',
						// No schema: a register alone does not identify a set
						// of objects.
						reference: { register: 'openconnector' },
					},
				],
			}],
		)

		// Guessing the missing half would put a picker on screen listing the
		// WRONG things, which is worse than the text box it replaced. The
		// value stays editable and reachable either way.
		expect(wrapper.vm.widgetFor('mappingId')).toBe('text')
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('leaves a reference value editable when the objects endpoint fails', async () => {
		const axios = require('@nextcloud/axios').default
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		axios.get.mockRejectedValueOnce(new Error('403'))

		const { wrapper } = mountModal(
			{ type: 'openconnector.apply-mapping', config: { mappingId: 'm-7' } },
			[{
				id: 'openconnector.apply-mapping',
				displayName: 'Apply a mapping',
				configForm: [
					{
						key: 'mappingId',
						label: 'Mapping',
						type: 'reference',
						reference: { register: 'openconnector', schema: 'mapping' },
					},
				],
			}],
		)
		await new Promise((resolve) => setTimeout(resolve))
		await wrapper.vm.$nextTick()

		// A picker that cannot load must not eat the configured value. An
		// operator whose objects endpoint is unreachable still has to be able
		// to see and keep what the node was already set to.
		expect(wrapper.vm.selectOptions.mappingId).toBeUndefined()
		expect(wrapper.vm.selectedOption('mappingId')).toEqual({ id: 'm-7', label: 'm-7' })
		expect(wrapper.vm.selectLoading.mappingId).toBe(false)
		error.mockRestore()
	})

	it('lets configForm drive labels, help, widgets and key order over configKeys', () => {
		const { wrapper } = mountModal(
			{ config: {} },
			[{
				id: 'openregister.end',
				displayName: 'End',
				configKeys: ['force', 'maxItems', 'notes', 'legacyOnly'],
				configForm: [
					{ key: 'force', label: 'Force a full pass', type: 'boolean' },
					{ key: 'maxItems', label: 'Ceiling', type: 'number', help: 'Raises, never truncates.', required: true },
					{ key: 'notes', label: 'Notes', type: 'textarea' },
				],
			}],
		)

		// Form fields first in their order, then keys only configKeys names.
		expect(wrapper.vm.formKeys).toEqual(['force', 'maxItems', 'notes', 'legacyOnly'])
		expect(wrapper.vm.widgetFor('force')).toBe('switch')
		expect(wrapper.vm.widgetFor('maxItems')).toBe('number')
		expect(wrapper.vm.widgetFor('notes')).toBe('textarea')
		expect(wrapper.vm.labelFor('maxItems')).toBe('Ceiling')
		expect(wrapper.vm.hintFor('maxItems')).toBe('Required. Raises, never truncates.')
	})

	it('humanises key names into labels', () => {
		const { wrapper } = mountModal()

		expect(wrapper.vm.labelFor('sourceId')).toBe('Source id')
		expect(wrapper.vm.labelFor('output_key')).toBe('Output key')
	})

	it('removes the step, edges included, from its own footer', () => {
		const { wrapper, store } = mountModal()

		wrapper.vm.removeStep()

		expect(store.flow.nodes).toHaveLength(0)
		expect(store.editingNodeId).toBeNull()
	})
})
