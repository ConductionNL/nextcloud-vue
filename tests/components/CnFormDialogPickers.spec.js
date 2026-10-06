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
