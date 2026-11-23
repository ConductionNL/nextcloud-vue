/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A form page can ask for a list of objects (`widget: sub-objects`), with a
 * row limit (`maxItems`): buildiq's product list in a journey form
 * (forms-multi-product-request T06).
 *
 * @spec openspec/changes/form-page-sub-objects/specs/form-page-sub-objects/spec.md
 */
import { mount } from '@vue/test-utils'
import CnSubObjectsField from '../../src/components/CnSubObjectsField/CnSubObjectsField.vue'
import { cnRenderFormField } from '../../src/composables/cnFormFieldRenderer.js'
import { validateFieldValue } from '../../src/utils/formValidation.js'

const ITEMS = { type: 'object', properties: { product: { type: 'string', title: 'Product', enum: ['parking', 'waste'] }, count: { type: 'integer', title: 'Count' } } }
const FIELD = { key: 'products', label: 'Products', type: 'array', widget: 'sub-objects', items: ITEMS, maxItems: 2, addLabel: 'Add product' }

describe('form page sub-objects', () => {
	it('renders a product list as CnSubObjectsField with its row schema and limit', () => {
		const onInput = jest.fn()
		const r = cnRenderFormField({ field: FIELD, value: [{ product: 'parking', count: 1 }], onInput })
		expect(r.kind).toBe('sub-objects')
		expect(r.tag).toBe(CnSubObjectsField)
		expect(r.props).toEqual({ modelValue: [{ product: 'parking', count: 1 }], items: ITEMS, inputLabel: 'Products', addLabel: 'Add product', maxItems: 2 })
		r.listeners['update:modelValue']([])
		expect(onInput).toHaveBeenCalledWith([])
	})

	it('takes an array of objects without the widget hint, and leaves other arrays to their own rendering', () => {
		expect(cnRenderFormField({ field: { key: 'p', type: 'array', items: ITEMS }, value: null, onInput: () => {} }).kind).toBe('sub-objects')
		expect(cnRenderFormField({ field: { key: 'tags', type: 'array', items: { type: 'string' } }, value: null, onInput: () => {} }).kind).toBe('fallback')
	})

	it('disables Add and Duplicate at the limit and says so', () => {
		const w = mount(CnSubObjectsField, { props: { modelValue: [{ product: 'parking' }, { product: 'waste' }], items: ITEMS, maxItems: 2 } })
		expect(w.find('[data-testid="cn-sub-objects-add"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-sub-objects-limit"]').text()).toContain('2')
		const room = mount(CnSubObjectsField, { props: { modelValue: [{ product: 'parking' }], items: ITEMS, maxItems: 2 } })
		expect(room.find('[data-testid="cn-sub-objects-limit"]').exists()).toBe(false)
	})

	it('needs at least one row when required', () => {
		expect(validateFieldValue({ type: 'array', validation: { required: true } }, [])).not.toBeNull()
		expect(validateFieldValue({ type: 'array', validation: { required: true } }, [{ product: 'parking' }])).toBeNull()
	})
})
