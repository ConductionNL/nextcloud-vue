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
jest.mock('@nextcloud/l10n', () => ({ __esModule: true, translate: jest.fn((app, key) => (app === 'dossiq' && key === 'No open cases' ? 'Geen open zaken' : key)), translatePlural: (app, s, p, n, vars) => (n === 1 ? s : p).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m)), t: (app, key) => key, n: (app, s, p, n) => (n === 1 ? s : p), getLanguage: () => 'en', getLocale: () => 'en', isRTL: () => false }))

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

	it('says how a due date stands instead of the subtitle', async () => {
		const day = (offset) => {
			const d = new Date()
			d.setDate(d.getDate() + offset)
			return d.toISOString().slice(0, 10)
		}
		axios.get.mockResolvedValue({ data: { results: [
			{ id: 'a', title: 'Late', deadline: day(-3) },
			{ id: 'b', title: 'Today', deadline: day(0) },
			{ id: 'c', title: 'Soon', deadline: day(2) },
			{ id: 'd', title: 'None' },
		] } })
		const w = await mountList({
			source: { register: 'dossiq', schema: 'case' },
			subtitle: 'unused',
			due: { field: 'deadline', upcomingLabel: { one: '{count} day remaining', other: '{count} days remaining' }, emptyText: 'No deadline' },
		})
		expect(w.findComponent(Table).props('rows').map((r) => r.subText)).toEqual(['3 days overdue', 'Due today', '2 days remaining', 'No deadline'])
	})

	it('opens a row like a link', async () => {
		const w = await mountList()
		const click = { button: 0 }
		w.findComponent(Table).vm.$emit('row-click', { href: '/index.php/apps/dossiq/cases/c1' }, click)
		expect(openRowTarget).toHaveBeenCalledWith(click, '/index.php/apps/dossiq/cases/c1')
	})
})

