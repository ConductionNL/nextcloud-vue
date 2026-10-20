/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWorkQueue: one queue of everything waiting on the reader, in the groups
 * the server declares (dossiq's PersonalQueueView; pipelinq's queue).
 *
 * @spec openspec/changes/work-queue/specs/work-queue/spec.md#requirement-one-queue-over-every-source
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnWorkQueue from '../../src/components/CnWorkQueue/CnWorkQueue.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'
import { openRowTarget } from '../../src/utils/linkNavigation.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p, generateFilePath: (p) => p, imagePath: (p) => p }))
jest.mock('../../src/utils/linkNavigation.js', () => ({ ...jest.requireActual('../../src/utils/linkNavigation.js'), openRowTarget: jest.fn() }))

const QUEUE = {
	groups: [
		{
			key: 'tasks',
			label: 'Tasks',
			closesWhen: 'Closes when you complete the task.',
			items: [
				{ id: 't1', title: 'Advies opvragen', dueAt: '2026-10-21', deadlineTier: 'overdue', href: '/nc/apps/dossiq/tasks/t1' },
				{ id: 't2', title: 'Locatiebezoek plannen', covered: true, coveredFor: 'Sanne de Vries', waiting: { on: 'applicant', days: 4, chases: 2 } },
			],
		},
		{ key: 'mentions', label: 'Mentions', items: [{ id: 'm1', title: 'Vraag over Lindelaan', route: { name: 'CaseDetail', params: { id: 'z-82' } } }] },
	],
	hiddenGroups: [],
	unavailable: [{ source: 'calendar', label: 'Calendar' }],
}

const CONTENT = {
	source: { url: '/apps/dossiq/api/personal-queue' },
	hide: '/apps/dossiq/api/personal-queue/groups/{group}/hide',
	show: '/apps/dossiq/api/personal-queue/groups/{group}/show',
}

const STUBS = {
	NcEmptyContent: { props: ['name', 'description'], template: '<div class="empty">{{ name }} {{ description }}<slot name="action" /></div>' },
	NcNoteCard: { props: ['type'], template: '<div class="note"><slot /></div>' },
	NcLoadingIcon: true,
}

/**
 * Mount the queue and let it read.
 *
 * @param {object} content The config.
 * @param {object} router A router double.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The queue.
 */
async function mountQueue(content = CONTENT, router = null) {
	const w = mount(CnWorkQueue, {
		props: { content, title: 'Your queue' },
		global: { stubs: STUBS, mocks: router ? { $router: router } : {} },
	})
	await flushPromises()
	return w
}

describe('CnWorkQueue', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		openRowTarget.mockReset()
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: QUEUE })
	})

	it('draws the server\'s groups, names an unreadable source, and is a catalog widget', async () => {
		expect(getWidgetTypeEntry('work-queue').renderer).toBe(CnWorkQueue)
		const w = await mountQueue()
		expect(axios.get.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/personal-queue')
		expect(w.find('[data-testid="cn-work-queue-group-tasks"]').text()).toContain('Closes when you complete the task.')
		expect(w.find('[data-testid="cn-work-queue-unavailable-calendar"]').text()).toBe('Calendar could not be read, so this list is incomplete.')
		expect(w.find('[data-testid="cn-work-queue-item-t1"]').classes()).toContain('cn-work-queue__item--late')
		expect(w.find('[data-testid="cn-work-queue-item-t2"]').text()).toContain('Covering for Sanne de Vries')
		expect(w.find('[data-testid="cn-work-queue-waiting-t2"]').text()).toBe('Waiting on the applicant for 4 days, chased 2 times')
	})

	it('hides a group until tomorrow through the server and shows it again', async () => {
		const w = await mountQueue()
		axios.post.mockResolvedValueOnce({ data: { hiddenGroups: ['tasks'] } })
		await w.find('[data-testid="cn-work-queue-hide-tasks"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/dossiq/api/personal-queue/groups/tasks/hide', {})
		expect(w.find('[data-testid="cn-work-queue-group-tasks"]').exists()).toBe(false)
		axios.post.mockResolvedValueOnce({ data: { hiddenGroups: [] } })
		await w.find('[data-testid="cn-work-queue-show-tasks"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-work-queue-group-tasks"]').exists()).toBe(true)
	})

	it('opens a route through the router and an href like a link', async () => {
		const router = { push: jest.fn(() => Promise.resolve()), resolve: () => ({ href: '/nc/apps/dossiq/cases/z-82' }) }
		const w = await mountQueue(CONTENT, router)
		await w.find('[data-testid="cn-work-queue-item-m1"] a').trigger('click')
		expect(router.push).toHaveBeenCalledWith({ name: 'CaseDetail', params: { id: 'z-82' } })
		await w.find('[data-testid="cn-work-queue-item-t1"] a').trigger('click')
		expect(openRowTarget.mock.calls[0][1]).toBe('/nc/apps/dossiq/tasks/t1')
		expect(w.find('[data-testid="cn-work-queue-item-t1"] a').attributes('href')).toBe('/nc/apps/dossiq/tasks/t1')
	})

	it('says nothing is waiting when it is empty, and fails with a retry', async () => {
		axios.get.mockResolvedValue({ data: { groups: [] } })
		const empty = await mountQueue()
		expect(empty.find('[data-testid="cn-work-queue-empty"]').exists()).toBe(true)
		expect(empty.find('[data-testid="cn-work-queue-hide-tasks"]').exists()).toBe(false)

		invalidateEndpointSourceCache()
		axios.get.mockRejectedValueOnce(new Error('down'))
		const broken = await mountQueue()
		expect(broken.find('[data-testid="cn-work-queue-error"]').exists()).toBe(true)
		expect(broken.find('[data-testid="cn-work-queue-empty"]').exists()).toBe(false)
	})
})
