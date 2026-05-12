/**
 * Built-in integration registrations.
 *
 * The five always-available integrations (`files`, `notes`, `tags`,
 * `tasks`, `audit-trail`) that mirror OpenRegister's built-in PHP
 * `IntegrationProvider`s. Each entry maps onto the existing
 * `CnObjectSidebar` tab plus a compact widget for dashboard / detail
 * surfaces.
 *
 * OpenRegister's main bundle calls `registerBuiltinIntegrations()`
 * once at bootstrap (after `installIntegrationRegistry()`), so the
 * built-ins are present before any consuming app registers its own.
 * Re-registering is harmless: the collision policy (AD-13) keeps the
 * first registration, so a consuming app can pre-register an `id` to
 * override a built-in.
 *
 * @module integrations/builtin
 */

import { integrations as defaultRegistry } from '../registry.js'
import { filesIntegration } from './files.js'
import { notesIntegration } from './notes.js'
import { tagsIntegration } from './tags.js'
import { tasksIntegration } from './tasks.js'
import { auditTrailIntegration } from './audit-trail.js'

/**
 * Ordered list of the built-in integration descriptors.
 *
 * @type {object[]}
 */
export const builtinIntegrations = [
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
]

/**
 * Register every built-in integration onto a registry. Existing
 * registrations win (collision policy: first wins), so this is safe
 * to call after consuming apps have pre-registered overrides — the
 * collision warning is suppressed here on purpose.
 *
 * @param {object} [registry] Registry instance (default: the singleton).
 *
 * @return {string[]} The ids that were newly registered (skipped ones excluded).
 */
export function registerBuiltinIntegrations(registry) {
	const target = registry || defaultRegistry
	const registered = []
	for (const descriptor of builtinIntegrations) {
		if (target.has(descriptor.id) === true) {
			continue
		}
		const result = target.register(descriptor)
		if (result !== null) {
			registered.push(descriptor.id)
		}
	}
	return registered
}

export { filesIntegration, notesIntegration, tagsIntegration, tasksIntegration, auditTrailIntegration }
