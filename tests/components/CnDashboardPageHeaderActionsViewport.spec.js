/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `headerActionsViewport: "wide"` keeps a dashboard's header actions and the
 * buildiq square off a phone: PqMobiel draws My work at 375px with only the
 * title in the header, where PqMijnWerk draws Downloaden beside it.
 *
 * @spec openspec/changes/dashboard-header-actions-viewport/specs/dashboard-header-actions-viewport/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnBuildiqEditButton: { template: '<button class="buildiq-square" />' },
	CnActionsMenu: { template: '<div class="actions-menu" />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

/**
 * @param {boolean} narrow Whether the window is phone-wide.
 * @param {object} props Extra page props.
 * @return {Promise<object>} The wrapper.
 */
async function mountAt(narrow, props = {}) {
	window.matchMedia = jest.fn(() => ({ matches: narrow, addEventListener: jest.fn(), removeEventListener: jest.fn() }))
	const wrapper = mount(CnDashboardPage, {
		propsData: {
			title: 'My work',
			widgets: [],
			layout: [],
			headerActions: [{ id: 'download', label: 'Download', icon: 'Download', href: '/apps/pipelinq/api/worklist/items?format=csv' }],
			...props,
		},
		stubs,
	})
	await flushPromises()
	return wrapper
}

const hasActions = (wrapper) => wrapper.find('[data-testid="cn-dashboard-page-header-actions"]').exists()
const hasSquare = (wrapper) => wrapper.find('.buildiq-square').exists()
const hasMenu = (wrapper) => wrapper.find('.actions-menu').exists()

describe('CnDashboardPage: header actions per viewport', () => {
	it('keeps the header actions and the buildiq square off a phone when they are for wide windows', async () => {
		const wrapper = await mountAt(true, { headerActionsViewport: 'wide' })
		expect(hasActions(wrapper)).toBe(false)
		expect(hasSquare(wrapper)).toBe(false)
	})

	it('draws them on a wider window', async () => {
		const wrapper = await mountAt(false, { headerActionsViewport: 'wide' })
		expect(hasActions(wrapper)).toBe(true)
		expect(hasSquare(wrapper)).toBe(true)
	})

	it('draws them on a phone when the page does not say', async () => {
		const wrapper = await mountAt(true)
		expect(hasActions(wrapper)).toBe(true)
		expect(hasSquare(wrapper)).toBe(true)
	})

	it('keeps them off the board look on a phone too', async () => {
		const wrapper = await mountAt(true, { headerActionsViewport: 'wide', look: 'board' })
		expect(hasActions(wrapper)).toBe(false)
		expect(hasSquare(wrapper)).toBe(false)
	})

	it('keeps the Actions menu off a phone too (PqMobiel: the title alone)', async () => {
		for (const look of ['board', 'nextcloud']) {
			expect(hasMenu(await mountAt(true, { headerActionsViewport: 'wide', look }))).toBe(false)
			expect(hasMenu(await mountAt(false, { headerActionsViewport: 'wide', look }))).toBe(true)
		}
		expect(hasMenu(await mountAt(true))).toBe(true)
	})
})
