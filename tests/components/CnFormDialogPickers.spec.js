/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFormDialog renders the pickers a schema asks for: Nextcloud groups,
 * languages and time zones, the select-or-create reference with a nested
 * create form, and the (i) help on a toggle. From Ruben's pipelinq review
 * (D1, D2, D3, D7, D8, B2).
 */
import { mount } from '@vue/test-utils'

jest.mock('../../src/utils/groupAutocomplete.js', () => ({
	__esModule: true,
	searchNextcloudGroups: jest.fn().mockResolvedValue([
		{ id: 'sales', label: 'Sales team' },
		{ id: 'support', label: 'Support desk' },
	]),
	resolveNextcloudGroup: jest.fn().mockResolvedValue({ id: 'sales', label: 'Sales team' }),
}))

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
import { resolveNextcloudGroup, searchNextcloudGroups } from '../../src/utils/groupAutocomplete.js'

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

const original = globalThis._nc_l10n_language

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.objectTypeRegistry = {}
	mockStore.errors = {}
})
afterEach(() => {
	globalThis._nc_l10n_language = original
})

const field = (wrapper, key) => wrapper.vm.visibleFields.find((f) => f.key === key)

describe('CnFormDialog: group picker', () => {
	const schema = {
		title: 'Task',
		properties: {
			team: { type: 'string', title: 'Team', format: 'nc-group' },
			watchers: { type: 'array', title: 'Watching groups', items: { type: 'string', referenceType: 'nextcloud-group' } },
		},
	}

	it('loads groups and stores the gid, not the option', async () => {
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		await flushPromises()
		const team = field(wrapper, 'team')
		expect(searchNextcloudGroups).toHaveBeenCalled()
		expect(wrapper.vm.getEffectiveOptions(team)).toEqual([
			{ id: 'sales', label: 'Sales team' },
			{ id: 'support', label: 'Support desk' },
		])
		wrapper.vm.onEffectiveSelectChange(team, { id: 'support', label: 'Support desk' })
		expect(wrapper.vm.formData.team).toBe('support')
		expect(wrapper.vm.getEffectiveSelectedOption(team)).toEqual({ id: 'support', label: 'Support desk' })
	})

	it('stores an array of gids for a group array', async () => {
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		await flushPromises()
		const watchers = field(wrapper, 'watchers')
		expect(wrapper.vm.formData.watchers).toEqual([])
		wrapper.vm.onEffectiveMultiSelectChange(watchers, [{ id: 'sales', label: 'Sales team' }])
		expect(wrapper.vm.formData.watchers).toEqual(['sales'])
	})

	it('shows the display name of a stored gid in edit mode', async () => {
		const wrapper = mount(CnFormDialog, { props: { schema, item: { id: '1', team: 'sales' } }, global: { stubs } })
		await flushPromises()
		expect(resolveNextcloudGroup).toHaveBeenCalledWith('sales')
		expect(wrapper.vm.getEffectiveSelectedOption(field(wrapper, 'team')).label).toBe('Sales team')
	})

	it('renders the group field as an NcSelect with an inputLabel', async () => {
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		const select = wrapper.find('[data-cn-field="team"]').findComponent({ name: 'NcSelect' })
		expect(select.exists()).toBe(true)
		expect(select.attributes('inputlabel')).toBe('Team')
	})
})

