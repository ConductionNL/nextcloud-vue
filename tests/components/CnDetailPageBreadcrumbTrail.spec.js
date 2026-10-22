/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record page can sit more than one level deep: DqZaaktype reads
 * "Instellingen / Zaaktypen / Omgevingsvergunning regulier" and DqTenant
 * "Instellingen / Organisaties / Gemeente Waterland". `config.breadcrumb`
 * then takes a list of crumbs, as on a list page; the record follows them as
 * the current crumb. The last crumb's `currentField` and any crumb's
 * `separator` apply as with one crumb.
 *
 * @spec openspec/changes/detail-breadcrumb-trail/specs/detail-page/spec.md#requirement-a-record-page-breadcrumb-can-name-more-than-one-level
 */
import { mount } from '@vue/test-utils'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

describe('CnDetailPage: a breadcrumb trail', () => {
	const store = {
		objects: { 'reg-caseType': { 'id-1': { name: 'Omgevingsvergunning regulier', identifier: 'ZT-OMV-REG' } } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const mountPage = (breadcrumb) => mount(CnDetailPage, {
		propsData: { title: 'Case type', register: 'reg', schema: 'caseType', objectId: 'id-1', objectStore: store, breadcrumb },
	})

	it('draws every crumb of a list before the record', () => {
		const crumbs = mountPage([
			{ label: 'Settings', href: '/index.php/settings/admin/dossiq' },
			{ label: 'Case types', route: 'CaseTypes' },
		]).findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')).toEqual([
			{ label: 'Settings', href: '/index.php/settings/admin/dossiq' },
			{ label: 'Case types', to: { name: 'CaseTypes' } },
			{ label: 'Omgevingsvergunning regulier' },
		])
	})

	it('reads currentField and separator from the trail', () => {
		const crumbs = mountPage([
			{ label: 'Settings', href: '/settings', separator: '/' },
			{ label: 'Case types', route: 'CaseTypes', currentField: 'identifier' },
		]).findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')[2]).toEqual({ label: 'ZT-OMV-REG' })
		expect(crumbs.props('separator')).toBe('/')
	})

	it('draws nothing for an empty list', () => {
		expect(mountPage([]).findComponent(CnBreadcrumbs).exists()).toBe(false)
	})

	it('keeps one crumb as before', () => {
		const crumbs = mountPage({ label: 'Case types', route: 'CaseTypes' }).findComponent(CnBreadcrumbs)
		expect(crumbs.props('crumbs')).toEqual([
			{ label: 'Case types', to: { name: 'CaseTypes' } },
			{ label: 'Omgevingsvergunning regulier' },
		])
	})
})
