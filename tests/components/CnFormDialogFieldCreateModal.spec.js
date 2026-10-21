/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reference field can name the registry modal that creates its objects
 * (`createModal`, with `createModalProps` that may read other answers), and
 * any field can show a registered component or a slot under its control
 * (`hintWidget` / `#field-{key}-hint`).
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'

const mockStore = {
	objectTypeRegistry: {},
	errors: {},
	createObjectTypeSlug: (register, schema) => `${register}-${schema}`,
	registerObjectType: jest.fn(function(slug, schema, register) {
		this.objectTypeRegistry[slug] = { schema, register }
	}),
	fetchSchema: jest.fn(),
	saveObject: jest.fn(),
	fetchCollectionForOptions: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	collections: {},
}
jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcSelectUsers: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
	CnResourceSelect: true,
}

const lead = {
	title: 'Lead',
	properties: {
		title: { type: 'string', title: 'Title' },
		category: { type: 'string', title: 'Category' },
		client: { type: 'string', format: 'uuid', title: 'Client', $ref: 'client', 'x-allow-create': true },
		contact: { type: 'string', format: 'uuid', title: 'Contact', $ref: 'contact', 'x-allow-create': true },
	},
}

const field = (wrapper, key) => wrapper.vm.visibleFields.find((f) => f.key === key)

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.objectTypeRegistry = {}
})

describe('CnFormDialog: a reference field creates through its own registry modal', () => {
	const mountWith = ({ fieldOverrides, registry, openModal = jest.fn(), item = null }) => mount(CnFormDialog, {
		props: { schema: lead, item, register: 'pipelinq', fieldOverrides },
		global: {
			stubs,
			provide: { cnManifest: { pages: [] }, cnRegistry: registry, cnCustomComponents: {}, cnOpenModal: openModal },
		},
	})

	it('opens the field createModal with the typed term and the props it names, filled from the answers', async () => {
		mockStore.fetchObject.mockResolvedValue({ id: 'p-9', name: 'Jan' })
		const openModal = jest.fn()
		const wrapper = mountWith({
			item: { client: 'c-1' },
			fieldOverrides: { contact: { createModal: 'ContactCreateDialog', createModalProps: { client: '@answer.client' } } },
			registry: { ContactCreateDialog: { kind: 'modal', component: {} } },
			openModal,
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'contact'), 'Jan')
		await flushPromises()
		expect(openModal).toHaveBeenCalledWith('ContactCreateDialog', expect.objectContaining({ client: 'c-1', initialData: { name: 'Jan' } }))
		expect(mockStore.fetchSchema).not.toHaveBeenCalled()
		const props = openModal.mock.calls[0][1]
		await props.onCreated('p-9')
		props.onClose()
		await expect(pending).resolves.toEqual({ id: 'p-9', name: 'Jan' })
	})

	it('resolves null when the field modal closes without creating', async () => {
		const openModal = jest.fn()
		const wrapper = mountWith({
			fieldOverrides: { client: { createModal: 'ClientCreateDialog' } },
			registry: { ClientCreateDialog: { kind: 'modal', component: {} } },
			openModal,
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		openModal.mock.calls[0][1].onClose()
		await expect(pending).resolves.toBeNull()
	})

	it('ignores a createModal that is not a registered modal and uses the generic form', async () => {
		mockStore.fetchSchema.mockResolvedValue({ title: 'Client', properties: { name: { type: 'string' } } })
		const openModal = jest.fn()
		const wrapper = mountWith({
			fieldOverrides: { client: { createModal: 'Missing' } },
			registry: {},
			openModal,
		})
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		expect(openModal).not.toHaveBeenCalled()
		expect(wrapper.vm.nestedCreate).not.toBeNull()
	})
})

describe('CnFormDialog: a select-or-create picker follows another answer', () => {
	it('scopes the picker by its pickerFilter, filled from the answers', async () => {
		const wrapper = mount(CnFormDialog, {
			props: { schema: lead, item: null, register: 'pipelinq', fieldOverrides: { contact: { pickerFilter: { client: '@answer.client' } } } },
			global: { stubs, provide: { cnRegistry: {} } },
		})
		const picker = () => wrapper.findAllComponents({ name: 'CnResourceSelect' }).find((c) => c.props('schema') === 'contact')
		expect(picker().props('filters')).toEqual({ client: '' })
		wrapper.vm.updateField('client', 'c-1')
		await wrapper.vm.$nextTick()
		expect(picker().props('filters')).toEqual({ client: 'c-1' })
	})
})

describe('CnFormDialog: content under a field', () => {
	const Hint = {
		name: 'CategoryHint',
		props: { field: Object, value: null, formData: Object },
		template: '<span class="hint">{{ field.key }}={{ value }}/{{ formData.title }}</span>',
	}

	it('mounts the registered hintWidget under the field with the field, its value and the form', () => {
		const wrapper = mount(CnFormDialog, {
			props: { schema: lead, item: { title: 'Deal', category: 'solar' }, fieldOverrides: { category: { hintWidget: 'CategoryHint' } } },
			global: { stubs, provide: { cnRegistry: { CategoryHint: { kind: 'widget', component: Hint } } } },
		})
		const hint = wrapper.find('[data-testid="cn-form-hint-category"]')
		expect(hint.exists()).toBe(true)
		expect(hint.text()).toBe('category=solar/Deal')
		expect(wrapper.find('[data-testid="cn-form-hint-title"]').exists()).toBe(false)
	})

	it('renders the field-{key}-hint slot instead of the widget', () => {
		const wrapper = mount(CnFormDialog, {
			props: { schema: lead, item: { category: 'wind' }, fieldOverrides: { category: { hintWidget: 'CategoryHint' } } },
			slots: { 'field-category-hint': ({ value }) => h('em', { class: 'slot-hint' }, value) },
			global: { stubs, provide: { cnRegistry: { CategoryHint: { kind: 'widget', component: Hint } } } },
		})
		const hint = wrapper.find('[data-testid="cn-form-hint-category"]')
		expect(hint.find('.slot-hint').text()).toBe('wind')
		expect(hint.find('.hint').exists()).toBe(false)
	})

	it('shows nothing under a field whose hintWidget is not registered', () => {
		const wrapper = mount(CnFormDialog, {
			props: { schema: lead, item: null, fieldOverrides: { category: { hintWidget: 'Missing' } } },
			global: { stubs, provide: { cnRegistry: {} } },
		})
		expect(wrapper.find('[data-testid="cn-form-hint-category"]').exists()).toBe(false)
	})
})
