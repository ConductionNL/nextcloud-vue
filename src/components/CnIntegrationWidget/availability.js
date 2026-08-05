/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Per-integration availability resolution for CnIntegrationWidget.
 *
 * Phase J-B added a per-provider `available` flag to the OpenRegister
 * OCS capability (`openregister.integrations.providers[]`,
 * openregister#1853). This helper resolves whether a given integration's
 * backing app is available + configured, sourcing the answer in this
 * order:
 *
 *   1. descriptor `available` (boolean) — when the registry descriptor
 *      carries it directly (some per-app waves set it).
 *   2. the OCS capability `openregister.integrations.providers[]` keyed
 *      by provider id — its `available` flag, plus an optional `reason`
 *      ('missing-app' | 'not-configured') that lets the widget tell
 *      missing-app (e.g. Deck not installed) from not-configured (e.g.
 *      xWiki has no OpenConnector source).
 *   3. `isAppInstalled(requiredApp)` — the OC.appswebroots / capabilities
 *      fallback when the OCS integrations payload is absent.
 *
 * Kept framework-agnostic (no Vue import) so it unit-tests cleanly and
 * the capabilities accessor can be injected.
 *
 * @module components/CnIntegrationWidget/availability
 */

/**
 * Read the OpenRegister integrations capability providers map.
 *
 * Returns a plain object keyed by provider id, or null when the
 * capability isn't present (older OR, headless test env, etc.).
 *
 * @param {() => object} [getCapabilities] Capabilities accessor (injectable for tests).
 * @return {{[id: string]: object}|null} Map of id → provider payload, or null.
 */
export function readCapabilityProviders(getCapabilities) {
	let accessor = getCapabilities
	if (typeof accessor !== 'function') {
		// Lazy default — avoids a hard dependency in environments that
		// don't ship @nextcloud/capabilities (some unit suites).
		try {
			// eslint-disable-next-line global-require
			accessor = require('@nextcloud/capabilities').getCapabilities
		} catch (e) {
			return null
		}
	}
	let caps = null
	try {
		caps = accessor()
	} catch (e) {
		return null
	}
	if (caps === null || typeof caps !== 'object') {
		return null
	}
	const or = caps.openregister
	if (or === null || or === undefined || typeof or !== 'object') {
		return null
	}
	const integrations = or.integrations
	if (integrations === null || integrations === undefined || typeof integrations !== 'object') {
		return null
	}
	const providers = integrations.providers
	if (providers === null || providers === undefined) {
		return null
	}
	// providers may be an array of {id, available, reason, ...} or an
	// object keyed by id — normalise to a keyed map.
	const map = {}
	if (Array.isArray(providers)) {
		for (const entry of providers) {
			if (entry !== null && typeof entry === 'object' && typeof entry.id === 'string') {
				map[entry.id] = entry
			}
		}
		return map
	}
	if (typeof providers === 'object') {
		return providers
	}
	return null
}

/**
 * Resolve a provider's availability for the widget.
 *
 * @param {object} provider Normalised registry descriptor (`id`,
 *   `requiredApp`, optional `available`).
 * @param {object} [deps] Injectable dependencies.
 * @param {(appId: string) => boolean} [deps.isAppInstalled] App-installed check.
 * @param {() => object} [deps.getCapabilities] Capabilities accessor.
 * @return {{ available: boolean, reason: string }} `reason` is one of
 *   'available' | 'missing-app' | 'not-configured' | 'unknown'.
 */
export function resolveProviderAvailability(provider, deps) {
	const d = deps || {}

	if (provider === null || typeof provider !== 'object') {
		return { available: false, reason: 'unknown' }
	}

	// 1. Descriptor-carried flag wins.
	if (typeof provider.available === 'boolean') {
		return {
			available: provider.available,
			reason: provider.available ? 'available' : reasonFromProvider(provider, null),
		}
	}

	// 2. OCS capability providers map.
	const providers = readCapabilityProviders(d.getCapabilities)
	if (providers !== null && Object.prototype.hasOwnProperty.call(providers, provider.id)) {
		const entry = providers[provider.id]
		if (entry !== null && typeof entry === 'object' && typeof entry.available === 'boolean') {
			return {
				available: entry.available,
				reason: entry.available ? 'available' : reasonFromProvider(provider, entry),
			}
		}
	}

	// 3. isAppInstalled fallback (only meaningful when a requiredApp is
	//    declared; built-ins with requiredApp === null are assumed
	//    always-available).
	if (!provider.requiredApp) {
		return { available: true, reason: 'available' }
	}
	if (typeof d.isAppInstalled === 'function') {
		const installed = d.isAppInstalled(provider.requiredApp)
		return {
			available: installed,
			reason: installed ? 'available' : 'missing-app',
		}
	}

	// No signal at all — treat as unknown-unavailable so the user still
	// sees the set-up affordance rather than a silent blank.
	return { available: false, reason: 'unknown' }
}

/**
 * Derive the unavailable reason. External integrations (no `requiredApp`,
 * or an explicit `group: 'external'`) are "not configured"; app-backed
 * integrations are "missing app". An OCS entry `reason` overrides.
 *
 * @param {object} provider Normalised registry descriptor.
 * @param {object|null} entry OCS provider entry (may carry `reason`).
 * @return {string} 'missing-app' | 'not-configured'.
 */
function reasonFromProvider(provider, entry) {
	if (entry !== null && typeof entry === 'object' && typeof entry.reason === 'string' && entry.reason !== '') {
		return entry.reason
	}
	if (provider.group === 'external' || !provider.requiredApp) {
		return 'not-configured'
	}
	return 'missing-app'
}
