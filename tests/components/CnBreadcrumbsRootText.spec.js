/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * NcBreadcrumbs draws its first crumb as a home icon and prints the label
 * only as the accessible name, so "All cases" read as a house. `rootText`
 * passes an empty `rootIcon` so the label prints; a detail page whose
 * `breadcrumb` declares a label sets it, unless the breadcrumb declares an
 * `icon`. The real NcBreadcrumbs is measured in e2e/pixel-gaps-2.e2e.js.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-declared-breadcrumb-label-shows-as-text
 */
import { mount } from '@vue/test-utils'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const CRUMBS = [{ label: 'All cases', to: { name: 'Cases' } }, { label: '2026-0082' }]

describe('CnBreadcrumbs: rootText', () => {
	it('leaves NcBreadcrumbs its home icon by default', () => {
		const w = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		expect(w.find('[data-testid="cn-breadcrumbs"]').attributes('rooticon')).toBeUndefined()
	})

	it('passes an empty root icon with rootText, so the label prints', () => {
		const w = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS, rootText: true } })
		expect(w.find('[data-testid="cn-breadcrumbs"]').attributes('rooticon')).toBe('')
	})
})

describe('CnDetailPage: the declared breadcrumb label shows as text', () => {
	const store = {
		objects: { 'reg-case': { 'id-1': { name: '2026-0082' } } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const mountPage = (breadcrumb) => mount(CnDetailPage, {
		propsData: { title: 'Case', register: 'reg', schema: 'case', objectId: 'id-1', objectStore: store, breadcrumb },
	})

	it('draws no breadcrumb without the key', () => {
		expect(mountPage(null).findComponent(CnBreadcrumbs).exists()).toBe(false)
	})

	it('sets rootText for a declared label', () => {
		const crumbs = mountPage({ label: 'All cases', route: 'Cases' }).findComponent(CnBreadcrumbs)
		expect(crumbs.props('rootText')).toBe(true)
		expect(crumbs.props('crumbs')[0]).toEqual({ label: 'All cases', to: { name: 'Cases' } })
	})

	it('draws the declared icon instead, with rootText off', () => {
		const crumbs = mountPage({ label: 'All cases', route: 'Cases', icon: 'Home' }).findComponent(CnBreadcrumbs)
		expect(crumbs.props('rootText')).toBe(false)
		expect(crumbs.props('crumbs')[0].icon).toBe('Home')
	})
})
