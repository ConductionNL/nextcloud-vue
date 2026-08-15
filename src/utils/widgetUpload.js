/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { translate as t } from '@nextcloud/l10n'
import { validateUrl } from './widgetUrl.js'

/**
 * Cap for the no-transport fallback only: without a fileUploadFn the file must
 * be embedded as a data URL, and a large one can freeze the browser tab, so we
 * refuse anything bigger and tell the consumer to wire an upload transport.
 * Gated on the RAW file size (a cheap pre-check that avoids base64-encoding a
 * huge file at all); the stored data URL is ~1.37× this once base64-encoded,
 * so a 1 MB file yields a ~1.37 MB persisted string.
 *
 * @type {number}
 */
export const FALLBACK_MAX_BYTES = (1024 * 1024)

/**
 * Validate an upload transport's `{ url }` response and return the URL.
 * Shared by the `fileUploadFn` and legacy `uploadFn` paths: rejects an
 * empty/malformed shape and a hostile scheme (javascript:, data:, …) so a
 * misbehaving/compromised transport can't write an unsafe URL into content
 * (resource paths are `/`-relative, so they pass).
 *
 * @param {{url: string}} response the transport response.
 * @return {string} the validated URL.
 * @throws {Error} when the response has no URL or an unsafe scheme.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function extractTransportUrl(response) {
	if (!response || typeof response.url !== 'string' || response.url === '') {
		throw new Error('Upload transport returned no URL')
	}
	if (validateUrl(response.url) === false) {
		throw new Error('Upload transport returned an unsafe URL')
	}
	return response.url
}

/**
 * Read a file as a base64 data URL (uncapped). Used by the data-URL fallback
 * (behind the size cap in {@link embedAsDataUrl}) and by the deprecated
 * `uploadFn` path, which uploads to a server and so isn't size-capped.
 *
 * @param {File} file the file to read.
 * @return {Promise<string>} resolves to a `data:<mime>;base64,…` URL.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = (e) => {
			const dataUrl = e.target.result
			if (typeof dataUrl === 'string') {
				resolve(dataUrl)
			} else {
				reject(new Error('FileReader did not return a data URL'))
			}
		}
		reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
		reader.readAsDataURL(file)
	})
}

/**
 * No-transport fallback: embed the file as a data URL, but only when the raw
 * file is ≤ {@link FALLBACK_MAX_BYTES} (the encoded string stored in content is
 * ~1.37× that) so a huge inline blob can't freeze the tab.
 *
 * @param {File} file the pending file.
 * @return {Promise<string>} resolves to a `data:<mime>;base64,…` URL.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function embedAsDataUrl(file) {
	if (file.size > FALLBACK_MAX_BYTES) {
		return Promise.reject(new Error(
			t('nextcloud-vue', 'Image is too large to embed. Configure an upload transport for larger files.'),
		))
	}
	return readFileAsDataUrl(file)
}

/** Component names that have already emitted the `uploadFn`-deprecation warning. */
const warnedComponents = new Set()

/**
 * Emit the `uploadFn`-deprecation warning at most once per component type
 * (module-level guard — was once-per-instance before the shared extraction;
 * once-per-type simply means less console noise for the same deprecation).
 *
 * @param {string} componentName the calling component's name, for the log prefix.
 * @return {void}
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function warnUploadFnDeprecated(componentName) {
	if (warnedComponents.has(componentName)) {
		return
	}
	warnedComponents.add(componentName)
	// eslint-disable-next-line no-console
	console.warn(`[${componentName}] The \`uploadFn\` prop is deprecated; use \`fileUploadFn\`, which receives the raw File instead of a base64 data URL.`)
}
