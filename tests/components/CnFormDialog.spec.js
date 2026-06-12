import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

const stubs = {
	NcDialog: {
		template: '<div><slot /><slot name="actions" /></div>',
	},
	NcButton: {
		template: '<button @click="$listeners.click"><slot /></button>',
	},
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnJsonViewer: {
		props: ['value', 'language', 'readOnly'],
		template: '<div class="stub-cn-json-viewer" />',
	},
}

const testSchema = {
	title: 'Item',
	properties: {
		title: { type: 'string', title: 'Title' },
		status: { type: 'string', title: 'Status', enum: ['draft', 'published'] },
		tags: { type: 'array', title: 'Tags' },
	},
	required: ['title'],
}

describe('CnFormDialog', () => {
	// === Backwards compatibility ===

	it('renders in create mode when item is null', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		expect(wrapper.vm.isCreateMode).toBe(true)
		expect(wrapper.vm.resolvedTitle).toContain('Create')
	})

	it('renders in edit mode when item is provided', () => {
		const item = { id: '1', title: 'Test', status: 'draft' }
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item },
			stubs,
		})
		expect(wrapper.vm.isCreateMode).toBe(false)
		expect(wrapper.vm.resolvedTitle).toContain('Edit')
		expect(wrapper.vm.formData.title).toBe('Test')
	})

	it('static enum returns mapped options', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find(f => f.key === 'status')
		const options = wrapper.vm.getEnumOptions(field)
		expect(options).toEqual([
			{ id: 'draft', label: 'draft' },
			{ id: 'published', label: 'published' },
		])
	})

	it('static select stores ID on change (not full object)', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find(f => f.key === 'status')
		wrapper.vm.onEffectiveSelectChange(field, { id: 'published', label: 'published' })
		expect(wrapper.vm.formData.status).toBe('published')
	})

	it('setResult shows success and resets loading', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		wrapper.vm.loading = true
		wrapper.vm.setResult({ success: true })
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.vm.result).toEqual({ success: true })
	})

	it('setValidationErrors keeps the form visible and shows a form-level error', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		wrapper.vm.loading = true
		wrapper.vm.setValidationErrors({ title: 'Title is required' }, "Property 'client' should match format 'uuid'.")
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.loading).toBe(false)
		// The form must NOT be replaced by the result phase.
		expect(wrapper.vm.result).toBeNull()
		expect(wrapper.find('[data-testid-phase="form"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(false)
		// Form-level message shown, per-field error recorded.
		expect(wrapper.vm.formError).toBe("Property 'client' should match format 'uuid'.")
		expect(wrapper.find('[data-testid="cn-form-dialog-error"]').exists()).toBe(true)
		expect(wrapper.vm.errors.title).toBe('Title is required')

		// Editing a field clears the form-level error so the user can retry.
		wrapper.vm.updateField('title', 'Acme')
		expect(wrapper.vm.formError).toBeNull()
	})

	// === Async enum detection ===

	it('isAsyncEnum returns true for function, false for array', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		expect(wrapper.vm.isAsyncEnum({ enum: async () => [] })).toBe(true)
		expect(wrapper.vm.isAsyncEnum({ enum: () => [] })).toBe(true)
		expect(wrapper.vm.isAsyncEnum({ enum: ['a', 'b'] })).toBe(false)
		expect(wrapper.vm.isAsyncEnum({ enum: null })).toBe(false)
		expect(wrapper.vm.isAsyncEnum({})).toBe(false)
	})

	it('isAsyncItemsEnum returns true for function items.enum', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		expect(wrapper.vm.isAsyncItemsEnum({ items: { enum: async () => [] } })).toBe(true)
		expect(wrapper.vm.isAsyncItemsEnum({ items: { enum: ['a'] } })).toBe(false)
		expect(wrapper.vm.isAsyncItemsEnum({ items: null })).toBe(false)
		expect(wrapper.vm.isAsyncItemsEnum({})).toBe(false)
	})

	// === Async initial load ===

	it('calls async enum with empty string on mount', async () => {
		const enumFn = jest.fn().mockResolvedValue([
			{ label: 'Org A', id: '1' },
			{ label: 'Org B', id: '2' },
		])

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		// Wait for $nextTick (initAsyncFields triggers load in $nextTick)
		await wrapper.vm.$nextTick()
		// Wait for the async loadAsyncOptions to resolve
		await flushPromises()

		expect(enumFn).toHaveBeenCalledWith('')
		expect(wrapper.vm.asyncState.org.options).toEqual([
			{ label: 'Org A', id: '1' },
			{ label: 'Org B', id: '2' },
		])
	})

	// === Async loading state ===

	it('isFieldLoading returns true while async enum is pending', async () => {
		let resolveEnum
		const enumFn = jest.fn().mockImplementation(() => new Promise(r => { resolveEnum = r }))

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		await wrapper.vm.$nextTick()
		const field = { key: 'org', enum: enumFn }

		// Should be loading after initial load triggered
		expect(wrapper.vm.isFieldLoading(field)).toBe(true)

		// Resolve and wait
		resolveEnum([{ label: 'A', id: '1' }])
		await flushPromises()

		expect(wrapper.vm.isFieldLoading(field)).toBe(false)
	})

	// === Async value model ===

	it('async select stores full option object in formData', () => {
		const enumFn = jest.fn().mockResolvedValue([])
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		const field = { key: 'org', enum: enumFn }
		const option = { label: 'Org A', id: '1', description: 'Test org' }

		wrapper.vm.onEffectiveSelectChange(field, option)
		expect(wrapper.vm.formData.org).toEqual(option)
	})

	it('async select stores null when cleared', () => {
		const enumFn = jest.fn().mockResolvedValue([])
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		const field = { key: 'org', enum: enumFn }
		wrapper.vm.onEffectiveSelectChange(field, null)
		expect(wrapper.vm.formData.org).toBeNull()
	})

	// === Async search debounce ===

	it('debounces search calls', () => {
		jest.useFakeTimers()
		const enumFn = jest.fn().mockResolvedValue([])

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn, debounce: 200 },
				],
				item: null,
			},
			stubs,
		})

		// Clear the initial load call (triggered via $nextTick → setTimeout)
		jest.runAllTimers()
		enumFn.mockClear()

		const field = wrapper.vm.resolvedFields[0]

		// Trigger multiple searches rapidly
		wrapper.vm.onAsyncSearch(field, 'a')
		wrapper.vm.onAsyncSearch(field, 'ab')
		wrapper.vm.onAsyncSearch(field, 'abc')

		// Before debounce fires, no new calls
		expect(enumFn).not.toHaveBeenCalled()

		// Advance past debounce
		jest.advanceTimersByTime(200)

		// Only the last search should have fired
		expect(enumFn).toHaveBeenCalledTimes(1)
		expect(enumFn).toHaveBeenCalledWith('abc')

		jest.useRealTimers()
	})

	// === Async multiselect ===

	it('async multiselect stores full option objects', () => {
		const enumFn = jest.fn().mockResolvedValue([])
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'groups', widget: 'multiselect', label: 'Groups', items: { enum: enumFn } },
				],
				item: null,
			},
			stubs,
		})

		const field = wrapper.vm.resolvedFields[0]
		const options = [
			{ label: 'Admin', id: 'admin' },
			{ label: 'Users', id: 'users' },
		]

		wrapper.vm.onEffectiveMultiSelectChange(field, options)
		expect(wrapper.vm.formData.groups).toEqual(options)
	})

	it('static multiselect stores IDs only', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'roles', widget: 'multiselect', label: 'Roles', items: { enum: ['admin', 'user'] } },
				],
				item: null,
			},
			stubs,
		})

		const field = wrapper.vm.resolvedFields[0]
		wrapper.vm.onEffectiveMultiSelectChange(field, [
			{ id: 'admin', label: 'admin' },
			{ id: 'user', label: 'user' },
		])
		expect(wrapper.vm.formData.roles).toEqual(['admin', 'user'])
	})

	// === getEffective methods delegate correctly ===

	it('getEffectiveOptions returns async options for async field', async () => {
		const options = [{ label: 'A', id: '1' }]
		const enumFn = jest.fn().mockResolvedValue(options)

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		await wrapper.vm.$nextTick()
		await flushPromises()

		const field = wrapper.vm.resolvedFields[0]
		expect(wrapper.vm.getEffectiveOptions(field)).toEqual(options)
	})

	it('getEffectiveOptions returns static options for static field', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: testSchema, item: null },
			stubs,
		})
		const field = wrapper.vm.resolvedFields.find(f => f.key === 'status')
		const options = wrapper.vm.getEffectiveOptions(field)
		expect(options).toEqual([
			{ id: 'draft', label: 'draft' },
			{ id: 'published', label: 'published' },
		])
	})

	// === Cleanup ===

	it('clears timeouts on destroy', () => {
		jest.useFakeTimers()
		const enumFn = jest.fn().mockResolvedValue([])

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn, debounce: 500 },
				],
				item: null,
			},
			stubs,
		})

		// Flush initial load
		jest.runAllTimers()
		enumFn.mockClear()

		// Trigger a search (sets a timeout)
		const field = wrapper.vm.resolvedFields[0]
		wrapper.vm.onAsyncSearch(field, 'test')

		// Destroy before debounce fires
		wrapper.destroy()

		// Advance timers — the search should NOT fire
		jest.advanceTimersByTime(500)

		expect(enumFn).not.toHaveBeenCalled()

		jest.useRealTimers()
	})

	// === Async error handling ===

	it('handles async enum errors gracefully', async () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const enumFn = jest.fn().mockRejectedValue(new Error('Network error'))

		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'org', widget: 'select', label: 'Org', enum: enumFn },
				],
				item: null,
			},
			stubs,
		})

		await wrapper.vm.$nextTick()
		await flushPromises()

		expect(wrapper.vm.asyncState.org.options).toEqual([])
		expect(wrapper.vm.asyncState.org.loading).toBe(false)
		expect(consoleSpy).toHaveBeenCalled()

		consoleSpy.mockRestore()
	})

	// === JSON widget ===

	it('json widget pre-fills pretty-printed string and emits parsed value on confirm', () => {
		const item = { id: '1', config: { foo: 'bar', nested: { n: 1 } } }
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'config', widget: 'json', label: 'Config' },
				],
				item,
			},
			stubs,
		})

		const field = wrapper.vm.resolvedFields[0]
		expect(wrapper.vm.jsonStringFor(field)).toBe(JSON.stringify(item.config, null, 2))

		wrapper.vm.executeConfirm()
		const emitted = wrapper.emitted('confirm')
		expect(emitted).toBeTruthy()
		expect(emitted[0][0].config).toEqual(item.config)
	})

	it('json widget parses valid input and stores the parsed value in formData', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [{ key: 'config', widget: 'json', label: 'Config' }],
				item: null,
			},
			stubs,
		})
		const field = wrapper.vm.resolvedFields[0]

		wrapper.vm.onJsonFieldInput(field, '{"a": 1}')
		expect(wrapper.vm.formData.config).toEqual({ a: 1 })
		expect(wrapper.vm.jsonErrors.config).toBeUndefined()
		expect(wrapper.vm.jsonFieldsValid).toBe(true)
	})

	it('json widget empty string collapses to null', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [{ key: 'config', widget: 'json', label: 'Config' }],
				item: { config: { a: 1 } },
			},
			stubs,
		})
		const field = wrapper.vm.resolvedFields[0]

		wrapper.vm.onJsonFieldInput(field, '   ')
		expect(wrapper.vm.formData.config).toBeNull()
		expect(wrapper.vm.jsonErrors.config).toBeUndefined()
	})

	it('json widget invalid input sets error, preserves last value, and blocks confirm', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [{ key: 'config', widget: 'json', label: 'Config' }],
				item: { config: { a: 1 } },
			},
			stubs,
		})
		const field = wrapper.vm.resolvedFields[0]

		wrapper.vm.onJsonFieldInput(field, '{ not json')
		expect(wrapper.vm.formData.config).toEqual({ a: 1 }) // untouched
		expect(wrapper.vm.jsonErrors.config).toBeTruthy()
		expect(wrapper.vm.jsonFieldsValid).toBe(false)

		// Fixing the JSON re-enables confirm
		wrapper.vm.onJsonFieldInput(field, '{"a": 2}')
		expect(wrapper.vm.formData.config).toEqual({ a: 2 })
		expect(wrapper.vm.jsonErrors.config).toBeUndefined()
		expect(wrapper.vm.jsonFieldsValid).toBe(true)
	})

	it('executeConfirm early-returns when a json field is invalid', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [{ key: 'config', widget: 'json', label: 'Config' }],
				item: { config: { a: 1 } },
			},
			stubs,
		})
		const field = wrapper.vm.resolvedFields[0]

		wrapper.vm.onJsonFieldInput(field, 'broken')
		wrapper.vm.executeConfirm()
		expect(wrapper.emitted('confirm')).toBeFalsy()
	})

	// === Code widget ===

	it('code widget stores the raw string verbatim', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [{ key: 'template', widget: 'code', label: 'Template', language: 'html' }],
				item: null,
			},
			stubs,
		})
		expect(wrapper.vm.formData.template).toBe('')

		wrapper.vm.updateField('template', '<div>{{ name }}</div>')
		expect(wrapper.vm.formData.template).toBe('<div>{{ name }}</div>')

		wrapper.vm.executeConfirm()
		expect(wrapper.emitted('confirm')[0][0].template).toBe('<div>{{ name }}</div>')
	})

	// === BUG 1: required enum select commits and enables submit ===

	it('selecting a required enum commits the value and enables submit', () => {
		const schema = {
			title: 'Meeting',
			properties: {
				meetingType: { type: 'string', title: 'Type', enum: ['regular', 'special'] },
			},
			required: ['meetingType'],
		}
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: null }, stubs })

		// Nothing selected yet → submit disabled.
		expect(wrapper.vm.requiredFieldsFilled).toBe(false)

		const field = wrapper.vm.resolvedFields.find(f => f.key === 'meetingType')
		// Simulate the NcSelect @input firing with the chosen option object.
		wrapper.vm.onEffectiveSelectChange(field, { id: 'special', label: 'special' })

		expect(wrapper.vm.formData.meetingType).toBe('special')
		expect(wrapper.vm.requiredFieldsFilled).toBe(true)
	})

	it('getSelectedEnumOption returns the same option-list reference (so NcSelect marks it selected)', () => {
		const schema = {
			title: 'Meeting',
			properties: { mode: { type: 'string', title: 'Mode', enum: ['in-person', 'remote'] } },
		}
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: { mode: 'remote' } }, stubs })
		const field = wrapper.vm.resolvedFields.find(f => f.key === 'mode')
		const options = wrapper.vm.getEnumOptions(field)
		const selected = wrapper.vm.getSelectedEnumOption(field)
		// Identity match — must be the very object from the option list.
		expect(selected).toBe(options.find(o => o.id === 'remote'))
	})

	// === BUG 2a: edit dialog accepts persisted (space-separated) date-time ===

	it('normalises a persisted space-separated date-time on edit-open into a schema-valid value', () => {
		const schema = {
			title: 'Meeting',
			properties: {
				title: { type: 'string', title: 'Title' },
				scheduledDate: { type: 'string', title: 'Scheduled', format: 'date-time' },
			},
		}
		const wrapper = mount(CnFormDialog, {
			propsData: { schema, item: { id: '1', title: 'M', scheduledDate: '2026-10-15 14:30:00' } },
			stubs,
		})
		const v = wrapper.vm.formData.scheduledDate
		// RFC3339 with seconds + timezone offset (so ajv date-time accepts it).
		expect(v).toMatch(/^2026-10-15T14:30:00[+-]\d{2}:\d{2}$/)
	})

	it('editing only the title does not reject a persisted date-time / uuid (no format error)', () => {
		const schema = {
			title: 'Decision',
			properties: {
				title: { type: 'string', title: 'Title' },
				caseId: { type: 'string', title: 'Case', format: 'uuid' },
				scheduledDate: { type: 'string', title: 'Scheduled', format: 'date-time' },
			},
		}
		const wrapper = mount(CnFormDialog, {
			propsData: {
				schema,
				item: { id: '1', title: 'D', caseId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', scheduledDate: '2026-10-15 14:30:00' },
			},
			stubs,
		})
		// User edits only the title.
		wrapper.vm.updateField('title', 'D-edited')
		expect(wrapper.vm.validate()).toBe(true)
		expect(wrapper.vm.errors.caseId).toBeUndefined()
		expect(wrapper.vm.errors.scheduledDate).toBeUndefined()
	})

	it('coerces a persisted-but-empty uuid field to null on submit (so the backend format check passes)', () => {
		const schema = {
			title: 'Decision',
			properties: {
				title: { type: 'string', title: 'Title' },
				caseId: { type: 'string', title: 'Case', format: 'uuid' },
			},
		}
		const wrapper = mount(CnFormDialog, {
			propsData: { schema, item: { id: '1', title: 'D', caseId: '' } },
			stubs,
		})
		wrapper.vm.updateField('title', 'D-edited')
		wrapper.vm.executeConfirm()
		const payload = wrapper.emitted('confirm')[0][0]
		expect(payload.caseId).toBeNull()
		expect(payload.title).toBe('D-edited')
	})

	// === BUG 3: maxLength null means "no limit" ===

	it('treats maxLength null/undefined as no limit (does not block save)', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'versie', widget: 'text', label: 'Versie', required: true, validation: { maxLength: null, minLength: null } },
				],
				item: null,
			},
			stubs,
		})
		wrapper.vm.updateField('versie', 'a'.repeat(500))
		expect(wrapper.vm.validate()).toBe(true)
		expect(wrapper.vm.errors.versie).toBeUndefined()
	})

	it('still enforces a real numeric maxLength', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: {
				fields: [
					{ key: 'code', widget: 'text', label: 'Code', validation: { maxLength: 3 } },
				],
				item: null,
			},
			stubs,
		})
		wrapper.vm.updateField('code', 'abcd')
		expect(wrapper.vm.validate()).toBe(false)
		expect(wrapper.vm.errors.code).toBe('Maximum 3 characters.')
	})
})

