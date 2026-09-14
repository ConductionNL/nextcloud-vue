/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useUserPreferences: how a person likes the product, stored where Nextcloud
 * already keeps that.
 *
 * Nine of this cluster's seventeen candidates are one per-user preference
 * each: a landing page, pinned navigation, a date display, the view each list
 * reopens in, a row order. None of them belongs in a component store. A
 * preference kept in a component store is gone on the next page, invisible on
 * another device, and nowhere an administrator can look for it. Nextcloud
 * already has per-user preferences and the apps already use them, so this
 * reads and writes through the app's own preferences endpoint:
 *
 *     GET  /apps/{appId}/api/preferences/{key}   ->  { value }
 *     PUT  /apps/{appId}/api/preferences/{key}       { value }
 *
 * the same endpoint `useWalkthrough` and `useSupportDialog` address.
 *
 * Three layers resolve in one order: the app's default, the administrator's
 * value, the person's own. An instance that switches personal customisation
 * off collapses the third layer AND says so, rather than accepting what
 * somebody sets and quietly ignoring it. A preference that silently does not
 * apply is worse than one that is not offered.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module composables/useUserPreferences
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { computed, ref } from 'vue'

/** Prefix for the per-browser mirror, so a preference is there before the GET answers. */
export const USER_PREFERENCE_STORAGE_PREFIX = 'cn-preference:'

/** The keys this cluster introduced, so an app and the library spell them the same way. */
export const USER_PREFERENCE_KEYS = {
	/** Page id the app opens on. */
	landingPage: 'cn_landing_page',
	/** Menu ids this person pinned, in their order. */
	pinnedMenu: 'cn_pinned_menu',
	/** `absolute` or `relative`. */
	dateDisplay: 'cn_date_display',
	/** Map of record type to the view mode that person last used on it. */
	lastUsedView: 'cn_last_used_view',
	/** Menu ids in this person's own navigation order. */
	menuOrder: 'cn_menu_order',
}

/**
 * The per-user preferences endpoint for one key.
 *
 * Read and write MUST address the same URL. A write that lands on a different
 * key reads back as "never set" forever, which looks exactly like a
 * preference that does not persist.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} key The preference key.
 * @return {string} The generated URL.
 */
export function userPreferenceUrl(appId, key) {
	return generateUrl('/apps/' + appId + '/api/preferences/' + key)
}

/**
 * Resolve one preference across its three layers.
 *
 * The order is the whole rule: an app default is what the product ships, an
 * administered value is what this instance decided, and a personal value is
 * what this person chose. When personal customisation is off the third layer
 * is dropped, and `personalApplies` says so, so the interface can render the
 * option as unavailable with the reason instead of pretending it works.
 *
 * @param {object} layers The three layers.
 * @param {string|number|boolean|Array|object|null|undefined} [layers.appDefault] What the manifest declares.
 * @param {string|number|boolean|Array|object|null|undefined} [layers.administered] What the administrator set.
 * @param {string|number|boolean|Array|object|null|undefined} [layers.personal] What this person set.
 * @param {boolean} [layers.personalisationEnabled] Whether the personal layer applies at all.
 * @return {{ value: string|number|boolean|Array|object|null|undefined, source: 'personal'|'administered'|'app'|'none', personalApplies: boolean }} The resolved value and where it came from.
 */
export function resolvePreference({ appDefault, administered, personal, personalisationEnabled = true } = {}) {
	const personalApplies = personalisationEnabled !== false
	if (personalApplies && isSet(personal)) {
		return { value: personal, source: 'personal', personalApplies }
	}
	if (isSet(administered)) {
		return { value: administered, source: 'administered', personalApplies }
	}
	if (isSet(appDefault)) {
		return { value: appDefault, source: 'app', personalApplies }
	}
	return { value: undefined, source: 'none', personalApplies }
}

/**
 * Whether a layer carries a value at all.
 *
 * `false` and `0` are values somebody chose. Only `undefined`, `null` and the
 * empty string are absences. Treating `false` as unset is how a person who
 * switched something off gets it switched back on by the layer below.
 *
 * @param {string|number|boolean|Array|object|null|undefined} value The value.
 * @return {boolean} Whether the layer is set.
 */
function isSet(value) {
	return value !== undefined && value !== null && value !== ''
}

