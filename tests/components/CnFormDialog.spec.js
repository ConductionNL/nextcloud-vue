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
})
