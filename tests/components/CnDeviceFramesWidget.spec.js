/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * device-frames-widget: several small pages side by side, each in a phone
 * frame with a title and a status line (board DqInspectie "Inspectie in het
 * veld": today offline, a checklist question, the sync queue). Each frame
 * stacks widgets of the surface through the sections widget; the status line
 * can follow the connection.
 *
 * @spec openspec/changes/device-frames-widget/specs/device-frames-widget/spec.md#requirement-a-page-can-show-several-small-pages-as-phone-frames
 */
import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { DASHBOARD_CATALOG_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'

import '../../src/components/CnDeviceFramesWidget/index.js'

const CnDeviceFramesWidget = require('../../src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue').default

const SIBLINGS = [{ id: 'today-runs', type: 'record-list' }, { id: 'sync-queue', type: 'record-list' }]

const CONTENT = {
	width: 330,
	status: { followConnection: true, offlineText: 'Offline · synced at 07:42', onlineText: 'Online' },
	frames: [
		{ key: 'today', title: 'Today', widgetIds: ['today-runs'] },
		{ key: 'sync', title: 'Synchronise', widgetIds: ['sync-queue', ''], status: { text: 'Three changes waiting', tone: 'info' } },
	],
}

/**
 * @param {boolean} online The connection state.
 * @return {object} Wrapper.
 */
function mountFrames(online) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online })
	return mount(CnDeviceFramesWidget, {
		props: { content: CONTENT, availableWidgets: SIBLINGS },
		global: {
			provide: { cnTranslate: (key) => `T(${key})` },
			stubs: { CnSectionsWidget: { name: 'CnSectionsWidget', props: ['content', 'availableWidgets'], template: '<div class="sections-stub" />' } },
		},
	})
}

describe('CnDeviceFramesWidget', () => {
	it('registers as a container on dashboards and detail pages', () => {
		const entry = getWidgetTypeEntry('device-frames')
		expect(entry.container).toBe(true)
		expect(entry.surfaces).toEqual(['app-dashboard', 'detail-page'])
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('device-frames')
	})

	it('draws a frame per entry with its title and its widgets as sections', () => {
		const w = mountFrames(true)
		const frames = w.findAll('.cn-device-frames-widget__frame')
		expect(frames.map((f) => f.find('h3').text())).toEqual(['T(Today)', 'T(Synchronise)'])
		const sections = w.findAllComponents({ name: 'CnSectionsWidget' })
		expect(sections[0].props('content').sections).toEqual([{ widgetId: 'today-runs' }])
		expect(sections[1].props('content').sections).toEqual([{ widgetId: 'sync-queue' }])
		expect(sections[0].props('availableWidgets')).toEqual(SIBLINGS)
		expect(frames[0].attributes('style')).toContain('--cn-device-frame-width: 330px')
		expect(frames[0].attributes('aria-labelledby')).toBe(frames[0].find('h3').attributes('id'))
	})

	it('follows the connection in the shared status, and a frame\'s own status wins', async () => {
		const offline = mountFrames(false)
		const [first, second] = offline.findAll('[data-testid="cn-device-frame-status"]')
		expect(first.text()).toBe('T(Offline · synced at 07:42)')
		expect(first.classes()).toContain('cn-device-frames-widget__status--warning')
		expect(second.text()).toBe('T(Three changes waiting)')
		const online = mountFrames(true)
		expect(online.find('[data-testid="cn-device-frame-status"]').text()).toBe('T(Online)')
		Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
		window.dispatchEvent(new Event('offline'))
		await online.vm.$nextTick()
		expect(online.find('[data-testid="cn-device-frame-status"]').text()).toBe('T(Offline · synced at 07:42)')
	})
})
