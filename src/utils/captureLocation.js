/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Ask the device where it is. Never rejects: no geolocation, a refusal and a
 * timeout all answer null, so a caller can carry on without a location.
 *
 * @param {number} [timeout] How long to wait, in ms.
 * @return {Promise<{lat: number, lng: number, accuracy: number, at: string}|null>} The position.
 */
export function captureLocation(timeout = 10000) {
	if (typeof navigator === 'undefined' || !navigator.geolocation) {
		return Promise.resolve(null)
	}
	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) => resolve({
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				accuracy: position.coords.accuracy,
				at: new Date().toISOString(),
			}),
			() => resolve(null),
			{ enableHighAccuracy: true, timeout },
		)
	})
}
