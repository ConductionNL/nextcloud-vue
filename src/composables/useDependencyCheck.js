/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { useAppStatus } from './useAppStatus.js'

/**
 * Resolve `manifest.dependencies` entries to their live status.
 *
 * Accepts the manifest's own shape: an app-id string (a REQUIRED dependency)
 * or `{ id, name?, required? }` where `required` defaults to true. Each entry
 * becomes `{ id, name, required, installed, enabled }`.
 *
 * `serverStatuses` is the optional `dependency_statuses` initial state an app
 * injects from PHP, keyed by app id: `{ installed, enabled }`. It wins over
 * the browser heuristic, because only the server can tell "installed but
 * disabled" from "not installed". Without it, `useAppStatus` answers, which
 * is the same resolution `CnAppRoot` uses for its dependency-missing phase.
 *
 * @param {Array<string|{id: string, name?: string, required?: boolean}>} entries The declared dependencies.
 * @param {object} [serverStatuses] Server-reported statuses keyed by app id.
 * @return {Array<{id: string, name: string, required: boolean, installed: boolean, enabled: boolean}>} One row per valid entry.
 *
 * @spec openspec/changes/setup-wizard-card-load-and-dependency-gate/specs/cn-setup-wizard/spec.md#requirement-the-wizard-checks-dependencies-before-any-step
 *
 * @example
 * const missing = checkDependencies(manifest.dependencies)
 *   .filter((d) => d.required && !(d.installed && d.enabled))
 */
export function checkDependencies(entries, serverStatuses = {}) {
	const list = Array.isArray(entries) ? entries : []
	const server = (serverStatuses && typeof serverStatuses === 'object') ? serverStatuses : {}
	return list
		.map((entry) => {
			const isObject = entry !== null && typeof entry === 'object'
			const id = isObject ? entry.id : entry
			if (typeof id !== 'string' || id === '') {
				return null
			}
			const required = isObject ? entry.required !== false : true
			const name = (isObject && entry.name) || id
			const reported = server[id]
			if (reported !== undefined && reported !== null) {
				return { id, name, required, installed: !!reported.installed, enabled: !!reported.enabled }
			}
			const status = useAppStatus(id)
			return { id, name, required, installed: !!status.installed.value, enabled: !!status.enabled.value }
		})
		.filter((row) => row !== null)
}

/**
 * Whether a resolved dependency row is usable: installed AND enabled.
 *
 * @param {{installed: boolean, enabled: boolean}} row A row from `checkDependencies`.
 * @return {boolean} True when the app can be used.
 */
export function isDependencyResolved(row) {
	return !!row && row.installed === true && row.enabled === true
}