describe('CnFormDialog: pickers from fieldOverrides (round two, R1)', () => {
	const schema = {
		title: 'Client',
		properties: {
			team: { type: 'string', title: 'Team' },
			language: { type: 'string', title: 'Language' },
			timezone: { type: 'string', title: 'Time zone' },
		},
	}
	const fieldOverrides = {
		team: { widget: 'group' },
		language: { widget: 'language', 'x-default': 'current-language' },
		timezone: { widget: 'timezone', 'x-default': 'current-timezone' },
	}

	it('renders the override widgets as the same pickers the formats give', async () => {
		globalThis._nc_l10n_language = 'nl'
		const wrapper = mount(CnFormDialog, { props: { schema, item: null, fieldOverrides }, global: { stubs } })
		await flushPromises()
		expect(searchNextcloudGroups).toHaveBeenCalled()
		wrapper.vm.onEffectiveSelectChange(field(wrapper, 'team'), { id: 'sales', label: 'Sales team' })
		expect(wrapper.vm.formData.team).toBe('sales')
		const lang = field(wrapper, 'language')
		expect(lang.widget).toBe('select')
		expect(wrapper.vm.getEnumOptions(lang).find((o) => o.id === 'de')).toEqual({ id: 'de', label: 'Duits' })
		expect(field(wrapper, 'timezone').codePicker).toBe('timezone')
	})

	it('prefills a NEW object from the override x-default', () => {
		globalThis._nc_l10n_language = 'nl'
		const wrapper = mount(CnFormDialog, { props: { schema, item: null, fieldOverrides }, global: { stubs } })
		expect(wrapper.vm.formData.language).toBe('nl')
		expect(wrapper.vm.formData.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
	})
})

describe('CnFormDialog: language and time zone pickers', () => {
	const schema = {
		title: 'Client',
		properties: {
			correspondenceLanguage: { type: 'string', title: 'Correspondence language', format: 'language', pattern: '^[a-z]{2}(-[A-Z]{2})?$', 'x-default': 'current-language' },
			timezone: { type: 'string', title: 'Time zone', format: 'timezone', 'x-default': 'current-timezone' },
		},
	}

	it('renders a language field as a select over language codes labelled in the user language', () => {
		globalThis._nc_l10n_language = 'nl'
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		const lang = field(wrapper, 'correspondenceLanguage')
		expect(lang.widget).toBe('select')
		const options = wrapper.vm.getEnumOptions(lang)
		expect(options.find((o) => o.id === 'de')).toEqual({ id: 'de', label: 'Duits' })
		expect(wrapper.find('[data-cn-field="correspondenceLanguage"]').findComponent({ name: 'NcSelect' }).exists()).toBe(true)
	})

	it('prefills a NEW object with the user language and time zone', () => {
		globalThis._nc_l10n_language = 'nl'
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		expect(wrapper.vm.formData.correspondenceLanguage).toBe('nl')
		expect(wrapper.vm.formData.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
	})

	it('leaves an existing object alone', () => {
		globalThis._nc_l10n_language = 'nl'
		const wrapper = mount(CnFormDialog, { props: { schema, item: { id: '1', correspondenceLanguage: 'fr' } }, global: { stubs } })
		expect(wrapper.vm.formData.correspondenceLanguage).toBe('fr')
		expect(wrapper.vm.formData.timezone).toBeUndefined()
	})

	it('offers time zones and stores the IANA id', () => {
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs } })
		const tz = field(wrapper, 'timezone')
		expect(tz.enum).toContain('Europe/Amsterdam')
		wrapper.vm.onEffectiveSelectChange(tz, { id: 'Europe/Amsterdam', label: 'Europe/Amsterdam' })
		expect(wrapper.vm.formData.timezone).toBe('Europe/Amsterdam')
	})
})