/**
 * Read one preference for the current user.
 *
 * Falls back to the per-browser mirror, then to the given fallback, so a
 * missing endpoint, an unauthenticated session or an offline browser costs a
 * remembered preference and nothing else.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} key The preference key.
 * @param {string|number|boolean|Array|object|null|undefined} [fallback] What to answer when nothing is stored.
 * @param {object} [options] Options.
 * @param {object} [options.http] An axios-shaped client, for tests.
 * @param {object} [options.storage] A localStorage-shaped store, for tests.
 * @return {Promise<string|number|boolean|Array|object|null|undefined>} The stored value, or the fallback.
 */
export async function readUserPreference(appId, key, fallback = null, options = {}) {
	const local = readLocal(appId, key, options.storage)
	if (!appId || !key) {
		return local ?? fallback
	}
	const http = options.http || axios
	try {
		const { data } = await http.get(userPreferenceUrl(appId, key))
		// An HTML string is the SPA shell from an app that does not serve this
		// route, not a stored value. Reading it as one would overwrite a real
		// preference with a page of markup.
		if (!isPlainObject(data) || !('value' in data)) {
			return local ?? fallback
		}
		const parsed = parseStored(data.value)
		if (parsed === undefined || parsed === null) {
			return local ?? fallback
		}
		writeLocal(appId, key, parsed, options.storage)
		return parsed
	} catch {
		return local ?? fallback
	}
}

/**
 * Write one preference for the current user.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} key The preference key.
 * @param {string|number|boolean|Array|object|null|undefined} value The value to store.
 * @param {object} [options] Options.
 * @param {object} [options.http] An axios-shaped client, for tests.
 * @param {object} [options.storage] A localStorage-shaped store, for tests.
 * @return {Promise<boolean>} Whether it reached the server.
 */
export async function writeUserPreference(appId, key, value, options = {}) {
	writeLocal(appId, key, value, options.storage)
	if (!appId || !key) {
		return false
	}
	const http = options.http || axios
	try {
		await http.put(userPreferenceUrl(appId, key), { value: JSON.stringify(value) })
		return true
	} catch {
		// The browser mirror already holds it, so the preference survives this
		// session. Saying nothing is deliberate: a toast on every failed
		// preference write would be noise on an instance without the endpoint.
		return false
	}
}

/**
 * The per-user preferences of one app, as a reactive group.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {object} [options] Options.
 * @param {object} [options.personalisation] The manifest's `personalisation` block: the app defaults and the instance switch.
 * @param {object} [options.administered] Administered values, by key.
 * @param {object} [options.http] An axios-shaped client, for tests.
 * @param {object} [options.storage] A localStorage-shaped store, for tests.
 * @return {object} The group: `read`, `write`, `resolve`, `values`, `loading`, `personalApplies`, `disabledReason`.
 *
 * @example
 * const prefs = useUserPreferences('dossiq', { personalisation: manifest.personalisation })
 * const landing = await prefs.read(USER_PREFERENCE_KEYS.landingPage, 'Cases')
 * await prefs.write(USER_PREFERENCE_KEYS.dateDisplay, 'relative')
 */
