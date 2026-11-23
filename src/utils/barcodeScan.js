/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading a code from the device camera with the browser's own
 * `BarcodeDetector` (no library): QR, Code 128 and EAN-13. A browser without
 * it, or a refused camera, leaves typing as the way in.
 *
 * @module utils/barcodeScan
 * @spec openspec/changes/scan-field/specs/scan-field/spec.md
 */

/** Manifest format names to the BarcodeDetector's. */
export const SCAN_FORMATS = Object.freeze({ qr: 'qr_code', code128: 'code_128', ean13: 'ean_13' })

/**
 * Whether this browser can read codes from the camera.
 *
 * @return {boolean}
 */
export function scanSupported() {
	return typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function'
		&& typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * The detector formats for the manifest's `formats`; all three when none are named.
 *
 * @param {Array<string>} [formats] `qr`, `code128`, `ean13`.
 * @return {Array<string>} The BarcodeDetector formats.
 */
export function detectorFormats(formats) {
	const named = (Array.isArray(formats) ? formats : []).map((f) => SCAN_FORMATS[f]).filter(Boolean)
	return named.length > 0 ? named : Object.values(SCAN_FORMATS)
}

/**
 * Read frames from a playing video until a code is found or `signal` aborts.
 *
 * @param {HTMLVideoElement} video The camera video.
 * @param {Array<string>} formats The BarcodeDetector formats.
 * @param {{aborted: boolean}} signal Set `aborted` to stop.
 * @param {number} [interval] Milliseconds between frames.
 * @return {Promise<string|null>} The code, or null when stopped.
 */
export async function detectFromVideo(video, formats, signal, interval = 250) {
	const detector = new window.BarcodeDetector({ formats })
	while (!signal.aborted) {
		try {
			const found = await detector.detect(video)
			if (Array.isArray(found) && found.length > 0 && found[0].rawValue) {
				return String(found[0].rawValue)
			}
		} catch {
			// A frame that is not ready yet; try the next one.
		}
		await new Promise((resolve) => setTimeout(resolve, interval))
	}
	return null
}
