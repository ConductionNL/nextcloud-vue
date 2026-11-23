/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A select field can carry its choices in the form itself.
 *
 * A node's configForm could only fill a select from an `optionsFrom` url. A
 * field with a short fixed vocabulary (a message category, say) had no url to
 * point at, so it rendered as a free-text box and the author had to type an
 * allowed value from the help text. A `select` field may now declare
 * `options`: plain strings, or `{ value, label }` pairs.
 */
import { mount } from '@vue/test-utils'
import CnFlowNodeEditModal from '../../src/dialogs/CnFlowNodeEditModal.vue'
import CnRunNodeDialog from '../../src/dialogs/CnRunNodeDialog.vue'
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

const CATEGORY_FIELD = {
	key: 'messageCategory',
	label: 'Message category',
	type: 'select',
	help: 'What kind of mail this is.',
	options: [
		{ value: 'service', label: 'Service message' },
		{ value: 'marketing', label: 'Marketing' },
		{ id: 'besluit', label: 'Decision (besluit)' },
		'security',
	],
}

/**
 * Mount the edit dialog over one send-email node.
 *
 * @param {object} config The node's stored config.
 * @return {object} The wrapper.
 */
function mountEditor(config = {}) {
	const store = useFlowStore()
	store.nodeCatalog = [{ id: 'openregister.send-email', displayName: 'Send an email', configForm: [CATEGORY_FIELD] }]
	store.flow = { name: 'x', nodes: [{ id: 'n1', type: 'openregister.send-email', config }], edges: [] }
	store.editingNodeId = 'n1'

	return mount(CnFlowNodeEditModal, {
		global: {
			stubs: {
				NcDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
				NcButton: { template: '<button><slot /></button>' },
				NcSelect: {
					name: 'NcSelect',
					template: '<div class="nc-select-stub" />',
					props: ['modelValue', 'options', 'inputLabel', 'placeholder', 'loading'],
				},
				NcCheckboxRadioSwitch: true,
				NcTextArea: true,
				NcTextField: true,
			},
			mocks: { t: (app, s) => s },
		},
	})
}

describe('CnFlowNodeEditModal static select options', () => {
	beforeEach(() => {
		require('@nextcloud/axios').default.get.mockClear()
	})

	it('renders a select with options declared in the form, without fetching anything', async () => {
		const wrapper = mountEditor()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.widgetFor('messageCategory')).toBe('select')
		expect(require('@nextcloud/axios').default.get).not.toHaveBeenCalled()

		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.exists()).toBe(true)
		expect(select.props('inputLabel')).toBe('Message category')
		expect(select.props('options')).toEqual([
			{ id: 'service', label: 'Service message' },
			{ id: 'marketing', label: 'Marketing' },
			{ id: 'besluit', label: 'Decision (besluit)' },
			{ id: 'security', label: 'security' },
		])
	})

	it('shows the stored value by its label and stores the value, not the label', async () => {
		const wrapper = mountEditor({ messageCategory: 'marketing' })
		await wrapper.vm.$nextTick()

		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.props('modelValue')).toEqual({ id: 'marketing', label: 'Marketing' })

		select.vm.$emit('update:modelValue', { id: 'besluit', label: 'Decision (besluit)' })
		expect(wrapper.vm.draft.config.messageCategory).toBe('besluit')

		select.vm.$emit('update:modelValue', null)
		expect(wrapper.vm.draft.config.messageCategory).toBe('')
	})

	it('keeps a stored value outside the list visible instead of blanking it', () => {
		const wrapper = mountEditor({ messageCategory: 'newsletter' })

		expect(wrapper.vm.selectedOption('messageCategory')).toEqual({ id: 'newsletter', label: 'newsletter' })
	})

	it('shows the field help under the select', () => {
		const wrapper = mountEditor()

		const help = wrapper.find('[data-testid="flow-node-help-messageCategory"]')
		expect(help.exists()).toBe(true)
		expect(help.text()).toBe('What kind of mail this is.')
	})
})

describe('CnRunNodeDialog static select options', () => {
	it('offers the options declared in the form, translated through the host', () => {
		const wrapper = mount(CnRunNodeDialog, {
			props: {
				fields: [CATEGORY_FIELD],
				translate: (s) => `nl:${s}`,
			},
			global: {
				stubs: {
					NcSelect: {
						name: 'NcSelect',
						template: '<div />',
						props: ['modelValue', 'options', 'inputLabel'],
					},
				},
			},
		})

		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.props('options').map((o) => o.id)).toEqual(['service', 'marketing', 'besluit', 'security'])
		expect(select.props('options')[0].label).toBe('nl:Service message')

		select.vm.$emit('update:modelValue', { id: 'marketing', label: 'nl:Marketing' })
		expect(wrapper.vm.values.messageCategory).toBe('marketing')
		expect(wrapper.vm.selectedOption(CATEGORY_FIELD)).toEqual({ id: 'marketing', label: 'nl:Marketing' })
	})
})
