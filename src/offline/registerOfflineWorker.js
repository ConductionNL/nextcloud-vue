/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Register the offline shell worker, when the host asks for it.
 *
 * 🔴 IT IS NEVER REGISTERED BY IMPORTING THIS FILE. A service worker changes
 * how every request from that origin is answered, for every app on it, until
 * somebody unregisters it. A library that installs one as a side effect of
 * being imported would take that decision away from the app that owns the
 * origin, and take it silently. The host calls this function or gets no worker.
 *
 * It does nothing, quietly, where the browser has no service worker support or
 * no secure context. Both are ordinary on a field device, and neither is a
 * reason to throw at somebody who is about to start a day of capture.
 *
 * @module offline/registerOfflineWorker
 */

/**
 * Register the offline shell worker.
 *
 * @param {object} args              Registration arguments.
 * @param {string} args.scriptUrl    The URL the host serves the worker from.
 * @param {string} [args.scope]      The scope to claim (default: the script's directory).
 * @param {object} [args.container]  A ServiceWorkerContainer (test seam).
 *
 * @return {Promise<object|null>} The registration, or null when nothing was registered.
 */
export async function registerOfflineWorker({ scriptUrl, scope = '', container = null } = {}) {
	const sw = container
		|| ((typeof navigator !== 'undefined' && navigator.serviceWorker) ? navigator.serviceWorker : null)

	if (sw === null || typeof sw.register !== 'function') {
		return null
	}

	if (typeof scriptUrl !== 'string' || scriptUrl === '') {
		return null
	}

	try {
		return await sw.register(scriptUrl, scope === '' ? undefined : { scope })
	} catch (error) {
		// A refused registration is not a reason to stop the app loading. The
		// leaf works without a worker: the worker only decides whether the
		// SHELL opens offline, not whether anything can be captured or queued.
		// eslint-disable-next-line no-console
		console.warn('[offline] the shell worker was not registered', error)
		return null
	}
}

/**
 * Remove any offline shell worker this origin has registered.
 *
 * Offered because a host that opts in has to be able to opt back out. A worker
 * that cannot be removed without clearing site data is a worker that outlives
 * the decision to use it.
 *
 * @param {object} [container] A ServiceWorkerContainer (test seam).
 *
 * @return {Promise<number>} How many registrations were removed.
 */
export async function unregisterOfflineWorker(container = null) {
	const sw = container
		|| ((typeof navigator !== 'undefined' && navigator.serviceWorker) ? navigator.serviceWorker : null)

	if (sw === null || typeof sw.getRegistrations !== 'function') {
		return 0
	}

	const registrations = await sw.getRegistrations()
	let removed = 0
	for (const registration of registrations) {
		if (typeof registration.unregister === 'function' && await registration.unregister() === true) {
			removed += 1
		}
	}

	return removed
}
