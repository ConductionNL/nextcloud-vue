/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard page can read its widgets again on a timer, with a refresh
 * button in its header, and say when its data may be outdated (`autoRefresh`,
 * pipelinq My work REQ-MW-190).
 *
 * @spec openspec/changes/dashboard-auto-refresh/specs/dashboard-page/spec.md#requirement-a-dashboard-reads-its-widgets-again-on-a-timer
 * @spec openspec/changes/dashboard-auto-refresh/specs/dashboard-page/spec.md#requirement-a-dashboard-says-when-its-data-may-be-outdated
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { normalizeAutoRefresh } from '@/utils/autoRefresh.js'

const stubs = {
	CnDashboardGrid: { template: '<div class="grid-stub" />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: {
		template: '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled', 'variant'],
		emits: ['click'],
	},
	NcEmptyContent: { template: '<div><slot /></div>' },
}

/**
 * Mount a page.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		props: {
			title: 'My work',
			pageId: 'MyWork',
			widgets: [{ id: 'tasks', title: 'Tasks', type: 'custom' }],
			layout: [{ id: '1', widgetId: 'tasks', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }],
			...props,
		},
		global: { stubs },
	})
}

/**
 * A widget double on the page-refresh channel: hands `answer` to waitUntil.
 *
 * @param {Function} answer Returns the read's outcome.
 * @return {Function} Call it to unsubscribe.
 */
function widgetReading(answer) {
	const listener = (payload) => payload?.waitUntil?.(Promise.resolve(answer()))
	subscribe('cn:page:refresh', listener)
	return () => unsubscribe('cn:page:refresh', listener)
}

describe('normalizeAutoRefresh', () => {
	it('is off unless asked for', () => {
		expect(normalizeAutoRefresh(null)).toBeNull()
		expect(normalizeAutoRefresh(false)).toBeNull()
		expect(normalizeAutoRefresh('yes')).toBeNull()
		expect(normalizeAutoRefresh([])).toBeNull()
	})

	it('reads every five minutes, outdated after ten, with a button, by default', () => {
		expect(normalizeAutoRefresh(true)).toEqual({ intervalSeconds: 300, staleAfterSeconds: 600, button: true })
		expect(normalizeAutoRefresh({ intervalSeconds: 60, staleAfterSeconds: 'x', button: false }))
			.toEqual({ intervalSeconds: 60, staleAfterSeconds: 600, button: false })
	})
})

describe('CnDashboardPage autoRefresh', () => {
	afterEach(() => {
		jest.useRealTimers()
	})

	it('adds no button and no timer without autoRefresh', () => {
		jest.useFakeTimers()
		const page = mountPage()
		expect(page.find('[data-testid="cn-dashboard-page-refresh"]').exists()).toBe(false)
		expect(page.vm.autoRefreshTimer).toBeNull()
	})

	it('reads the widgets again every interval, and stops when the page goes', async () => {
		jest.useFakeTimers()
		let reads = 0
		const off = widgetReading(() => {
			reads++
			return true
		})
		const page = mountPage({ autoRefresh: { intervalSeconds: 300 } })
		expect(reads).toBe(0)
		jest.advanceTimersByTime(300 * 1000)
		expect(reads).toBe(1)
		await Promise.resolve()
		await Promise.resolve()
		page.unmount()
		jest.advanceTimersByTime(900 * 1000)
		expect(reads).toBe(1)
		off()
	})

	it('reads at once from the header button, which is busy until the reads land', async () => {
		let release
		const off = widgetReading(() => new Promise((resolve) => {
			release = resolve
		}))
		const page = mountPage({ autoRefresh: true })
		const button = page.find('[data-testid="cn-dashboard-page-refresh"]')
		expect(button.exists()).toBe(true)

		const run = page.vm.runPageRefresh()
		await page.vm.$nextTick()
		expect(page.vm.autoRefreshBusy).toBe(true)
		expect(page.find('[data-testid="cn-dashboard-page-refresh"]').attributes('disabled')).toBeDefined()
		release(true)
		await run
		expect(page.vm.autoRefreshBusy).toBe(false)
		expect(page.vm.autoRefreshFailing).toBe(false)
		off()
	})

	it('names the last good read and offers Retry once failing reads pass the stale time', async () => {
		let ok = true
		const off = widgetReading(() => ok)
		const page = mountPage({ autoRefresh: { staleAfterSeconds: 600 } })
		const start = Date.now()
		const clock = jest.spyOn(Date, 'now')

		clock.mockReturnValue(start + 60 * 1000)
		await page.vm.runPageRefresh()
		expect(page.vm.autoRefreshLastGoodAt).toBe(start + 60 * 1000)

		ok = false
		clock.mockReturnValue(start + 6 * 60 * 1000)
		await page.vm.runPageRefresh()
		await page.vm.$nextTick()
		// Failing, but the last good read is five minutes old: no warning yet.
		expect(page.vm.autoRefreshFailing).toBe(true)
		expect(page.find('[data-testid="cn-dashboard-page-stale"]').exists()).toBe(false)

		clock.mockReturnValue(start + 12 * 60 * 1000)
		await page.vm.runPageRefresh()
		await page.vm.$nextTick()
		const warning = page.find('[data-testid="cn-dashboard-page-stale"]')
		expect(warning.exists()).toBe(true)
		const time = new Date(start + 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		expect(warning.text()).toContain(`Data may be outdated. Last updated: ${time}`)
		expect(page.find('[data-testid="cn-dashboard-page-stale-retry"]').text()).toBe('Retry')

		// Retry, and the reads answer again: the warning goes.
		ok = true
		clock.mockReturnValue(start + 13 * 60 * 1000)
		await page.find('[data-testid="cn-dashboard-page-stale-retry"]').trigger('click')
		await new Promise((resolve) => setTimeout(resolve, 0))
		await page.vm.$nextTick()
		expect(page.find('[data-testid="cn-dashboard-page-stale"]').exists()).toBe(false)
		clock.mockRestore()
		off()
	})

	it('counts a page with no reading widget as a good read', async () => {
		const page = mountPage({ autoRefresh: true })
		await page.vm.runPageRefresh()
		expect(page.vm.autoRefreshFailing).toBe(false)
	})
})