describe('CnFormDialog: select or create a reference', () => {
	const contact = {
		title: 'Contact',
		required: ['client'],
		properties: {
			name: { type: 'string', title: 'Name' },
			client: { type: 'string', format: 'uuid', title: 'Client', $ref: 'client', 'x-allow-create': true },
			tags: { type: 'array', title: 'Products', items: { $ref: 'product', 'x-allow-create': true } },
		},
	}
	const clientSchema = {
		title: 'Client',
		required: ['name', 'type'],
		properties: {
			name: { type: 'string', title: 'Name' },
			type: { type: 'string', title: 'Type', enum: ['person', 'organization'] },
		},
	}

	it('renders the select-or-create picker for a single and an array reference', () => {
		const wrapper = mount(CnFormDialog, { props: { schema: contact, item: null, register: 'pipelinq' }, global: { stubs } })
		const single = wrapper.find('[data-cn-field="client"]').findComponent({ name: 'CnResourceSelect' })
		const multi = wrapper.find('[data-cn-field="tags"]').findComponent({ name: 'CnResourceSelect' })
		expect(single.exists()).toBe(true)
		expect(single.props('schema')).toBe('client')
		expect(single.props('register')).toBe('pipelinq')
		expect(single.props('multiple')).toBe(false)
		expect(multi.exists()).toBe(true)
		expect(multi.props('multiple')).toBe(true)
		expect(multi.props('modelValue')).toEqual([])
	})

	it('"Create" opens the referenced schema form, saves it and hands back the new object', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		mockStore.saveObject.mockResolvedValue({ id: 'c-9', name: 'Acme' })
		const wrapper = mount(CnFormDialog, { props: { schema: contact, item: null, register: 'pipelinq' }, global: { stubs } })
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		const nested = wrapper.findAllComponents({ name: 'CnFormDialog' }).find((c) => c.vm !== wrapper.vm)
		expect(nested).toBeTruthy()
		expect(nested.props('schema')).toEqual(clientSchema)
		expect(nested.props('register')).toBe('pipelinq')
		expect(nested.vm.formData.name).toBe('Acme')

		nested.vm.$emit('confirm', { name: 'Acme', type: 'organization' })
		await expect(pending).resolves.toEqual({ id: 'c-9', name: 'Acme' })
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-client', { name: 'Acme', type: 'organization' })
		await flushPromises()
		expect(wrapper.vm.nestedCreate).toBeNull()
	})

	it('keeps the nested form open with the message when the save is refused', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		mockStore.saveObject.mockImplementation(async () => {
			mockStore.errors = { 'pipelinq-client': { message: 'Type is required' } }
			return null
		})
		const wrapper = mount(CnFormDialog, { props: { schema: contact, item: null, register: 'pipelinq' }, global: { stubs } })
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		const nested = wrapper.findAllComponents({ name: 'CnFormDialog' }).find((c) => c.vm !== wrapper.vm)
		await wrapper.vm.onNestedCreateConfirm({ name: 'Acme' })
		expect(wrapper.vm.nestedCreate).not.toBeNull()
		expect(nested.vm.formError).toBe('Type is required')
	})

	it('resolves null and keeps the field as it was when the nested form is closed', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const wrapper = mount(CnFormDialog, { props: { schema: contact, item: null, register: 'pipelinq' }, global: { stubs } })
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		wrapper.vm.onNestedCreateClose()
		await expect(pending).resolves.toBeNull()
		expect(wrapper.vm.formData.client).toBeNull()
	})

	it('stores the selected ids of a multi-value reference', () => {
		const wrapper = mount(CnFormDialog, { props: { schema: contact, item: null, register: 'pipelinq' }, global: { stubs } })
		wrapper.vm.onReferenceSelected(field(wrapper, 'tags'), ['p-1', 'p-2'])
		expect(wrapper.vm.formData.tags).toEqual(['p-1', 'p-2'])
	})
})

