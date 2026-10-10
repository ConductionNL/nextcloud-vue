import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'
import { reactive } from 'vue'

/**
 * Cached user groups — fetched once per session and reused.
 *
 * @type {{ userId: string|null, groups: string[]|null, promise: Promise|null }}
 */
const _cache = {
	userId: null,
	groups: null,
	promise: null,
}

/**
 * Reactive mirror of the group cache, keyed by user id, for synchronous
 * readers ({@link peekCurrentUserGroups}). A computed that reads a missing key
 * tracks it, so it re-runs when the groups arrive.
 *
 * @type {{ byUser: Record<string, string[]> }}
 */
const _peek = reactive({ byUser: {} })

/** User ids whose groups a peek already asked for (not reactive on purpose). */
const _peekRequested = new Set()

/**
 * Get the current Nextcloud user ID from OC.currentUser.
 *
 * @return {string|null} The current user ID, or null if not logged in
 */
export function getCurrentUserId() {
	return window.OC?.currentUser?.uid
		|| window.OC?.currentUser
		|| null
}

/**
 * Fetch the current user's Nextcloud groups. Results are cached so the
 * OCS API is only called once per page load.
 *
 * @return {Promise<string[]>} Array of group IDs the current user belongs to
 */
export async function getCurrentUserGroups() {
	const userId = getCurrentUserId()
	if (!userId) {
		return []
	}

	// Return cached result if we already fetched for this user
	if (_cache.userId === userId && _cache.groups !== null) {
		return _cache.groups
	}

	// If a fetch is already in progress for this user, await it
	if (_cache.userId === userId && _cache.promise) {
		return _cache.promise
	}

	_cache.userId = userId
	_cache.promise = _fetchGroups(userId)

	try {
		_cache.groups = await _cache.promise
	} catch {
		_cache.groups = []
	} finally {
		_cache.promise = null
	}

	return _cache.groups
}

/**
 * Synchronous, reactive read of the current user's group ids, for code that
 * cannot await (the `@myGroups` filter token). Returns the ids once they are
 * loaded, `null` while the first request is in flight (and starts that
 * request on first use), and `[]` when nobody is signed in. Read inside a
 * computed, the computed re-runs when the groups arrive.
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/schema-utilities/spec.md#requirement-mygroups-resolves-to-the-current-users-group-ids
 * @return {string[]|null} The group ids, or null while loading.
 */
export function peekCurrentUserGroups() {
	const userId = getCurrentUserId()
	if (!userId) {
		return []
	}
	const known = _peek.byUser[userId]
	if (Array.isArray(known)) {
		return known
	}
	if (!_peekRequested.has(userId)) {
		_peekRequested.add(userId)
		getCurrentUserGroups().then((groups) => {
			_peek.byUser[userId] = Array.isArray(groups) ? [...groups] : []
		})
	}
	return null
}

/**
 * Internal: fetch groups from OCS API.
 *
 * @param {string} userId The user ID to look up
 * @return {Promise<string[]>} Array of group IDs
 */
async function _fetchGroups(userId) {
	try {
		const url = generateOcsUrl('/cloud/users/{userId}/groups', { userId })
		const response = await axios.get(url)
		const groups = response.data?.ocs?.data?.groups || []
		return groups
	} catch (error) {
		// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
		console.error('[widgetVisibility] Failed to fetch user groups:', error)
		return []
	}
}

/**
 * Check whether a single widget is visible to the current user based on
 * its `visibility` configuration.
 *
 * Visibility rules:
 * - No `visibility` property -> visible to everyone
 * - `visibility.users` contains the current user ID -> visible
 * - `visibility.groups` overlaps with the user's groups -> visible
 * - Both `users` and `groups` are specified -> either match grants access (OR logic)
 * - Both are empty arrays -> visible to everyone
 *
 * @param {object} widget Widget definition object
 * @param {object} [widget.visibility] Optional visibility configuration
 * @param {string[]} [widget.visibility.users] User IDs who can see this widget
 * @param {string[]} [widget.visibility.groups] Group names who can see this widget
 * @param {string|null} userId Current user ID
 * @param {string[]} userGroups Current user's group memberships
 * @return {boolean} Whether the widget should be visible
 */
export function isWidgetVisible(widget, userId, userGroups) {
	const visibility = widget?.visibility
	if (!visibility) {
		return true
	}

	const allowedUsers = visibility.users || []
	const allowedGroups = visibility.groups || []

	// If both are empty, visible to everyone
	if (allowedUsers.length === 0 && allowedGroups.length === 0) {
		return true
	}

	// Check user match
	if (allowedUsers.length > 0 && userId && allowedUsers.includes(userId)) {
		return true
	}

	// Check group match
	if (allowedGroups.length > 0 && userGroups.length > 0) {
		const hasGroupMatch = allowedGroups.some((group) => userGroups.includes(group))
		if (hasGroupMatch) {
			return true
		}
	}

	return false
}

/**
 * Filter an array of widget definitions by visibility for the current user.
 *
 * This is an async function because it may need to fetch the user's groups
 * from the OCS API (cached after first call).
 *
 * @param {Array} widgets Array of widget definition objects
 * @return {Promise<Array>} Filtered array of visible widgets
 */
export async function filterWidgetsByVisibility(widgets) {
	if (!widgets || widgets.length === 0) {
		return []
	}

	// Quick path: if no widgets have visibility config, return all
	const hasVisibilityConfig = widgets.some((w) => w.visibility)
	if (!hasVisibilityConfig) {
		return widgets
	}

	const userId = getCurrentUserId()
	const userGroups = await getCurrentUserGroups()

	return widgets.filter((widget) => isWidgetVisible(widget, userId, userGroups))
}

/**
 * Reset the internal groups cache. Useful for testing or when user
 * context changes.
 */
export function resetVisibilityCache() {
	_cache.userId = null
	_cache.groups = null
	_cache.promise = null
	_peekRequested.clear()
	for (const key of Object.keys(_peek.byUser)) {
		delete _peek.byUser[key]
	}
}
