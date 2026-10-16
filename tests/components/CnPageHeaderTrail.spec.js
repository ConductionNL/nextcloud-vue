/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list, dashboard or settings page can show a breadcrumb and a meta note
 * under its title, drawn as the detail header's breadcrumb row
 * (page-header-breadcrumb): "Instellingen / Zaaktypen · 12 zaaktypen".
 *
 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), put: jest.fn() } }))

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnPageHeader from '../../src/components/CnPageHeader/CnPageHeader.vue'
import CnSettingsPage from '../../src/components/CnSettingsPage/CnSettingsPage.vue'

const Crumbs = {
	name: 'CnBreadcrumbs',
	props: ['crumbs', 'separator', 'rootText'],
	template: '<nav class="crumbs" :data-separator="separator">{{ crumbs.map((c) => c.label + (c.to ? "@" + c.to.name : "") + (c.href ? "@" + c.href : "")).join("|") }}</nav>',
}

const global = { stubs: { CnBreadcrumbs: Crumbs }, mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'x' } } }

describe('CnPageHeader breadcrumb and meta', () => {
	it('draws the declared crumb, the title as current crumb, a dot and the meta', () => {
		const w = mount(CnPageHeader, {
			props: { title: 'Zaaktypen', breadcrumb: { label: 'Instellingen', route: 'Settings' }, meta: '12 zaaktypen' },
			global,
		})
		const trail = w.find('[data-testid="cn-header-trail"]')
		expect(trail.classes()).toContain('cn-detail-page__header-row2')
		expect(trail.find('.crumbs').text()).toBe('Instellingen@Settings|Zaaktypen')
		expect(trail.find('.crumbs').attributes('data-separator')).toBe('/')
		expect(trail.find('.cn-detail-page__header-dot').exists()).toBe(true)
		expect(trail.find('[data-testid="cn-header-trail-meta"]').text()).toBe('12 zaaktypen')
	})

	it('takes a list of crumbs, a href and a separator of its own', () => {
		const w = mount(CnPageHeader, {
			props: { title: 'Afdelingen', breadcrumb: [{ label: 'Beheer', href: '/beheer', separator: '›' }, { label: 'Organisatie', route: 'Org' }] },
			global,
		})
		expect(w.find('.crumbs').text()).toBe('Beheer@/beheer|Organisatie@Org|Afdelingen')
		expect(w.find('.crumbs').attributes('data-separator')).toBe('›')
		expect(w.find('.cn-detail-page__header-dot').exists()).toBe(false)
	})

	it('draws the meta alone without a breadcrumb, and nothing without either', () => {
		const alone = mount(CnPageHeader, { props: { title: 'T', meta: 'Note' }, global })
		expect(alone.find('.crumbs').exists()).toBe(false)
		expect(alone.find('[data-testid="cn-header-trail-meta"]').text()).toBe('Note')
		const none = mount(CnPageHeader, { props: { title: 'T' }, global })
		expect(none.find('[data-testid="cn-header-trail"]').exists()).toBe(false)
	})

	it('translates the crumb labels and the meta', () => {
		const w = mount(CnPageHeader, {
			props: { title: 'Cases', breadcrumb: { label: 'Settings' }, meta: 'Note', translate: (key) => `nl:${key}` },
			global,
		})
		expect(w.find('.crumbs').text()).toBe('nl:Settings|nl:Cases')
		expect(w.find('[data-testid="cn-header-trail-meta"]').text()).toBe('nl:Note')
	})

	it('draws no trail on a visually hidden header', () => {
		const w = mount(CnPageHeader, { props: { title: 'T', breadcrumb: { label: 'A' }, meta: 'm', visuallyHidden: true }, global })
		expect(w.find('[data-testid="cn-header-trail"]').exists()).toBe(false)
	})
})

describe('pages forward config.breadcrumb and config.headerMeta', () => {
	it('an index page fills the list counts into the meta', () => {
		const w = mount(CnIndexPage, {
			props: {
				title: 'AVG-verzoeken',
				schema: { title: 'Case', properties: {} },
				objects: [{ id: 1 }, { id: 2 }],
				pagination: { page: 1, pages: 1, total: 12, limit: 20 },
				showTitle: true,
				breadcrumb: { label: 'Privacy', route: 'Privacy' },
				headerMeta: '{total} lopend',
			},
			global: { ...global, stubs: { ...global.stubs, CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnIndexSidebar: true, CnContextMenu: true, CnRowActions: true } },
		})
		expect(w.find('.crumbs').text()).toBe('Privacy@Privacy|AVG-verzoeken')
		expect(w.find('[data-testid="cn-header-trail-meta"]').text()).toBe('12 lopend')
	})

	it('a settings page passes both to its header', () => {
		const w = mount(CnSettingsPage, {
			props: { title: 'Zaaktypen', sections: [], showTitle: true, breadcrumb: { label: 'Instellingen', route: 'Settings' }, headerMeta: 'Geldt voor de hele organisatie' },
			global: { ...global, stubs: { ...global.stubs, CnSettingsCard: true, CnSettingsSection: true } },
		})
		expect(w.find('.crumbs').text()).toBe('Instellingen@Settings|Zaaktypen')
		expect(w.find('[data-testid="cn-header-trail-meta"]').text()).toBe('Geldt voor de hele organisatie')
	})

	it('a dashboard page draws the trail under its title', () => {
		const w = mount(CnDashboardPage, {
			props: { title: 'Instellingen', widgets: [], layout: [], breadcrumb: { label: 'Beheer', route: 'Admin' }, headerMeta: 'Alle onderdelen' },
			global: { ...global, stubs: { ...global.stubs, CnDashboardGrid: true } },
		})
		const header = w.find('[data-testid="cn-dashboard-page-header"]')
		expect(header.find('.crumbs').text()).toBe('Beheer@Admin|Instellingen')
		expect(header.find('[data-testid="cn-header-trail-meta"]').text()).toBe('Alle onderdelen')
	})

	it('draws nothing on any page without a breadcrumb or meta', () => {
		const w = mount(CnDashboardPage, { props: { title: 'Dash', widgets: [], layout: [] }, global: { ...global, stubs: { ...global.stubs, CnDashboardGrid: true } } })
		expect(w.find('[data-testid="cn-header-trail"]').exists()).toBe(false)
	})
})