describe('CnFormDialog: create from a picker the way the app creates (round two, R3)', () => {
	const contact = {
		title: 'Contact',
		properties: {
			client: { type: 'string', format: 'uuid', title: 'Client', $ref: 'client', 'x-allow-create': true },
			tag: { type: 'string', format: 'uuid', title: 'Tag', $ref: 'tag', 'x-allow-create': true },
		},
	}
	const clientSchema = {
		title: 'Client',
		properties: { name: { type: 'string', title: 'Name' } },
	}
	const page = (config) => ({ id: 'Clients', route: '/clients', type: 'index', config: { register: 'pipelinq', schema: 'client', ...config } })
	const mountWith = ({ pages, registry, openModal = jest.fn() }) => mount(CnFormDialog, {
		props: { schema: contact, item: null, register: 'pipelinq' },
		global: {
			stubs,
			provide: { cnManifest: { pages }, cnRegistry: registry, cnCustomComponents: {}, cnOpenModal: openModal },
		},
	})
	const nestedOf = (wrapper) => wrapper.findAllComponents({ name: 'CnFormDialog' }).find((c) => c.vm !== wrapper.vm)

	it('saves through the page createOverride instead of a plain save', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const handler = jest.fn().mockResolvedValue({ id: 'c-1', name: 'Acme' })
		const wrapper = mountWith({
			pages: [page({ createOverride: 'createClientContactAware', createModal: 'ClientCreateDialog' })],
			registry: {
				createClientContactAware: { kind: 'create-override', handler },
				ClientCreateDialog: { kind: 'modal', component: {} },
			},
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		expect(nestedOf(wrapper)).toBeTruthy()
		await wrapper.vm.onNestedCreateConfirm({ name: 'Acme' })
		await expect(pending).resolves.toEqual({ id: 'c-1', name: 'Acme' })
		expect(handler).toHaveBeenCalledWith({ name: 'Acme' }, expect.objectContaining({ register: 'pipelinq', schema: 'client', objectType: 'pipelinq-client' }))
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('keeps the nested form open with the server message when the override throws', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const handler = jest.fn().mockRejectedValue({ response: { data: { error: 'Email is already in use' } } })
		const wrapper = mountWith({
			pages: [page({ createOverride: 'createClientContactAware' })],
			registry: { createClientContactAware: { kind: 'create-override', handler } },
		})
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		await wrapper.vm.onNestedCreateConfirm({ name: 'Acme' })
		expect(wrapper.vm.nestedCreate).not.toBeNull()
		expect(nestedOf(wrapper).vm.formError).toBe('Email is already in use')
	})

	it('opens the page createModal when the app has no override, and selects what it created', async () => {
		mockStore.fetchObject.mockResolvedValue({ id: 'c-5', name: 'Acme' })
		const openModal = jest.fn()
		const wrapper = mountWith({
			pages: [page({ createModal: 'ClientCreateDialog' })],
			registry: { ClientCreateDialog: { kind: 'modal', component: {} } },
			openModal,
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		expect(openModal).toHaveBeenCalledWith('ClientCreateDialog', expect.objectContaining({ initialData: { name: 'Acme' } }))
		expect(nestedOf(wrapper)).toBeFalsy()
		const props = openModal.mock.calls[0][1]
		const created = props.onCreated('c-5')
		props.onClose()
		await created
		await expect(pending).resolves.toEqual({ id: 'c-5', name: 'Acme' })
		expect(mockStore.fetchObject).toHaveBeenCalledWith('pipelinq-client', 'c-5')
		expect(mockStore.fetchSchema).not.toHaveBeenCalled()
	})

	it('resolves null when the app dialog closes without creating', async () => {
		const openModal = jest.fn()
		const wrapper = mountWith({
			pages: [page({ createModal: 'ClientCreateDialog' })],
			registry: { ClientCreateDialog: { kind: 'modal', component: {} } },
			openModal,
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Acme')
		await flushPromises()
		openModal.mock.calls[0][1].onClose()
		await expect(pending).resolves.toBeNull()
	})

	it('falls back to the generic form for a schema the app declares nothing for', async () => {
		mockStore.fetchSchema.mockResolvedValue({ title: 'Tag', properties: { name: { type: 'string' } } })
		mockStore.saveObject.mockResolvedValue({ id: 't-1', name: 'VIP' })
		const handler = jest.fn()
		const openModal = jest.fn()
		const wrapper = mountWith({
			pages: [page({ createOverride: 'createClientContactAware', createModal: 'ClientCreateDialog' })],
			registry: {
				createClientContactAware: { kind: 'create-override', handler },
				ClientCreateDialog: { kind: 'modal', component: {} },
			},
			openModal,
		})
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'tag'), 'VIP')
		await flushPromises()
		await wrapper.vm.onNestedCreateConfirm({ name: 'VIP' })
		await expect(pending).resolves.toEqual({ id: 't-1', name: 'VIP' })
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-tag', { name: 'VIP' })
		expect(handler).not.toHaveBeenCalled()
		expect(openModal).not.toHaveBeenCalled()
	})
})

describe('CnFormDialog: the nested create uses the page that lists the schema (nested-create-uses-page-config)', () => {
	// Mirrors pipelinq as it runs: the stored contact schema references the
	// client by schema ID (`$ref: 28`), the manifest page names it by slug,
	// and the client's name is a read-only mirror the page makes editable.
	const contact = {
		title: 'Contact',
		required: ['name'],
		properties: {
			name: { type: 'string', title: 'Name', readOnly: true },
			client: { $ref: 28, type: 'string', format: 'uuid', title: 'Client', 'x-allow-create': true },
		},
	}
	const clientSchema = {
		id: 28,
		uuid: '937543da-bee6-4e1d-b06a-43b3d84f77cd',
		slug: 'client',
		title: 'Client',
		required: ['contactsUid', 'name', 'type'],
		properties: {
			name: { type: 'string', title: 'Name', readOnly: true, minLength: 1, 'x-pipelinq-denormalised': true },
			type: { type: 'string', title: 'Client type', enum: ['person', 'organization'] },
			industry: { type: 'string', title: 'Industry' },
			email: { type: 'string', title: 'Email', readOnly: true },
			correspondenceLanguage: { type: 'string', title: 'Correspondence language' },
			timezone: { type: 'string', title: 'Timezone' },
			contactsUid: { type: 'string', title: 'Contacts UID', readOnly: true },
		},
	}
	const clientsPage = (extra = {}) => ({
		id: 'Clients',
		route: '/clients',
		type: 'index',
		config: {
			register: 'pipelinq',
			schema: 'client',
			createModal: 'ClientCreateDialog',
			createOverride: 'createClientContactAware',
			fieldOverrides: {
				name: { readOnly: false },
				email: { readOnly: false },
				phone: { readOnly: false },
				correspondenceLanguage: { widget: 'language' },
				timezone: { widget: 'timezone' },
			},
			...extra,
		},
	})
	const registryWith = (handler) => ({
		ClientCreateDialog: { kind: 'modal', component: {}, propsSchema: null },
		createClientContactAware: { kind: 'create-override', handler },
	})
	const mountWith = ({ pages, registry, openModal = jest.fn() }) => mount(CnFormDialog, {
		props: { schema: contact, item: null, register: 'pipelinq', fieldOverrides: { name: { readOnly: false } } },
		global: {
			stubs,
			provide: { cnManifest: { pages }, cnRegistry: registry, cnCustomComponents: {}, cnOpenModal: openModal },
		},
	})
	const nestedOf = (wrapper) => wrapper.findAllComponents({ name: 'CnFormDialog' }).find((c) => c.vm !== wrapper.vm)

	it('saves through the page createOverride when the reference names the schema by id', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const handler = jest.fn().mockResolvedValue({ id: 'c-1', name: 'Lane BV' })
		const wrapper = mountWith({ pages: [clientsPage()], registry: registryWith(handler) })
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Lane BV')
		await flushPromises()
		expect(nestedOf(wrapper)).toBeTruthy()
		await wrapper.vm.onNestedCreateConfirm({ name: 'Lane BV', type: 'organization' })
		await expect(pending).resolves.toEqual({ id: 'c-1', name: 'Lane BV' })
		expect(handler).toHaveBeenCalledWith(
			{ name: 'Lane BV', type: 'organization' },
			expect.objectContaining({ register: 'pipelinq', schema: '28', objectType: 'pipelinq-28' }),
		)
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('shows the page form: the name editable and prefilled, language and time zone as pickers', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const wrapper = mountWith({ pages: [clientsPage()], registry: registryWith(jest.fn()) })
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Lane BV')
		await flushPromises()
		const nested = nestedOf(wrapper)
		expect(nested.props('fieldOverrides')).toEqual(clientsPage().config.fieldOverrides)
		const name = field(nested, 'name')
		expect(name).toBeTruthy()
		expect(name.readOnly).toBe(false)
		expect(nested.vm.formData.name).toBe('Lane BV')
		expect(field(nested, 'correspondenceLanguage').widget).toBe('select')
		expect(field(nested, 'timezone').codePicker).toBe('timezone')
		expect(field(nested, 'contactsUid')).toBeUndefined()
	})

	it('applies the page excludeFields, includeFields and form layout to the nested form', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const wrapper = mountWith({
			pages: [clientsPage({ excludeFields: ['industry'], formSize: 'large', formColumns: 2 })],
			registry: registryWith(jest.fn()),
		})
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Lane BV')
		await flushPromises()
		const nested = nestedOf(wrapper)
		expect(field(nested, 'industry')).toBeUndefined()
		expect(field(nested, 'type')).toBeTruthy()
		expect(nested.props('size')).toBe('large')
		expect(nested.props('columns')).toBe(2)

		const only = mountWith({ pages: [clientsPage({ includeFields: ['name', 'type'] })], registry: registryWith(jest.fn()) })
		only.vm.openNestedCreate(field(only, 'client'), 'Lane BV')
		await flushPromises()
		expect(nestedOf(only).vm.visibleFields.map((f) => f.key).sort()).toEqual(['name', 'type'])
	})

	it('opens the page createModal for a reference by id when the app has no override', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		const openModal = jest.fn()
		const { createOverride, ...modalOnly } = clientsPage().config
		const wrapper = mountWith({
			pages: [{ ...clientsPage(), config: modalOnly }],
			registry: { ClientCreateDialog: { kind: 'modal', component: {} } },
			openModal,
		})
		wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Lane BV')
		await flushPromises()
		expect(createOverride).toBe('createClientContactAware')
		expect(openModal).toHaveBeenCalledWith('ClientCreateDialog', expect.objectContaining({ initialData: { name: 'Lane BV' } }))
		expect(nestedOf(wrapper)).toBeFalsy()
	})

	it('keeps the generic form when no page lists the referenced schema', async () => {
		mockStore.fetchSchema.mockResolvedValue(clientSchema)
		mockStore.saveObject.mockResolvedValue({ id: 'c-2', name: 'Lane BV' })
		const handler = jest.fn()
		const wrapper = mountWith({ pages: [clientsPage({ schema: 'lead' })], registry: registryWith(handler) })
		const pending = wrapper.vm.openNestedCreate(field(wrapper, 'client'), 'Lane BV')
		await flushPromises()
		const nested = nestedOf(wrapper)
		expect(nested.props('fieldOverrides')).toEqual({})
		expect(field(nested, 'name')).toBeUndefined()
		await wrapper.vm.onNestedCreateConfirm({ type: 'organization' })
		await expect(pending).resolves.toEqual({ id: 'c-2', name: 'Lane BV' })
		expect(handler).not.toHaveBeenCalled()
	})
})

describe('CnFormDialog: help on a toggle', () => {
	it('renders the (i) helper under a boolean field that declares x-help', () => {
		const schema = {
			title: 'Client',
			properties: {
				isMaster: { type: 'boolean', title: 'Is master record', 'x-help': 'The master record wins when two records describe one client.' },
			},
		}
		const wrapper = mount(CnFormDialog, { props: { schema, item: null }, global: { stubs: { ...stubs, NcPopover: true } } })
		const helper = wrapper.find('[data-cn-field="isMaster"]').findComponent({ name: 'CnFieldHelper' })
		expect(helper.exists()).toBe(true)
		expect(helper.props('more')).toBe('The master record wins when two records describe one client.')
		expect(helper.find('.cn-field-helper').exists()).toBe(true)
	})
})
