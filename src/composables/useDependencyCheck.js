/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { loadState } from '@nextcloud/initial-state'
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

/**
 * Read the `dependency_statuses` initial state an app may inject from PHP.
 *
 * Keyed by app id: `{ installed, enabled }`. Returns `{}` when the app injects
 * none or the state cannot be read, so callers fall back to `useAppStatus`.
 *
 * @param {string} appId The app whose initial state to read.
 * @return {object} Server-reported statuses keyed by app id.
 *
 * @spec openspec/changes/optional-step-requires/specs/cn-setup-wizard/spec.md#requirement-a-step-whose-required-apps-are-absent-is-not-applicable
 */
export function readServerAppStatuses(appId) {
	try {
		const statuses = loadState(appId, 'dependency_statuses', {})
		return (statuses && typeof statuses === 'object') ? statuses : {}
	} catch {
		return {}
	}
}

/**
 * The apps in a setup step's `requires` list that are not installed and
 * enabled.
 *
 * This is the one resolution every setup surface uses: `CnSetupWizard` skips a
 * step when it is non-empty, and `useSetupStatus` then counts that step as not
 * applicable rather than unmet. Keeping both on one function is what stops the
 * wizard and the status from disagreeing about the same step.
 *
 * @param {Array<string>} requires The step's `requires` app ids.
 * @param {object} [serverStatuses] Server-reported statuses keyed by app id.
 * @return {Array<{id: string, name: string, required: boolean, installed: boolean, enabled: boolean}>} The missing apps.
 *
 * @spec openspec/changes/optional-step-requires/specs/cn-setup-wizard/spec.md#requirement-a-step-whose-required-apps-are-absent-is-not-applicable
 */
export function missingRequiredApps(requires, serverStatuses = {}) {
	if (!Array.isArray(requires) || requires.length === 0) {
		return []
	}
	return checkDependencies(requires, serverStatuses).filter((row) => !isDependencyResolved(row))
}
