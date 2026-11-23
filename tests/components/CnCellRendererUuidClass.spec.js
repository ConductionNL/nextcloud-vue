/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The monospace uuid style follows the DISPLAYED value, not the property's
 * format alone. A case type column is `format: "uuid"` in the schema, but a
 * formatter resolves it to the type's name; that name was drawn as code.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-resolved-reference-is-not-drawn-as-a-uuid
 */
import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const UUID = '0b9a2f3e-6d1c-4a7b-9e2f-1c3d5e7f9a1b'

describe('CnCellRenderer — uuid class follows the displayed value', () => {
	it('keeps the uuid style for a raw uuid', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: UUID, property: { type: 'string', format: 'uuid' } },
		})
		expect(wrapper.classes()).toContain('cn-cell-renderer--uuid')
	})

	it('drops the uuid style when a formatter resolved the value to a name', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: {
				value: UUID,
				property: { type: 'string', format: 'uuid' },
				formatter: 'typeName',
			},
			provide: { cnFormatters: { typeName: () => 'Woo request' } },
		})
		expect(wrapper.text()).toBe('Woo request')
		expect(wrapper.classes()).not.toContain('cn-cell-renderer--uuid')
	})

	it('drops the uuid style when the value is not a uuid', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: { value: 'Woo request', property: { type: 'string', format: 'uuid' } },
		})
		expect(wrapper.classes()).not.toContain('cn-cell-renderer--uuid')
	})

	it('drops the uuid style for a resolving widget', () => {
		const wrapper = mount(CnCellRenderer, {
			propsData: {
				value: UUID,
				property: { type: 'string', format: 'uuid' },
				widget: 'fkResolve',
				widgetProps: { register: 'r', schema: 's' },
			},
		})
		expect(wrapper.classes()).not.toContain('cn-cell-renderer--uuid')
	})
})
