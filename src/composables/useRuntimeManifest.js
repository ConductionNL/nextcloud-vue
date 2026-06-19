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
 *
 * Merge behaviour is selected by `options.mergeStrategy`:
 *  - default / `'replace'` — the API response fully REPLACES the stub
 *    (ADR-036 Decision 8, unchanged).
 *  - `'delta'` — the API response is treated as a keyed structural DELTA and
 *    applied to `stubManifest` via `mergeManifestDelta` (ADR-036 Amendment
 *    2026-06-17). Orphaned patches are surfaced on `orphanedDeltaPaths`.
 *
 * Spec: REQ-MVR-001 (manifest-v2-renderer) / ADR-036 Decision 8 + Amendment
 */

import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { validateManifest } from '../utils/validateManifest.js'
import { mergeManifestDelta } from '../utils/mergeManifestDelta.js'

/**
 * Load a v2 manifest at runtime.
 *
 * @param {string} appId Nextcloud app ID. Used to build `GET /apps/{appId}/api/manifest`.
 * @param {object|null} [stubManifest] Fallback manifest used on 404/error/validation failure.
 *   In `delta` mode this is ALSO the merge base. When omitted, `manifest.value`
 *   stays `null` on failure.
 * @param {object} [options] Optional configuration.
 * @param {Function} [options.fetcher] Override the fetch function. Must return a promise
 *   resolving to `{ status: number, data: object }`. Defaults to `axios.get`.
 * @param {('replace'|'delta')} [options.mergeStrategy] How to combine the fetched
 *   payload with the stub. Defaults to `'replace'` (full replace, unchanged).
 * @return {{ manifest: import('vue').Ref, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null>, orphanedDeltaPaths: import('vue').Ref<string[]> }}
 */
export function useRuntimeManifest(appId, stubManifest = null, options = {}) {
	const manifest = ref(stubManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)
	const orphanedDeltaPaths = ref([])

	const url = generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((u) => axios.get(u))
	const isDelta = options.mergeStrategy === 'delta'

	;(async () => {
		try {
			const response = await fetcher(url)

			if (!response || response.status !== 200 || !response.data) {
				// Non-200 or empty response — use stub
				manifest.value = stubManifest
				return
			}

			// In delta mode the fetched payload is a delta applied to the stub
			// base; otherwise it is the full manifest. Validation runs on the
			// resolved result either way.
			let resolved = response.data
			if (isDelta) {
				const merged = mergeManifestDelta(stubManifest || {}, response.data)
				resolved = merged.manifest
				orphanedDeltaPaths.value = merged.orphanedDeltaPaths
			}

			const result = validateManifest(resolved)

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

			manifest.value = resolved
			validationErrors.value = null
		} catch (err) {
			// 404, network errors, etc. — fall back to stub
			manifest.value = stubManifest
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors, orphanedDeltaPaths }
}
