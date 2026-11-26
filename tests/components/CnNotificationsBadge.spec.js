/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard header can count the signed-in user's unread notifications of
 * an app, list them, and mark one read when it is opened (`notificationsBadge`,
 * pipelinq My work REQ-MW-140).
 *
 * @spec openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-a-dashboard-header-counts-the-users-unread-notifications-of-the-app
 * @spec openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-opening-a-notification-marks-it-read
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateOcsUrl: jest.fn((path, params) => '/ocs/v2.php' + path.replace('{id}', params?.id)),
	generateUrl: jest.fn((p) => p),
	imagePath: jest.fn(() => ''),
}))
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import CnNotificationsBadge from '@/components/CnNotificationsBadge/CnNotificationsBadge.vue'
import { appNotifications } from '@/utils/appNotifications.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const answer = (entries) => ({ data: { ocs: { data: entries } } })

const NOTIFICATIONS = [
	{ notification_id: 1, app: 'pipelinq', subject: 'Ticket T-12 was assigned to you', link: '/apps/pipelinq/tickets/a', icon: '/icon.svg', datetime: '2026-11-25T09:00:00+00:00' },
	{ notification_id: 2, app: 'files', subject: 'A file was shared', link: '/f', datetime: '2026-11-25T10:00:00+00:00' },
	{ notification_id: 3, app: 'pipelinq', subject: 'Ticket T-14 was assigned to you', link: '/apps/pipelinq/tickets/b', datetime: '2026-11-25T11:00:00+00:00' },
]

const stubs = {
	NcPopover: { template: '<div class="popover"><slot name="trigger" /><slot /></div>', props: ['shown'] },
	NcButton: { template: '<button v-bind="$attrs"><slot name="icon" /><slot /></button>' },
}

describe('appNotifications', () => {
	it('keeps the app\'s own notifications, newest first', () => {
		const items = appNotifications(answer(NOTIFICATIONS).data, 'pipelinq')
		expect(items.map((i) => i.id)).toEqual([3, 1])
		expect(items[1]).toMatchObject({ subject: 'Ticket T-12 was assigned to you', link: '/apps/pipelinq/tickets/a', icon: '/icon.svg' })
		expect(typeof items[1].when).toBe('string')
		expect(items[1].when).not.toBe('')
	})

	it('reads nothing out of an answer that is not a list', () => {
		expect(appNotifications({}, 'pipelinq')).toEqual([])
		expect(appNotifications(null, 'pipelinq')).toEqual([])
	})
})

describe('CnNotificationsBadge', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.delete.mockReset()
	})

	it('shows the number of unread notifications of the app', async () => {
		axios.get.mockResolvedValue(answer(NOTIFICATIONS))
		const w = mount(CnNotificationsBadge, { props: { appId: 'pipelinq' }, global: { stubs } })
		await flush()
		expect(axios.get.mock.calls[0][0]).toBe('/ocs/v2.php/apps/notifications/api/v2/notifications')
		expect(w.find('[data-testid="cn-notifications-badge-count"]').text()).toBe('2')
		expect(w.find('[data-testid="cn-notifications-badge"]').attributes('aria-label')).toBe('2 unread notifications')
		expect(w.findAll('[data-testid="cn-notifications-badge-item"]')).toHaveLength(2)
	})

	it('shows no badge with nothing unread, or without the notifications app', async () => {
		axios.get.mockResolvedValue(answer([NOTIFICATIONS[1]]))
		const none = mount(CnNotificationsBadge, { props: { appId: 'pipelinq' }, global: { stubs } })
		await flush()
		expect(none.find('[data-testid="cn-notifications-badge"]').exists()).toBe(false)

		axios.get.mockRejectedValue(Object.assign(new Error('Not found'), { response: { status: 404 } }))
		const missing = mount(CnNotificationsBadge, { props: { appId: 'pipelinq' }, global: { stubs } })
		await flush()
		expect(missing.find('[data-testid="cn-notifications-badge"]').exists()).toBe(false)
	})

	it('marks a notification read when it is opened, lowers the count and opens its item', async () => {
		axios.get.mockResolvedValue(answer(NOTIFICATIONS))
		axios.delete.mockResolvedValue({})
		const w = mount(CnNotificationsBadge, { props: { appId: 'pipelinq' }, global: { stubs } })
		const navigate = jest.spyOn(w.vm, 'navigate').mockImplementation(() => {})
		await flush()

		await w.findAll('[data-testid="cn-notifications-badge-item"]')[0].trigger('click')
		await flush()
		expect(axios.delete.mock.calls[0][0]).toBe('/ocs/v2.php/apps/notifications/api/v2/notifications/3')
		expect(w.find('[data-testid="cn-notifications-badge-count"]').text()).toBe('1')
		expect(navigate).toHaveBeenCalledWith('/apps/pipelinq/tickets/b')
	})

	it('reads again when the page refreshes', async () => {
		axios.get.mockResolvedValue(answer([]))
		const w = mount(CnNotificationsBadge, { props: { appId: 'pipelinq' }, global: { stubs } })
		await flush()
		expect(w.find('[data-testid="cn-notifications-badge"]').exists()).toBe(false)

		axios.get.mockResolvedValue(answer(NOTIFICATIONS))
		emit('cn:page:refresh', {})
		await flush()
		expect(w.find('[data-testid="cn-notifications-badge-count"]').text()).toBe('2')
		w.unmount()
	})
})

describe('CnDashboardPage notificationsBadge', () => {
	/**
	 * @param {object} props Extra props.
	 * @return {object} The page.
	 */
	function mountPage(props) {
		return mount(CnDashboardPage, {
			props: { title: 'My work', pageId: 'MyWork', widgets: [], layout: [], ...props },
			global: { stubs: { CnDashboardGrid: { template: '<div />' } } },
		})
	}

	it('counts this app\'s notifications for true, another app\'s for its id, and none by default', () => {
		expect(mountPage({ appId: 'pipelinq' }).vm.notificationsBadgeAppId).toBe('')
		expect(mountPage({ appId: 'pipelinq', notificationsBadge: true }).vm.notificationsBadgeAppId).toBe('pipelinq')
		expect(mountPage({ appId: 'pipelinq', notificationsBadge: 'dossiq' }).vm.notificationsBadgeAppId).toBe('dossiq')
		expect(mountPage({ notificationsBadge: true }).vm.notificationsBadgeAppId).toBe('')
	})
})
