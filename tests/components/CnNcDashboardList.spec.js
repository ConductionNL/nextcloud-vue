/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Nextcloud Dashboard widgets as configuration: CnNcDashboardList and
 * registerNcDashboardWidgets (dossiq's six views/widgets/* and their
 * per-widget entry scripts).
 *
 * @spec openspec/changes/nc-dashboard-widgets/specs/nc-dashboard-widgets/spec.md#requirement-dashboard-widgets-are-configuration
 */
import axios from '@nextcloud/axios'
import { translate } from '@nextcloud/l10n'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcDashboardList from '../../src/components/CnNcDashboardList/CnNcDashboardList.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'
import { openRowTarget } from '../../src/utils/linkNavigation.js'
import { registerNcDashboardWidgets } from '../../src/utils/registerNcDashboardWidgets.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p }))
jest.mock('../../src/utils/linkNavigation.js', () => ({ openRowTarget: jest.fn() }))
jest.mock('@nextcloud/l10n', () => ({ __esModule: true, translate: jest.fn((app, key) => (app === 'dossiq' && key === 'No open cases' ? 'Geen open zaken' : key)), translatePlural: (app, s, p, n) => (n === 1 ? s : p), t: (app, key) => key, n: (app, s, p, n) => (n === 1 ? s : p), getLanguage: () => 'en', getLocale: () => 'en', isRTL: () => false }))

const OPEN_CASES = {
	source: { register: 'dossiq', schema: 'case', params: { _order: { deadline: 'asc' } } },
	limit: 2,
	title: '{title}',
	subtitle: '#{identifier}',
	href: '/apps/dossiq/cases/{id}',
	viewAll: { href: '/apps/dossiq/cases', label: 'View all' },
	emptyText: 'No open cases',
}

const CASES = [
	{ id: 'c1', title: 'Verlichting fietspad', identifier: '2026-0082' },
	{ id: 'c2', title: 'Kapvergunning eik', identifier: '2026-0083' },
	{ id: 'c3', title: 'Bezwaar WOZ', identifier: '2026-0084' },
]

const Table = {
	name: 'CnDataTable',
	props: ['rows', 'columns', 'loading', 'emptyText', 'hideHeader', 'borderless'],
	emits: ['row-click', 'row-aux-click'],
	template: '<div class="table"><slot name="footer" /></div>',
}

/**
 * Mount the list and let it read.
 *
 * @param {object} config The config.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The list.
 */
async function mountList(config = OPEN_CASES) {
	const w = mount(CnNcDashboardList, { props: { config }, global: { stubs: { CnDataTable: Table } } })
	await flushPromises()
	return w
}

describe('CnNcDashboardList', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { results: CASES } })
	})

	it('reads OpenRegister objects and draws name, trailing line and a view-all link', async () => {
		const w = await mountList()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case', { params: { _limit: 2, _order: { deadline: 'asc' } } })
		const table = w.findComponent(Table)
		expect(table.props('rows')).toEqual([
			{ id: 'c1', mainText: 'Verlichting fietspad', subText: '#2026-0082', href: '/index.php/apps/dossiq/cases/c1' },
			{ id: 'c2', mainText: 'Kapvergunning eik', subText: '#2026-0083', href: '/index.php/apps/dossiq/cases/c2' },
		])
		expect(table.props('hideHeader')).not.toBeUndefined()
		expect(w.find('[data-testid="cn-nc-dashboard-list-view-all"]').attributes('href')).toBe('/index.php/apps/dossiq/cases')
	})

	it('resolves filter tokens and keeps operator maps for OpenRegister', async () => {
		await mountList({ source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: false, deadline: { lt: '@today' } } } })
		const [, { params }] = axios.get.mock.calls[0]
		expect(params.isFinalStatus).toBe(false)
		expect(params.deadline.lt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		expect(params._limit).toBe(7)
	})

	it('resolves tokens nested under a metadata filter', async () => {
		await mountList({ source: { register: 'dossiq', schema: 'case', params: { isFinalStatus: { ne: true, orNull: true }, '@self': { lastUserActivity: { lt: '@today-7d', orNull: true } } } } })
		const [, { params }] = axios.get.mock.calls[0]
		expect(params.isFinalStatus).toEqual({ ne: true, orNull: true })
		expect(params['@self'].lastUserActivity.lt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		expect(params['@self'].lastUserActivity.orNull).toBe(true)
	})

	it('reads an endpoint with a responsePath, and says when it could not read', async () => {
		axios.get.mockResolvedValue({ data: { data: { overdue: [{ id: 't1', title: 'Advies opvragen' }] } } })
		const w = await mountList({ source: { url: '/apps/dossiq/api/signals/overdue-tasks', responsePath: 'data.overdue' } })
		expect(w.findComponent(Table).props('rows').map((r) => r.mainText)).toEqual(['Advies opvragen'])

		invalidateEndpointSourceCache()
		axios.get.mockRejectedValue(new Error('down'))
		const broken = await mountList({ source: { url: '/apps/dossiq/api/signals/x' } })
		expect(broken.find('[data-testid="cn-nc-dashboard-list-error"]').exists()).toBe(true)
	})

	it('opens a row like a link', async () => {
		const w = await mountList()
		const click = { button: 0 }
		w.findComponent(Table).vm.$emit('row-click', { href: '/index.php/apps/dossiq/cases/c1' }, click)
		expect(openRowTarget).toHaveBeenCalledWith(click, '/index.php/apps/dossiq/cases/c1')
	})
})

describe('registerNcDashboardWidgets', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('registers each widget and mounts the list with the app\'s translate', async () => {
		const callbacks = {}
		const dashboard = {
			register: jest.fn((id, cb) => {
				callbacks[id] = cb
			}),
		}
		const setup = jest.fn()
		const ids = registerNcDashboardWidgets([{ id: 'dossiq_cases_overview_widget', config: OPEN_CASES }, { id: '' }, null], { appId: 'dossiq', dashboard, setup })
		expect(ids).toEqual(['dossiq_cases_overview_widget'])

		const el = document.createElement('div')
		document.body.appendChild(el)
		callbacks.dossiq_cases_overview_widget(el, { widget: { title: 'Open cases' } })
		await flushPromises()
		expect(setup).toHaveBeenCalledTimes(1)
		expect(el.querySelector('[data-testid="cn-nc-dashboard-list"]')).not.toBeNull()
		expect(translate).toHaveBeenCalledWith('dossiq', 'No open cases', undefined)
		expect(el.querySelector('[title]')).toBeNull()
	})

	it('mounts a widget\'s own component with its props and the title', () => {
		const callbacks = {}
		const dashboard = {
			register: (id, cb) => {
				callbacks[id] = cb
			},
		}
		const Own = { props: ['title', 'mode'], template: '<p class="own">{{ title }} {{ mode }}</p>' }
		registerNcDashboardWidgets([{ id: 'dossiq_start_case_widget', component: Own, props: { mode: 'quick' } }], { appId: 'dossiq', dashboard })
		const el = document.createElement('div')
		callbacks.dossiq_start_case_widget(el, { widget: { title: 'Start a case' } })
		expect(el.querySelector('.own').textContent).toBe('Start a case quick')
	})

	it('does nothing without the Dashboard', () => {
		expect(registerNcDashboardWidgets([{ id: 'a', config: {} }], { appId: 'dossiq' })).toEqual([])
	})
})
