/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Web push on this device through OpenRegister's `web-push` channel
 * (ADR-031): opt-in on a user gesture only, the subscription registered with
 * `POST /apps/openregister/webpush/subscription` and removed with `DELETE`.
 * The service worker that shows the notifications is the app's own.
 *
 * @module utils/webPush
 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

const BASE = '/apps/openregister/webpush'

/**
 * Whether this browser can receive web push at all.
 *
 * @return {boolean}
 */
export function webPushSupported() {
	return typeof window !== 'undefined' && 'Notification' in window && typeof navigator !== 'undefined'
		&& 'serviceWorker' in navigator && typeof window.PushManager !== 'undefined'
}

/**
 * A base64url VAPID key as the bytes `pushManager.subscribe` takes.
 *
 * @param {string} key The key.
 * @return {Uint8Array} The bytes.
 */
export function vapidKeyBytes(key) {
	const padded = String(key).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (String(key).length % 4)) % 4)
	const raw = atob(padded)
	return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/**
 * The service worker registration push goes through: the one for `scope`,
 * else the page's ready registration.
 *
 * @param {string} [scope] The worker scope.
 * @return {Promise<ServiceWorkerRegistration|null>}
 */
async function registrationFor(scope) {
	if (scope) {
		return (await navigator.serviceWorker.getRegistration(scope)) || null
	}
	return navigator.serviceWorker.ready
}

/**
 * This device's current push subscription, without asking anything.
 *
 * @param {{scope?: string}} [options] The worker scope.
 * @return {Promise<PushSubscription|null>}
 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md#requirement-a-person-can-switch-web-push-on-for-this-device
 */
export async function currentPushSubscription({ scope } = {}) {
	if (!webPushSupported()) {
		return null
	}
	const registration = await navigator.serviceWorker.getRegistration(scope)
	return registration ? registration.pushManager.getSubscription() : null
}

/**
 * Switch web push on: ask permission, subscribe with OpenRegister's VAPID
 * key and register the subscription. Call it from a click only.
 *
 * @param {{scope?: string}} [options] The worker scope.
 * @return {Promise<{ok: boolean, reason?: ('unsupported'|'denied'|'not-configured'|'no-worker'|'failed')}>}
 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md#requirement-a-person-can-switch-web-push-on-for-this-device
 */
export async function enableWebPush({ scope } = {}) {
	if (!webPushSupported()) {
		return { ok: false, reason: 'unsupported' }
	}
	const permission = await window.Notification.requestPermission()
	if (permission !== 'granted') {
		return { ok: false, reason: 'denied' }
	}
	try {
		const { data } = await axios.get(generateUrl(`${BASE}/vapid-public-key`))
		if (!data || data.configured === false || !data.publicKey) {
			return { ok: false, reason: 'not-configured' }
		}
		const registration = await registrationFor(scope)
		if (!registration) {
			return { ok: false, reason: 'no-worker' }
		}
		const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(data.publicKey) })
		const json = subscription.toJSON()
		await axios.post(generateUrl(`${BASE}/subscription`), { endpoint: json.endpoint, keys: json.keys })
		return { ok: true }
	} catch {
		return { ok: false, reason: 'failed' }
	}
}

/**
 * Switch web push off for this device: unsubscribe and remove the
 * registration from OpenRegister.
 *
 * @param {{scope?: string}} [options] The worker scope.
 * @return {Promise<boolean>} True when nothing is subscribed any more.
 * @spec openspec/changes/web-push-toggle/specs/web-push-toggle/spec.md#requirement-a-person-can-switch-web-push-on-for-this-device
 */
export async function disableWebPush({ scope } = {}) {
	const subscription = await currentPushSubscription({ scope })
	if (!subscription) {
		return true
	}
	const { endpoint } = subscription
	try {
		await subscription.unsubscribe()
		await axios.delete(generateUrl(`${BASE}/subscription`), { data: { endpoint } })
		return true
	} catch {
		return false
	}
}