export function useUserPreferences(appId, options = {}) {
	const { personalisation = {}, administered = {}, http, storage } = options
	const values = ref({})
	const loading = ref(false)

	/**
	 * Whether the personal layer applies on this instance.
	 *
	 * @return {boolean} False when an administrator switched personal customisation off.
	 */
	const personalApplies = computed(() => personalisation?.enabled !== false)

	/**
	 * What to tell a person when the personal layer is off.
	 *
	 * @return {string} The reason, or an empty string.
	 */
	const disabledReason = computed(() => (personalApplies.value ? '' : (personalisation?.disabledReason || '')))

	/**
	 * Read one preference, resolved across its three layers.
	 *
	 * @param {string} key The preference key.
	 * @param {string|number|boolean|Array|object|null|undefined} [fallback] What to answer when no layer carries a value.
	 * @return {Promise<string|number|boolean|Array|object|null|undefined>} The resolved value.
	 */
	async function read(key, fallback = null) {
		loading.value = true
		try {
			const personal = personalApplies.value
				? await readUserPreference(appId, key, undefined, { http, storage })
				: undefined
			const { value } = resolvePreference({
				appDefault: appDefaultFor(key, personalisation),
				administered: administered?.[key],
				personal,
				personalisationEnabled: personalApplies.value,
			})
			const resolved = value === undefined ? fallback : value
			values.value = { ...values.value, [key]: resolved }
			return resolved
		} finally {
			loading.value = false
		}
	}

	/**
	 * Write one preference, unless this instance switched the personal layer
	 * off. Refusing the write is the honest half of the switch: accepting it
	 * and then not applying it is the behaviour the switch exists to replace.
	 *
	 * @param {string} key The preference key.
	 * @param {string|number|boolean|Array|object|null|undefined} value The value to store.
	 * @return {Promise<boolean>} Whether it was written.
	 */
	async function write(key, value) {
		if (!personalApplies.value) {
			return false
		}
		values.value = { ...values.value, [key]: value }
		return writeUserPreference(appId, key, value, { http, storage })
	}

	/**
	 * Resolve a value across the three layers without reading the server.
	 *
	 * @param {string} key The preference key.
	 * @param {string|number|boolean|Array|object|null|undefined} [personal] A personal value already in hand.
	 * @return {object} The resolution, from `resolvePreference`.
	 */
	function resolve(key, personal) {
		return resolvePreference({
			appDefault: appDefaultFor(key, personalisation),
			administered: administered?.[key],
			personal,
			personalisationEnabled: personalApplies.value,
		})
	}

	return { read, write, resolve, values, loading, personalApplies, disabledReason, appId }
}

/**
 * The app default for a key, read off the manifest's `personalisation` block.
 *
 * @param {string} key The preference key.
 * @param {object} personalisation The manifest block.
 * @return {string|number|boolean|Array|object|null|undefined} The default, or undefined.
 */
function appDefaultFor(key, personalisation) {
	const byKey = {
		[USER_PREFERENCE_KEYS.landingPage]: personalisation?.landingPage,
		[USER_PREFERENCE_KEYS.dateDisplay]: personalisation?.dateDisplay,
		[USER_PREFERENCE_KEYS.pinnedMenu]: personalisation?.pinnedMenu,
	}
	return byKey[key]
}

/**
 * Parse a stored preference. Values are stored as JSON so an array or a map
 * survives the round trip; a plain string that is not JSON is its own value.
 *
 * @param {string|number|boolean|Array|object|null} raw The stored value.
 * @return {string|number|boolean|Array|object|null|undefined} The parsed value.
 */
function parseStored(raw) {
	if (typeof raw !== 'string') {
		return raw
	}
	try {
		return JSON.parse(raw)
	} catch {
		return raw
	}
}

/**
 * Whether a value is a plain object.
 *
 * @param {string|number|boolean|Array|object|null|undefined} value The value.
 * @return {boolean} True for a plain object.
 */
function isPlainObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The browser mirror's key.
 *
 * @param {string} appId The app id.
 * @param {string} key The preference key.
 * @return {string} The storage key.
 */
function storageKey(appId, key) {
	return `${USER_PREFERENCE_STORAGE_PREFIX}${appId}:${key}`
}

/**
 * Read the browser mirror.
 *
 * @param {string} appId The app id.
 * @param {string} key The preference key.
 * @param {object} [storage] A localStorage-shaped store.
 * @return {string|number|boolean|Array|object|null|undefined} The mirrored value, or undefined.
 */
function readLocal(appId, key, storage) {
	const store = storage || safeLocalStorage()
	if (!store) {
		return undefined
	}
	try {
		const raw = store.getItem(storageKey(appId, key))
		return raw === null || raw === undefined ? undefined : parseStored(raw)
	} catch {
		return undefined
	}
}

/**
 * Write the browser mirror.
 *
 * @param {string} appId The app id.
 * @param {string} key The preference key.
 * @param {string|number|boolean|Array|object|null|undefined} value The value.
 * @param {object} [storage] A localStorage-shaped store.
 */
function writeLocal(appId, key, value, storage) {
	const store = storage || safeLocalStorage()
	if (!store) {
		return
	}
	try {
		store.setItem(storageKey(appId, key), JSON.stringify(value))
	} catch {
		// A private window, blocked site data, or a full quota. The server
		// write is the authoritative one; the mirror is a convenience.
	}
}

/**
 * `localStorage`, when the browser has one and lets us touch it.
 *
 * @return {object|null} The store, or null.
 */
function safeLocalStorage() {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null
	} catch {
		return null
	}
}
