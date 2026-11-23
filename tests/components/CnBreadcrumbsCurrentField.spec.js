/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's case page ends its trail in the case number and draws "/"
 * between the crumbs. `breadcrumb.currentField` names the field for the
 * current crumb and `breadcrumb.separator` (CnBreadcrumbs `separator`) the
 * text between the crumbs. Without them the trail ends in the display name
 * with NcBreadcrumbs' chevrons, as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-breadcrumb-can-name-the-record-by-a-field-and-use-a-text-separator
 */
import { mount } from '@vue/test-utils'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const CRUMBS = [{ label: 'All cases', to: { name: 'Cases' } }, { label: '2026-0082' }]

describe('CnBreadcrumbs: separator', () => {
	it('keeps the chevrons without a separator', () => {
		const w = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		const nav = w.find('[data-testid="cn-breadcrumbs"]')
		expect(nav.classes()).not.toContain('cn-breadcrumbs--text-separator')
		expect(nav.attributes('style') || '').not.toContain('--cn-breadcrumbs-separator')
	})

	it('hands a text separator to the stylesheet', () => {
		const w = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS, separator: '/' } })
		const nav = w.find('[data-testid="cn-breadcrumbs"]')
		expect(nav.classes()).toContain('cn-breadcrumbs--text-separator')
		expect(nav.attributes('style')).toContain('--cn-breadcrumbs-separator: "/"')
	})
})

describe('CnDetailPage: breadcrumb currentField and separator', () => {
	const store = {
		objects: { 'reg-case': { 'id-1': { name: 'Lighting Lindelaan', identifier: '2026-0082' }, 'id-2': { name: 'Parking permits', identifier: '' } } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const mountPage = (breadcrumb, objectId = 'id-1') => mount(CnDetailPage, {
		propsData: { title: 'Case', register: 'reg', schema: 'case', objectId, objectStore: store, breadcrumb },
	})

	it('ends in the display name with chevrons without the keys', () => {
		const crumbs = mountPage({ label: 'All cases', route: 'Cases' }).findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')[1]).toEqual({ label: 'Lighting Lindelaan' })
		expect(crumbs.props('separator')).toBe('')
	})

	it('ends in the case number after a slash with the keys', () => {
		const crumbs = mountPage({ label: 'All cases', route: 'Cases', currentField: 'identifier', separator: '/' }).findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')[1]).toEqual({ label: '2026-0082' })
		expect(crumbs.props('separator')).toBe('/')
	})

	it('falls back to the display name when the field is empty', () => {
		const crumbs = mountPage({ label: 'All cases', route: 'Cases', currentField: 'identifier' }, 'id-2').findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')[1]).toEqual({ label: 'Parking permits' })
	})
})
