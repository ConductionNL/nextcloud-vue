/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnBannerWidget `content.connection`: `offline` shows the banner only while
 * the device is offline (DqInspectie "3 wijzigingen wachten op bereik"),
 * following the browser's online and offline events.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default

/**
 * Set what navigator.onLine answers and tell the page.
 *
 * @param {boolean} online Whether the browser is online.
 * @return {Promise<void>}
 */
async function goOnline(online) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online })
	window.dispatchEvent(new Event(online ? 'online' : 'offline'))
	await nextTick()
}

describe('CnBannerWidget connection', () => {
	afterEach(async () => {
		await goOnline(true)
	})

	it('shows an offline banner only while the device is offline', async () => {
		await goOnline(true)
		const w = mount(CnBannerWidget, { props: { content: { text: 'Changes wait for a connection.', connection: 'offline' } } })
		expect(w.text()).not.toContain('Changes wait')
		await goOnline(false)
		expect(w.text()).toContain('Changes wait')
		await goOnline(true)
		expect(w.text()).not.toContain('Changes wait')
		w.unmount()
	})

	it('shows a banner without the option either way', async () => {
		await goOnline(false)
		const w = mount(CnBannerWidget, { props: { content: { text: 'Always here.' } } })
		expect(w.text()).toContain('Always here.')
		w.unmount()
	})
})
