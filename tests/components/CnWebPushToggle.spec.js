/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A person can switch web push on for this device (OpenRegister's web-push
 * channel), never prompted on load (humaniq self-service-mobile 2.3).
 *
 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}` }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnWebPushToggle from '../../src/components/CnWebPushToggle/CnWebPushToggle.vue'
import { disableWebPush, enableWebPush, vapidKeyBytes } from '../../src/utils/webPush.js'

let subscription
let pushManager
function installBrowser({ permission = 'granted', existing = null } = {}) {
	subscription = existing
	pushManager = {
		getSubscription: jest.fn(() => Promise.resolve(subscription)),
		subscribe: jest.fn(() => {
			subscription = { endpoint: 'https://push.example/abc', toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } }), unsubscribe: jest.fn(() => Promise.resolve(true)) }
			return Promise.resolve(subscription)
		}),
	}
	const registration = { pushManager }
	window.PushManager = function PushManager() {}
	window.Notification = { requestPermission: jest.fn(() => Promise.resolve(permission)) }
	Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(registration), getRegistration: jest.fn(() => Promise.resolve(registration)) } })
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.delete.mockReset()
	axios.get.mockResolvedValue({ data: { publicKey: 'BEl6', configured: true } })
	axios.post.mockResolvedValue({ data: {} })
	axios.delete.mockResolvedValue({ data: { deleted: 1 } })
})

describe('webPush', () => {
	it('subscribes with the VAPID key and registers the subscription with OpenRegister', async () => {
		installBrowser()
		expect(await enableWebPush()).toEqual({ ok: true })
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/webpush/vapid-public-key')
		expect(pushManager.subscribe.mock.calls[0][0].userVisibleOnly).toBe(true)
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/webpush/subscription', { endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } })
	})

	it('says why it could not: denied, or no key on the server', async () => {
		installBrowser({ permission: 'denied' })
		expect(await enableWebPush()).toEqual({ ok: false, reason: 'denied' })
		installBrowser()
		axios.get.mockResolvedValue({ data: { publicKey: '', configured: false } })
		expect(await enableWebPush()).toEqual({ ok: false, reason: 'not-configured' })
		expect(pushManager.subscribe).not.toHaveBeenCalled()
	})

	it('unsubscribes and removes the registration', async () => {
		installBrowser()
		await enableWebPush()
		const current = subscription
		expect(await disableWebPush()).toBe(true)
		expect(current.unsubscribe).toHaveBeenCalled()
		expect(axios.delete).toHaveBeenCalledWith('/index.php/apps/openregister/webpush/subscription', { data: { endpoint: 'https://push.example/abc' } })
	})

	it('turns a base64url key into bytes', () => {
		expect(Array.from(vapidKeyBytes('AQID'))).toEqual([1, 2, 3])
	})
})

describe('CnWebPushToggle', () => {
	it('asks nothing on load and shows the device as subscribed when it is', async () => {
		installBrowser({ existing: { endpoint: 'x', unsubscribe: jest.fn() } })
		const w = mount(CnWebPushToggle, { props: { hint: 'On an iPhone, add the app to the home screen first.' } })
		await flushPromises()
		expect(window.Notification.requestPermission).not.toHaveBeenCalled()
		expect(w.vm.enabled).toBe(true)
		expect(w.find('[data-testid="cn-web-push-hint"]').text()).toBe('On an iPhone, add the app to the home screen first.')
	})

	it('switches on from the click and explains a refusal', async () => {
		installBrowser({ permission: 'denied' })
		const w = mount(CnWebPushToggle)
		await flushPromises()
		await w.vm.onToggle(true)
		expect(w.vm.enabled).toBe(false)
		expect(w.find('[data-testid="cn-web-push-hint"]').text()).toContain('blocked')
		installBrowser()
		await w.vm.onToggle(true)
		expect(w.vm.enabled).toBe(true)
		expect(w.emitted('change').at(-1)).toEqual([true])
	})
})
