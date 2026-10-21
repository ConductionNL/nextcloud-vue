/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnConditionTreeEditor: AND/OR groups of conditions to any depth, a field
 * that resets its condition, a debounced preview count from the app's
 * endpoint, and a validation error shown at the node its path names.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnConditionTreeEditor, { tallyConditions } from '../../src/components/CnConditionTreeEditor/CnConditionTreeEditor.vue'

const fields = [
	{ value: 'city', label: 'City', type: 'string' },
	{ value: 'age', label: 'Age', type: 'integer' },
	{ value: 'active', label: 'Active', type: 'boolean' },
	{ value: 'createdAt', label: 'Created', type: 'string', format: 'date' },
]

/**
 * Mount the editor with v-model wired to a local value.
 *
 * @param {object} tree The starting tree.
 * @param {object} [props] More props.
 * @return {{wrapper: object, value: () => object}}
 */
function mountEditor(tree, props = {}) {
	let current = tree
	const wrapper = mount(CnConditionTreeEditor, {
		propsData: {
			modelValue: tree,
			fieldOptions: fields,
			...props,
			'onUpdate:modelValue': (next) => {
				current = next
			},
		},
		global: { provide: { cnTranslate: (s) => `[${s}]` } },
	})
	return { wrapper, value: () => current }
}

/**
 * A select stub by its data-testid.
 *
 * @param {object} wrapper The editor.
 * @param {string} testid The test id.
 * @return {object}
 */
function select(wrapper, testid) {
	return wrapper.findAllComponents({ name: 'NcSelect' }).find((c) => c.attributes('data-testid') === testid)
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnConditionTreeEditor', () => {
	beforeEach(() => {
		jest.useRealTimers()
		axios.post.mockReset()
	})

	it('adds a condition and a nested group to the root', async () => {
		const { wrapper, value } = mountEditor({ type: 'AND', children: [] })
		await wrapper.find('[data-testid="cn-condition-add-$"]').trigger('click')
		expect(value().children).toEqual([{ field: '', operator: '', value: '' }])
		await wrapper.setProps({ modelValue: value() })
		await wrapper.find('[data-testid="cn-condition-add-group-$"]').trigger('click')
		expect(value().children[1]).toEqual({ type: 'AND', children: [{ field: '', operator: '', value: '' }] })
	})

	it('switches a group between all and any', async () => {
		const { wrapper, value } = mountEditor({ type: 'AND', children: [{ field: 'city', operator: 'equals', value: 'Delft' }] })
		select(wrapper, 'cn-condition-combinator-$').vm.$emit('update:modelValue', { value: 'OR' })
		expect(value().type).toBe('OR')
	})

	it('resets a condition to the first operator of a new field, and true for a yes/no field', async () => {
		const { wrapper, value } = mountEditor({ type: 'AND', children: [{ field: 'city', operator: 'contains', value: 'Del' }] })
		select(wrapper, 'cn-condition-field-$.children[0]').vm.$emit('update:modelValue', fields[2])
		expect(value().children[0]).toEqual({ field: 'active', operator: 'equals', value: true })
	})

	it('translates the field labels through the app and keeps a stored field it does not offer', () => {
		const { wrapper } = mountEditor({ type: 'AND', children: [{ field: 'legacy', operator: 'equals', value: 'x' }] })
		const vm = wrapper.findAllComponents({ name: 'CnConditionTreeNode' })[1].vm
		expect(vm.fieldSelectOptions.map((o) => o.label)).toEqual(['[City]', '[Age]', '[Active]', '[Created]', 'legacy'])
	})

	it('offers before and after on a date field', () => {
		const { wrapper } = mountEditor({ type: 'AND', children: [{ field: 'createdAt', operator: 'before', value: '2026-01-01' }] })
		const node = wrapper.findAllComponents({ name: 'CnConditionTreeNode' })[1].vm
		expect(node.operatorOptions.map((o) => o.value)).toEqual(['equals', 'notEquals', 'contains', 'before', 'after'])
		expect(node.valueKind).toBe('date')
	})

	it('counts the conditions and the unfinished ones', () => {
		expect(tallyConditions({ type: 'AND', children: [] })).toEqual({ leaves: 0, unfinished: 1 })
		expect(tallyConditions({ type: 'AND', children: [{ field: 'a', operator: 'equals', value: 0 }, { type: 'OR', children: [{ field: 'b', operator: '', value: 'x' }] }] })).toEqual({ leaves: 2, unfinished: 1 })
	})

	it('posts a finished tree to the preview endpoint and shows the count', async () => {
		jest.useFakeTimers()
		axios.post.mockResolvedValue({ data: { valid: true, estimatedSize: 42 } })
		const tree = { type: 'AND', children: [{ field: 'city', operator: 'equals', value: 'Delft' }] }
		const { wrapper } = mountEditor(tree, { previewEndpoint: { url: '/apps/x/api/segments/preview', body: { entityType: 'contact' }, countPath: 'estimatedSize' }, countLabel: 'Estimated members:' })
		expect(wrapper.vm.status).toBe('checking')
		jest.advanceTimersByTime(400)
		jest.useRealTimers()
		await flush()
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/x/api/segments/preview', { entityType: 'contact', rules: tree })
		expect(wrapper.find('[data-testid="cn-condition-tree-count"]').text()).toBe('42')
		expect(wrapper.text()).toContain('Estimated members:')
	})

	it('shows a validation error at the node its path names', async () => {
		jest.useFakeTimers()
		axios.post.mockResolvedValue({ data: { valid: false, error: '$.children[0]: field "city" is not declared.' } })
		const { wrapper } = mountEditor({ type: 'AND', children: [{ field: 'city', operator: 'equals', value: 'Delft' }] }, { previewEndpoint: { url: '/apps/x/api/p' } })
		jest.advanceTimersByTime(400)
		jest.useRealTimers()
		await flush()
		await flush()
		expect(wrapper.vm.status).toBe('invalid')
		expect(wrapper.find('[data-testid="cn-condition-$.children[0]"] [role="alert"]').text()).toBe('field "city" is not declared.')
	})

	it('is valid as it stands when complete and there is no preview endpoint', async () => {
		const { wrapper } = mountEditor({ type: 'AND', children: [{ field: 'age', operator: 'greaterThan', value: 18 }] })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.status).toBe('valid')
		expect(wrapper.emitted('validity-change').at(-1)).toEqual([true])
	})
})
