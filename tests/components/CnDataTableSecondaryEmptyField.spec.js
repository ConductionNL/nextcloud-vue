/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `secondary` template drops a field without a value together with the
 * separator in front of it: "{identifier} · {requester}" with no requester
 * read "2026-0002 ·" on :8080. A template whose fields all have values fills
 * exactly as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-empty-field-takes-its-separator-with-it
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

function secondaryOf(row, secondary) {
	const wrapper = mount(CnDataTable, {
		propsData: { rows: [{ id: '1', title: 'A case', ...row }], columns: [{ key: 'title', label: 'Case', secondary }], rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
	const line = wrapper.find('[data-testid="cn-cell-secondary"]')
	return line.exists() ? line.text() : null
}

describe('CnDataTable: an empty field takes its separator with it', () => {
	it('fills a template whose fields all have values as before', () => {
		expect(secondaryOf({ identifier: '2026-0002', requester: 'S. de Vries' }, '{identifier} · {requester}')).toBe('2026-0002 · S. de Vries')
	})

	it('drops the trailing separator of an empty last field', () => {
		expect(secondaryOf({ identifier: '2026-0002', requester: '' }, '{identifier} · {requester}')).toBe('2026-0002')
	})

	it('drops the leading separator of an empty first field', () => {
		expect(secondaryOf({ identifier: '', requester: 'S. de Vries' }, '{identifier} · {requester}')).toBe('S. de Vries')
	})

	it('keeps the separator before the next field when a middle one is empty', () => {
		expect(secondaryOf({ a: 'one', b: null, c: 'three' }, '{a} · {b} / {c}')).toBe('one / three')
	})

	it('draws no line when every field is empty', () => {
		expect(secondaryOf({ identifier: '', requester: '' }, '{identifier} · {requester}')).toBeNull()
	})
})
