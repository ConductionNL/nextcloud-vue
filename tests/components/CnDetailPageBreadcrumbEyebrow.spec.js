/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can drop the type eyebrow (`showTypeEyebrow: false`) and
 * draw a breadcrumb line above the header (`breadcrumb`): the list the
 * record belongs to, then the record. Both default to today's rendering.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-detail-page-drops-its-eyebrow-and-shows-a-breadcrumb
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function storeWith(object) {
	return {
		objects: { 'reg-case': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

const NcBreadcrumbsStub = { name: 'NcBreadcrumbs', template: '<nav class="nc-breadcrumbs-stub"><slot /></nav>' }
const NcBreadcrumbStub = {
	name: 'NcBreadcrumb',
	props: ['name', 'to', 'href'],
	template: '<span class="crumb" :data-to="to ? to.name : null" :data-href="href || null">{{ name }}</span>',
}

function mountPage(propsData, provide = {}) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: storeWith({ name: '2026-0082' }),
			...propsData,
		},
		global: { stubs: { NcBreadcrumbs: NcBreadcrumbsStub, NcBreadcrumb: NcBreadcrumbStub }, provide },
	})
}

describe('CnDetailPage — type eyebrow switch and breadcrumb', () => {
	it('draws the eyebrow and no breadcrumb by default', () => {
		const w = mountPage({})
		expect(w.find('[data-testid="cn-detail-page-type-eyebrow"]').text()).toBe('Case')
		expect(w.find('[data-testid="cn-detail-page-breadcrumbs"]').exists()).toBe(false)
	})

	it('drops the eyebrow with showTypeEyebrow: false', () => {
		const w = mountPage({ showTypeEyebrow: false })
		expect(w.find('[data-testid="cn-detail-page-type-eyebrow"]').exists()).toBe(false)
		expect(w.find('.cn-detail-page__title').text()).toBe('2026-0082')
	})

	it('draws the list crumb as a router target and the record as the current crumb', () => {
		const w = mountPage(
			{ breadcrumb: { label: 'All cases', route: 'Cases', params: { view: 'all' } } },
			{ cnTranslate: (key) => (key === 'All cases' ? 'Alle zaken' : key) },
		)
		const crumbs = w.findAll('.crumb')
		expect(crumbs.map((c) => c.text())).toEqual(['Alle zaken', '2026-0082'])
		expect(crumbs[0].attributes('data-to')).toBe('Cases')
		expect(w.vm.breadcrumbCrumbs[0].to).toEqual({ name: 'Cases', params: { view: 'all' } })
	})

	it('takes an href when there is no route', () => {
		const w = mountPage({ breadcrumb: { label: 'All cases', href: '/apps/dossiq/cases' } })
		expect(w.vm.breadcrumbCrumbs[0]).toEqual({ label: 'All cases', href: '/apps/dossiq/cases' })
	})
})