describe('CnNcDashboardList growth (pl4-nc-dashboard)', () => {
	const TableWithActions = {
		name: 'CnDataTable',
		props: ['rows', 'columns', 'loading', 'emptyText', 'hideHeader', 'borderless'],
		emits: ['row-click', 'row-aux-click'],
		template: '<div class="table"><div v-for="row in rows" :key="row.id" class="row" :data-id="row.id">{{ row.mainText }}|{{ row.subText }}<slot name="row-actions" :row="row" /></div><slot name="footer" /></div>',
	}
	const QuickCreate = { name: 'CnNcDashboardQuickCreate', props: { config: Object, context: Object, cancelable: Boolean }, emits: ['created', 'cancel'], template: '<div class="qc" />' }
	const Actions = { name: 'NcActions', template: '<div class="actions"><slot /></div>' }
	const ActionButton = { name: 'NcActionButton', emits: ['click'], template: '<button class="action" @click="$emit(\'click\')"><slot /></button>' }
	const ActionLink = { name: 'NcActionLink', props: ['href'], template: '<a class="link" :href="href"><slot /></a>' }
	const TextField = { name: 'NcTextField', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input class="search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' }
	const stubs = { CnDataTable: TableWithActions, CnNcDashboardQuickCreate: QuickCreate, NcActions: Actions, NcActionButton: ActionButton, NcActionLink: ActionLink, NcTextField: TextField }

	const FIND_CLIENT = {
		source: { register: 'pipelinq', schema: 'client' },
		limit: 20,
		title: '{name}',
		subtitle: ['{email}', '{phone}'],
		href: '/apps/pipelinq/clients/{id}',
		search: { label: 'Search clients', placeholder: 'Search clients…' },
		rowActions: [
			{ id: 'request', label: 'Create request', create: { register: 'pipelinq', schema: 'ticket', heading: 'New request for {name}', fields: [{ key: 'title', label: 'Title', required: true }], defaults: { client: '{id}' } } },
			{ id: 'copy', label: 'Copy email', copy: 'email' },
		],
		create: { label: 'New client', register: 'pipelinq', schema: 'client', fields: [{ key: 'name', label: 'Name', required: true }] },
	}

	/**
	 * Mount with the growth stubs.
	 *
	 * @param {object} config The config.
	 * @return {Promise<import('@vue/test-utils').VueWrapper>}
	 */
	async function mountGrown(config) {
		const w = mount(CnNcDashboardList, { props: { config }, global: { stubs } })
		await flushPromises()
		return w
	}

	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { results: [
			{ id: 'c1', name: 'Acme', email: 'info@acme.nl', phone: '' },
			{ id: 'c2', name: 'Bakker', email: '', phone: '010 123' },
		] } })
	})

	it('joins a subtitle list and drops an empty part with its separator', async () => {
		const w = await mountGrown(FIND_CLIENT)
		expect(w.findComponent(TableWithActions).props('rows').map((r) => r.subText)).toEqual(['info@acme.nl', '010 123'])
	})

	it('searches on the server as the user types', async () => {
		jest.useFakeTimers()
		const w = await mountGrown(FIND_CLIENT)
		await w.find('input.search').setValue('acme')
		jest.advanceTimersByTime(300)
		jest.useRealTimers()
		await flushPromises()
		const [, { params }] = axios.get.mock.calls.at(-1)
		expect(params._search).toBe('acme')
		expect(params._limit).toBe(20)
	})

	it('opens a create form on a row, prefilled from that row, and hides an action whose field is empty', async () => {
		const w = await mountGrown(FIND_CLIENT)
		const rows = w.findAll('.row')
		expect(rows[0].findAll('button.action').map((b) => b.text())).toEqual(['Create request', 'Copy email'])
		expect(rows[1].findAll('button.action').map((b) => b.text())).toEqual(['Create request'])
		await rows[0].findAll('button.action')[0].trigger('click')
		const form = w.findComponent(QuickCreate)
		expect(form.props('context')).toMatchObject({ id: 'c1', name: 'Acme' })
		expect(form.props('config').heading).toBe('New request for {name}')
		expect(form.props('cancelable')).toBe(true)
		form.vm.$emit('cancel')
		await flushPromises()
		expect(w.findComponent(QuickCreate).exists()).toBe(false)
	})

	it('copies a row field to the clipboard', async () => {
		const writeText = jest.fn().mockResolvedValue()
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
		const w = await mountGrown(FIND_CLIENT)
		await w.findAll('.row')[0].findAll('button.action')[1].trigger('click')
		await flushPromises()
		expect(writeText).toHaveBeenCalledWith('info@acme.nl')
		expect(w.find('[data-testid="cn-nc-dashboard-list-copied"]').exists()).toBe(true)
	})

	it('opens a new-record form from its create button and reads again after a create', async () => {
		const w = await mountGrown(FIND_CLIENT)
		await w.find('[data-testid="cn-nc-dashboard-list-create"]').trigger('click')
		const form = w.findComponent(QuickCreate)
		expect(form.props('config').schema).toBe('client')
		const calls = axios.get.mock.calls.length
		form.vm.$emit('created', { id: 'c3' })
		await flushPromises()
		expect(axios.get.mock.calls.length).toBe(calls + 1)
	})

	it('merges several sources, newest first, each row opening its own page', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: { results: url.endsWith('/lead')
			? [{ id: 'l1', title: 'Lead one', '@self': { updated: '2026-10-20T10:00:00Z' } }]
			: [{ id: 't1', title: 'Ticket one', '@self': { updated: '2026-10-21T10:00:00Z' } }, { id: 't2', title: 'Old ticket', '@self': { updated: '2026-10-01T10:00:00Z' } }] } }))
		const w = await mountGrown({
			sources: [
				{ register: 'pipelinq', schema: 'lead', kind: 'Lead', href: '/apps/pipelinq/leads/{id}' },
				{ register: 'pipelinq', schema: 'ticket', kind: 'Request', href: '/apps/pipelinq/tickets/{id}' },
			],
			sortBy: '@self.updated',
			limit: 2,
			subtitle: ['{_kind}', '{@self.updated|relative}'],
		})
		const rows = w.findComponent(TableWithActions).props('rows')
		expect(rows.map((r) => r.mainText)).toEqual(['Ticket one', 'Lead one'])
		expect(rows.map((r) => r.href)).toEqual(['/index.php/apps/pipelinq/tickets/t1', '/index.php/apps/pipelinq/leads/l1'])
		expect(rows[1].subText.startsWith('Lead · ')).toBe(true)
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

	it('mounts a quick-create widget from configuration', async () => {
		const callbacks = {}
		const dashboard = {
			register: (id, cb) => {
				callbacks[id] = cb
			},
		}
		registerNcDashboardWidgets([{ id: 'pipelinq_create_lead_widget', type: 'quick-create', config: { register: 'pipelinq', schema: 'lead', fields: [{ key: 'title', label: 'Title' }] } }], { appId: 'pipelinq', dashboard })
		const el = document.createElement('div')
		callbacks.pipelinq_create_lead_widget(el, { widget: { title: 'New lead' } })
		await flushPromises()
		expect(el.querySelector('[data-testid="cn-nc-dashboard-quick-create"]')).not.toBeNull()
	})

	it('does nothing without the Dashboard', () => {
		expect(registerNcDashboardWidgets([{ id: 'a', config: {} }], { appId: 'dossiq' })).toEqual([])
	})
})
