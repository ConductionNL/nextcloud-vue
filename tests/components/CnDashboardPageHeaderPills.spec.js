/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard can open the line under its title with pills that follow the
 * page's workspace: board PqWerkplekKlant marks a call "Telefoon, inkomend"
 * and "Geïdentificeerd".
 *
 * @spec openspec/changes/dashboard-header-pills/specs/dashboard-header-pills/spec.md#requirement-a-dashboard-can-open-its-description-line-with-pills
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div />' },
	CnStatusBadge: { props: ['label', 'variant'], template: '<span class="pill" :data-variant="variant">{{ label }}</span>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const nl = { 'Phone, incoming': 'Telefoon, inkomend', Identified: 'Geïdentificeerd' }
const headerPills = [
	{ label: 'Phone, incoming', when: { workspace: 'callActive', op: 'eq', value: true } },
	{ label: 'Identified', variant: 'success', when: { workspace: 'callIdentified', op: 'eq', value: true } },
	{ variant: 'error' },
]

/**
 * Mount a dashboard with pills and a Dutch translate.
 *
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		propsData: { title: 'Werkplek', description: 'Klantcontact', widgets: [], layout: [], headerPills, ...props },
		stubs,
		provide: { cnTranslate: (key) => nl[key] || key },
	})
}

describe('CnDashboardPage: header pills', () => {
	it('draws no pill while no condition holds, and the description as before', () => {
		const w = mountPage()
		expect(w.findAll('.pill')).toHaveLength(0)
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toBe('Klantcontact')
	})

	it('opens the description line with the pills whose condition holds, translated, in order', async () => {
		const w = mountPage()
		w.vm.workspaceContext.callActive = true
		w.vm.workspaceContext.callIdentified = true
		await w.vm.$nextTick()
		const pills = w.findAll('[data-testid="cn-dashboard-page-subtitle"] .pill')
		expect(pills.map((p) => p.text())).toEqual(['Telefoon, inkomend', 'Geïdentificeerd'])
		expect(pills.map((p) => p.attributes('data-variant'))).toEqual(['primary', 'success'])
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').text()).toContain('Klantcontact')
	})

	it('draws a pill without a condition always, and a line of pills without a description', () => {
		const w = mountPage({ description: '', headerPills: [{ label: 'Identified' }] })
		expect(w.findAll('[data-testid="cn-dashboard-page-subtitle"] .pill').map((p) => p.text())).toEqual(['Geïdentificeerd'])
	})
})