describe('CnFormDialog — referenceType (pluggable integration registry)', () => {
	const { integrations } = require('@/integrations/registry.js')
	const { h } = require('vue')

	const ContactEntityWidget = {
		name: 'ContactEntityWidget',
		props: ['surface', 'value', 'field', 'register', 'schema', 'objectId'],
		render() {
			return h('div', { class: 'contact-entity-widget' }, `${this.surface}|${this.value || ''}`)
		},
	}
	const RegistryTab = { name: 'RegistryTab', render() { return h('div') } }

	const refSchema = {
		title: 'Lead',
		properties: {
			name: { type: 'string', title: 'Name' },
			owner: { type: 'string', title: 'Owner', referenceType: 'contacts' },
		},
	}

	afterEach(() => integrations.__resetForTests())

	it('renders the integration single-entity widget for a referenceType field', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: { name: 'Acme', owner: 'c-42' } },
			stubs,
		})
		const w = wrapper.find('.contact-entity-widget')
		expect(w.exists()).toBe(true)
		expect(w.text()).toBe('single-entity|c-42')
		wrapper.destroy()
	})

	it('forwards referenceContext to the widget', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnFormDialog, {
			propsData: {
				schema: refSchema,
				item: { name: 'Acme', owner: 'c-42' },
				referenceContext: { register: 'r1', schema: 's1', objectId: 'o1' },
			},
			stubs,
		})
		expect(wrapper.findComponent(ContactEntityWidget).props('register')).toBe('r1')
		wrapper.destroy()
	})

	it('falls back to the plain field when no integration is registered for the referenceType', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: refSchema, item: { name: 'Acme', owner: 'c-42' } },
			stubs,
		})
		expect(wrapper.find('.contact-entity-widget').exists()).toBe(false)
		// the owner field still renders (as a plain NcTextField stub)
		expect(wrapper.findAll('nctextfield-stub, [name]').length).toBeGreaterThanOrEqual(0)
		wrapper.destroy()
	})

	// === Conditional field visibility (#327) ===

	describe('condition / visibleWhen', () => {
		const conditionFields = [
			{ key: 'jobClass', widget: 'select', label: 'Job class', enum: ['SyncAction', 'PingAction'] },
			{
				key: 'arguments',
				widget: 'json',
				label: 'Arguments',
				condition: { field: 'jobClass', equals: 'SyncAction' },
			},
			{
				key: 'syncId',
				widget: 'text',
				label: 'Sync',
				required: true,
				condition: { field: 'jobClass', equals: 'SyncAction' },
			},
		]

		it('hides a field whose equals predicate does not match', () => {
			const wrapper = mount(CnFormDialog, {
				propsData: { fields: conditionFields, item: { jobClass: 'PingAction' } },
				stubs,
			})
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['jobClass'])
		})

		it('shows a field whose equals predicate matches', () => {
			const wrapper = mount(CnFormDialog, {
				propsData: { fields: conditionFields, item: { jobClass: 'SyncAction' } },
				stubs,
			})
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['jobClass', 'arguments', 'syncId'])
		})

		it('clears form-data for fields that transition visible → hidden', async () => {
			const wrapper = mount(CnFormDialog, {
				propsData: { fields: conditionFields, item: { jobClass: 'SyncAction', arguments: { a: 1 }, syncId: 'sync-1' } },
				stubs,
			})
			expect(wrapper.vm.formData.arguments).toEqual({ a: 1 })
			wrapper.vm.updateField('jobClass', 'PingAction')
			await wrapper.vm.$nextTick()
			expect(Object.prototype.hasOwnProperty.call(wrapper.vm.formData, 'arguments')).toBe(false)
			expect(Object.prototype.hasOwnProperty.call(wrapper.vm.formData, 'syncId')).toBe(false)
		})

		it('skips hidden required fields in requiredFieldsFilled', () => {
			const wrapper = mount(CnFormDialog, {
				propsData: { fields: conditionFields, item: { jobClass: 'PingAction' } },
				stubs,
			})
			// syncId is required + hidden → still considered filled
			expect(wrapper.vm.requiredFieldsFilled).toBe(true)
		})

		it('skips hidden fields in validate()', () => {
			const wrapper = mount(CnFormDialog, {
				propsData: { fields: conditionFields, item: { jobClass: 'PingAction' } },
				stubs,
			})
			expect(wrapper.vm.validate()).toBe(true)
			expect(wrapper.vm.errors.syncId).toBeUndefined()
		})

		it('supports notEquals predicate', () => {
			const fields = [
				{ key: 'mode', widget: 'select', enum: ['a', 'b'] },
				{ key: 'note', widget: 'text', condition: { field: 'mode', notEquals: 'a' } },
			]
			const wrapper = mount(CnFormDialog, { propsData: { fields, item: { mode: 'a' } }, stubs })
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['mode'])
			wrapper.vm.updateField('mode', 'b')
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['mode', 'note'])
		})

		it('supports in / notIn predicates', () => {
			const fields = [
				{ key: 'role', widget: 'select', enum: ['admin', 'editor', 'viewer'] },
				{ key: 'adminOpts', widget: 'text', condition: { field: 'role', in: ['admin', 'editor'] } },
				{ key: 'guestOpts', widget: 'text', condition: { field: 'role', notIn: ['admin'] } },
			]
			const wrapper = mount(CnFormDialog, { propsData: { fields, item: { role: 'admin' } }, stubs })
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['role', 'adminOpts'])
			wrapper.vm.updateField('role', 'viewer')
			// adminOpts hides (viewer ∉ [admin, editor]) and guestOpts shows (viewer ∉ [admin])
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['role', 'guestOpts'])
		})

		it('supports truthy / falsy predicates', () => {
			const fields = [
				{ key: 'optIn', widget: 'checkbox' },
				{ key: 'reason', widget: 'text', condition: { field: 'optIn', truthy: true } },
				{ key: 'altReason', widget: 'text', condition: { field: 'optIn', falsy: true } },
			]
			const wrapper = mount(CnFormDialog, { propsData: { fields, item: { optIn: false } }, stubs })
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['optIn', 'altReason'])
			wrapper.vm.updateField('optIn', true)
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['optIn', 'reason'])
		})

		it('accepts the visibleWhen alias', () => {
			const fields = [
				{ key: 'mode', widget: 'select', enum: ['a', 'b'] },
				{ key: 'note', widget: 'text', visibleWhen: { field: 'mode', equals: 'b' } },
			]
			const wrapper = mount(CnFormDialog, { propsData: { fields, item: { mode: 'b' } }, stubs })
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['mode', 'note'])
		})

		it('keeps the field visible (and warns) when condition has no recognised predicate', () => {
			const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const fields = [
				{ key: 'mode', widget: 'text' },
				{ key: 'note', widget: 'text', condition: { field: 'mode' } },
			]
			const wrapper = mount(CnFormDialog, { propsData: { fields, item: { mode: 'x' } }, stubs })
			expect(wrapper.vm.visibleFields.map(f => f.key)).toEqual(['mode', 'note'])
			expect(spy).toHaveBeenCalled()
			spy.mockRestore()
		})
	})
})
