/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useRuntimeManifest — runtime manifest loader for v2 manifests.
 *
 * Fetches `GET /apps/{appId}/api/manifest` at runtime via
 * `@nextcloud/axios` + `generateUrl` from `@nextcloud/router`.
 * Validates the response against the v2 schema via `validateManifest`.
 * Falls back to `stubManifest` on 404/network error or validation failure.
 * NO deep-merge semantics — the API response fully replaces the stub.
 *
 * Spec: REQ-MVR-001 (manifest-v2-renderer) / ADR-036 Decision 8
 */

import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { validateManifest } from '../utils/validateManifest.js'

/**
 * Load a v2 manifest at runtime, replacing `stubManifest` entirely on success.
 *
 * @param {string} appId Nextcloud app ID. Used to build `GET /apps/{appId}/api/manifest`.
 * @param {object|null} [stubManifest=null] Fallback manifest used on 404/error/validation failure.
 *   When omitted, `manifest.value` stays `null` on failure.
 * @param {object} [options={}] Optional configuration.
 * @param {Function} [options.fetcher] Override the fetch function. Must return a promise
 *   resolving to `{ status: number, data: object }`. Defaults to `axios.get`.
 * @return {{ manifest: import('vue').Ref, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null> }}
 */
export function useRuntimeManifest(appId, stubManifest = null, options = {}) {
	const manifest = ref(stubManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)

	const url = generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((u) => axios.get(u))

	;(async () => {
		try {
			const response = await fetcher(url)

			if (!response || response.status !== 200 || !response.data) {
				// Non-200 or empty response — use stub
				manifest.value = stubManifest
				return
			}

			const result = validateManifest(response.data)

			if (!result.valid) {
				validationErrors.value = result.errors
				manifest.value = stubManifest
				// eslint-disable-next-line no-console
				console.warn(
					'[useRuntimeManifest] Fetched manifest failed v2 schema validation; falling back to stub.',
					result.errors,
				)
				return
			}

			// Replace stub entirely — NO deep-merge per ADR-036 Decision 8
			manifest.value = response.data
			validationErrors.value = null
		} catch (err) {
			// 404, network errors, etc. — fall back to stub
			manifest.value = stubManifest
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors }
}
