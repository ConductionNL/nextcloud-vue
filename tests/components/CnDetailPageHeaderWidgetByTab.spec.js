/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header widget follows the open body tab as side cards do: `notTabs`
 * stands it aside for those tabs, `tabs` shows it only beside them
 * (DqZaakAssistent r34: the AI oversight tab draws no stages bars, and the
 * page stood 87px low under them).
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const store = {
	objects: { 'reg-case': { 'id-1': { name: '2026-0082' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const stubs = {
	CnDashboardGrid: { props: ['layout'], template: '<div class="grid"><span v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId" /></div>' },
	CnDetailWidgetHost: { props: ['widget', 'chrome'], template: '<div class="host" :data-widget="widget && widget.id" />' },
}

/**
 * @param {object} stages Extra keys on the stages widget.
 * @return {object} The mounted page.
 */
function mountPage(stages) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			headerCard: true,
			headerWidget: 'case-stages',
			widgets: [{ id: 'case-stages', type: 'stages', ...stages }, { id: 'case-data', type: 'data' }],
			layout: [
				{ id: '1', widgetId: 'case-stages', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
				{ id: '2', widgetId: 'case-data', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 4 },
			],
		},
		global: { stubs },
	})
}

/**
 * @param {object} wrapper The page.
 * @param {string} id The tab to open.
 */
async function openTab(wrapper, id) {
	wrapper.vm.$.provides.cnDetailReportTab(id)
	await wrapper.vm.$nextTick()
}

const shown = (w) => w.find('[data-testid="cn-detail-page-header-widget"]').exists()
const cells = (w) => w.findAll('.cell').map((c) => c.attributes('data-widget'))

describe('CnDetailPage header widget per tab', () => {
	it('stands aside for a tab named in notTabs and shows beside the others', async () => {
		const w = mountPage({ notTabs: ['ai'] })
		await openTab(w, 'overview')
		expect(shown(w)).toBe(true)
		await openTab(w, 'ai')
		expect(shown(w)).toBe(false)
		expect(cells(w)).toEqual(['case-data'])
	})

	it('shows only beside a tab named in tabs', async () => {
		const w = mountPage({ tabs: ['overview'] })
		await openTab(w, 'files')
		expect(shown(w)).toBe(false)
		await openTab(w, 'overview')
		expect(shown(w)).toBe(true)
	})

	it('shows beside every tab without either key', async () => {
		const w = mountPage({})
		await openTab(w, 'ai')
		expect(shown(w)).toBe(true)
	})
})
