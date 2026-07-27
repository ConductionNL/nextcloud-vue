/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDashboardPage's `bodyWidgets` primitive — declarative IN-BODY
 * sections that host a registered host-app component ALONGSIDE the widget grid,
 * with token-resolved props (`@workspace.*` / `@config.*`), placement
 * (before-grid / after-grid / end), and the injectable section context. Reuses
 * CnBodySections, the same primitive CnDetailPage mounts.
 */

import { mount } from '@vue/test-utils'
import { h, inject } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

// A host-app section component (e.g. a bespoke funnel chart) that echoes its
// received props so the test can assert token resolution.
const PropsEcho = {
	name: 'PropsEcho',
	props: ['period', 'currency', 'maybe'],
	render() {
		return h('div', { class: 'props-echo' }, `${this.period}|${this.currency}|${this.maybe === undefined ? 'UNDEF' : this.maybe}`)
	},
}

// A section component that reads the injected cnSectionContext.
const ContextEcho = {
	name: 'ContextEcho',
	setup() {
		const ctx = inject('cnSectionContext', null)
		return { ctx }
	},
	render() {
		const v = this.ctx
		return h('div', { class: 'context-echo' }, v ? `${v.register}|${v.schema}|${(v.config && v.config.currency) || ''}` : 'NO-CTX')
	},
}

function mountDash(bodyWidgets, extra = {}) {
	return mount(CnDashboardPage, {
		propsData: { title: 'Analytics', bodyWidgets, ...extra },
		provide: {
			cnRegistry: extra.registry || {},
			cnCustomComponents: extra.customComponents || {},
		},
		stubs: { CnDashboardGrid: true },
	})
}

describe('CnDashboardPage — bodyWidgets (in-body sections)', () => {
	it('renders nothing when bodyWidgets is omitted / empty', () => {
		const wrapper = mount(CnDashboardPage, { propsData: { title: 'D' }, stubs: { CnDashboardGrid: true } })
		expect(wrapper.find('[data-testid="cn-body-sections"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('resolves a registered component (v2 registry) and renders it in the body', () => {
		const registry = { FunnelChart: { kind: 'section', component: PropsEcho } }
		const wrapper = mountDash(
			[{ id: 'funnel', component: 'FunnelChart', title: 'Funnel', props: { period: 'Q1' } }],
			{ registry },
		)
		const echo = wrapper.find('.props-echo')
		expect(echo.exists()).toBe(true)
		expect(echo.text()).toContain('Q1')
		wrapper.unmount()
	})

	it('resolves from the legacy customComponents map', () => {
		const wrapper = mountDash(
			[{ component: 'LegacyChart' }],
			{ customComponents: { LegacyChart: PropsEcho } },
		)
		expect(wrapper.find('.props-echo').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders an inline error for an unresolved component without throwing', () => {
		const wrapper = mountDash([{ id: 'nope', component: 'DoesNotExist' }])
		expect(wrapper.find('[data-testid="cn-body-section-error-nope"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-dashboard-page"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('places sections by placement: before-grid / after-grid / end', () => {
		const registry = { C: { kind: 'section', component: PropsEcho } }
		const wrapper = mountDash([
			{ id: 'top', component: 'C', placement: 'before-grid' },
			{ id: 'bottom', component: 'C', placement: 'after-grid' },
			{ id: 'tail', component: 'C' }, // no placement → end
		], { registry })
		// before-grid host carries the top section, after-grid the bottom,
		// end host the unplaced one.
		expect(wrapper.find('[data-testid="cn-dashboard-body-sections-before-grid"] [data-section-id="top"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-dashboard-body-sections-after-grid"] [data-section-id="bottom"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-dashboard-body-sections-end"] [data-section-id="tail"]').exists()).toBe(true)
		// The before-grid section must NOT also appear in the end host.
		expect(wrapper.find('[data-testid="cn-dashboard-body-sections-end"] [data-section-id="top"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('token-resolves props against workspace + config and drops unresolved optionals', () => {
		const registry = { C: { kind: 'section', component: PropsEcho } }
		const wrapper = mountDash([
			{
				id: 's',
				component: 'C',
				placement: 'before-grid',
				props: {
					period: '@workspace.period',
					currency: '@config.currency',
					maybe: '@workspace.nope?',
				},
			},
		], {
			registry,
			appConfig: { currency: 'USD' },
			pageFilters: [{ key: 'period', label: 'Period', options: [{ value: 'Q1', label: 'Q1' }], default: 'Q1' }],
		})
		const echo = wrapper.find('.props-echo')
		// period from workspace (seeded by the page filter default), currency from
		// config, optional unresolved workspace token dropped (child sees undefined).
		expect(echo.text()).toBe('Q1|USD|UNDEF')
		wrapper.unmount()
	})

	it('provides config on cnSectionContext for components that inject', () => {
		const registry = { Ctx: { kind: 'section', component: ContextEcho } }
		const wrapper = mountDash(
			[{ id: 'ctx', component: 'Ctx', placement: 'before-grid' }],
			{ registry, appConfig: { currency: 'JPY' }, integrationContext: { register: 'reg', schema: 'sch' } },
		)
		expect(wrapper.find('.context-echo').text()).toBe('reg|sch|JPY')
		wrapper.unmount()
	})
})
