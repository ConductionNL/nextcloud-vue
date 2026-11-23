/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `team-workload` widget (board DqTeamwachtrij "Team vandaag"): each
 * person of the team with initials, name, an availability line from the
 * Nextcloud user status, their open count and a load bar, and the header
 * note "{present} of {total} present". The counts come from the app's
 * endpoint; the status from Nextcloud's OCS user status API.
 */
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateOcsUrl: (url) => `/ocs/v2.php/${url}`,
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter' }) }))

import { flushPromises, mount } from '@vue/test-utils'

const CLEAR_AT = Math.floor(new Date(2026, 9, 19, 14, 0, 0).getTime() / 1000)

const WORKLOAD = {
	handlers: [
		{ handler: 'lars', displayName: 'Lars de Koning', openCaseCount: 8 },
		{ handler: 'pieter', displayName: 'Pieter Jansen', openCaseCount: 6 },
		{ handler: 'fatma', displayName: 'Fatma Yildiz', openCaseCount: 11 },
		{ handler: 'tim', displayName: 'Tim Mulder', openCaseCount: 4 },
	],
}
const STATUSES = [
	{ userId: 'pieter', status: 'online', message: null },
	{ userId: 'lars', status: 'dnd', message: 'In a meeting', clearAt: CLEAR_AT },
	{ userId: 'fatma', status: 'away', message: '' },
]

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockImplementation(async (url) => {
		if (url.includes('apps/user_status/api/v1/statuses')) {
			return { data: { ocs: { data: STATUSES } } }
		}
		if (url.includes('/apps/dossiq/api/work-queue/workload')) {
			return { data: WORKLOAD }
		}
		throw new Error('unexpected ' + url)
	})
})

const CONTENT = {
	source: { url: '/apps/dossiq/api/work-queue/workload', responsePath: 'handlers', userField: 'handler', nameField: 'displayName', countField: 'openCaseCount' },
	capacity: 12,
	countLabel: { one: '{count} case', other: '{count} cases' },
}

/**
 * @param {object} [content] The content.
 * @return {Promise<object>} The wrapper.
 */
async function mountWidget(content = CONTENT, router = undefined) {
	const { default: CnTeamWorkloadWidget } = await import('../../src/components/CnTeamWorkloadWidget/CnTeamWorkloadWidget.vue')
	const w = mount(CnTeamWorkloadWidget, { props: { content }, global: { provide: { cnTranslate: (s) => s }, mocks: router ? { $router: router } : {} } })
	await flushPromises()
	return w
}

const rows = (w) => w.findAll('[data-testid="cn-team-workload-member"]')

describe('CnTeamWorkloadWidget', () => {
	it('lists the team, the viewer first, with initials and names', async () => {
		const w = await mountWidget()
		expect(rows(w).map((r) => r.find('.cn-team-workload__name').text())).toEqual(['Pieter Jansen (you)', 'Fatma Yildiz', 'Lars de Koning', 'Tim Mulder'])
		expect(rows(w)[0].find('.cn-team-workload__avatar').text()).toBe('PJ')
	})

	it('reads each availability line from the user status', async () => {
		const w = await mountWidget()
		const time = new Date(CLEAR_AT * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		const lines = Object.fromEntries(rows(w).map((r) => [r.find('.cn-team-workload__name').text(), r.find('.cn-team-workload__state').text()]))
		expect(lines['Pieter Jansen (you)']).toBe('Available')
		expect(lines['Fatma Yildiz']).toBe('Away')
		expect(lines['Lars de Koning']).toBe(`In a meeting until ${time}`)
		expect(lines['Tim Mulder']).toBe('Absent today')
	})

	it('shows the count and a load bar against the capacity, hot from 90 percent', async () => {
		const w = await mountWidget()
		const fatma = rows(w)[1]
		expect(fatma.find('.cn-team-workload__count').text()).toBe('11 cases')
		const bar = fatma.find('.cn-team-workload__bar-fill')
		expect(bar.attributes('style')).toContain('width: 92%')
		expect(bar.classes()).toContain('cn-team-workload__bar-fill--hot')
		expect(rows(w)[3].find('.cn-team-workload__bar-fill').classes()).not.toContain('cn-team-workload__bar-fill--hot')
	})

	it('reports how many are present through the header event', async () => {
		const w = await mountWidget()
		expect(w.emitted('header').at(-1)[0]).toMatchObject({ note: '3 of 4 present' })
	})

	it('measures the bar against the highest count without a capacity', async () => {
		const w = await mountWidget({ ...CONTENT, capacity: undefined })
		expect(rows(w)[1].find('.cn-team-workload__bar-fill').attributes('style')).toContain('width: 100%')
	})

	it('has no buttons without a rowRoute', async () => {
		const w = await mountWidget()
		expect(w.find('button.cn-team-workload__row').exists()).toBe(false)
	})

	it('opens a person\'s work from their row with a rowRoute name', async () => {
		const router = { push: jest.fn() }
		const w = await mountWidget({ ...CONTENT, rowRoute: 'Cases' }, router)
		const fatma = rows(w)[1].find('button.cn-team-workload__row')
		expect(fatma.attributes('type')).toBe('button')
		await fatma.trigger('click')
		expect(router.push).toHaveBeenCalledWith({ name: 'Cases', query: { assignee: 'fatma' } })
	})

	it('fills {user} in a rowRoute location', async () => {
		const { routeForMember } = await import('../../src/components/CnTeamWorkloadWidget/CnTeamWorkloadWidget.vue')
		expect(routeForMember({ name: 'Cases', query: { assignee: '{user}', isFinalStatus: 'false' } }, undefined, 'tim'))
			.toEqual({ name: 'Cases', params: {}, query: { assignee: 'tim', isFinalStatus: 'false' } })
		expect(routeForMember('Cases', 'handler', 'tim')).toEqual({ name: 'Cases', query: { handler: 'tim' } })
		expect(routeForMember(null, undefined, 'tim')).toBeNull()
	})

	it('renders nothing for a refused read when hideWhenEmpty is set', async () => {
		mockGet.mockImplementation(async (url) => {
			if (url.includes('/apps/dossiq/api/work-queue/workload')) {
				throw Object.assign(new Error('403'), { response: { status: 403 } })
			}
			return { data: { ocs: { data: [] } } }
		})
		const hidden = await mountWidget({ ...CONTENT, hideWhenEmpty: true })
		expect(hidden.find('[data-testid="cn-team-workload"]').exists()).toBe(false)

		const shown = await mountWidget(CONTENT)
		expect(shown.find('[data-testid="cn-team-workload"]').text()).toBe('No one in the team')
	})

	it('is registered as the team-workload widget type', async () => {
		const { getWidgetTypeEntry } = await import('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		await import('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { LIBRARY_WIDGET_KEYS } = await import('../../src/utils/libraryWidgetKeys.js')
		expect(getWidgetTypeEntry('team-workload')).toBeTruthy()
		expect(LIBRARY_WIDGET_KEYS).toContain('team-workload')
	})
})
