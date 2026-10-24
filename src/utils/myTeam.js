/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The current user's primary team, for the `@myTeam` filter token.
 *
 * A team is the app's notion, not Nextcloud's: Nextcloud knows the groups a
 * user is in, and only the app knows which one of them is the user's team.
 * So the app registers where to read it (`registerMyTeamSource`), and the
 * library reads it once per page. This module imports no `@nextcloud/*`
 * package, for the same reason `userGroupsPeek.js` does not: the token
 * resolver runs on public pages and in node.
 *
 * @module utils/myTeam
 */

import { reactive } from 'vue'

/**
 * `team` is the group id, `''` when the user has no team (or the app named no
 * source), and `null` while it has not been read.
 *
 * @type {{ team: (string|null) }}
 */
const _state = reactive({ team: null })

/** The app's loader, `() => Promise<string|null>`. */
let _source = null

/** The read in flight, shared by every caller. */
let _pending = null

/**
 * Name where the current user's primary team is read: a function answering
 * the team's Nextcloud group id, or null/'' for a user in no team.
 *
 * @spec openspec/changes/saved-view-tokens-my-team/specs/schema-utilities/spec.md#requirement-myteam-resolves-to-the-current-users-primary-team
 * @param {(() => Promise<string|null>)|null} loader The app's loader, or null to unregister.
 * @return {void}
 */
export function registerMyTeamSource(loader) {
	_source = typeof loader === 'function' ? loader : null
	_state.team = null
	_pending = null
}

/**
 * Read the team, once. Resolves to the group id, or `''` when there is none,
 * when no source is registered, or when the read fails.
 *
 * @spec openspec/changes/saved-view-tokens-my-team/specs/schema-utilities/spec.md#requirement-myteam-resolves-to-the-current-users-primary-team
 * @return {Promise<string>} The team's group id, or ''.
 */
export function loadMyTeam() {
	if (_state.team !== null) {
		return Promise.resolve(_state.team)
	}
	if (_pending) {
		return _pending
	}
	if (!_source) {
		_state.team = ''
		return Promise.resolve('')
	}
	_pending = Promise.resolve()
		.then(() => _source())
		.then((team) => (typeof team === 'string' ? team.trim() : ''))
		.catch(() => '')
		.then((team) => {
			_state.team = team
			_pending = null
			return team
		})
	return _pending
}

/**
 * Synchronous, reactive read: the group id, `''` for no team, or `null` while
 * it is being read (and starts the read on first use).
 *
 * @spec openspec/changes/saved-view-tokens-my-team/specs/schema-utilities/spec.md#requirement-myteam-resolves-to-the-current-users-primary-team
 * @return {string|null} The team, '' or null.
 */
export function peekMyTeam() {
	if (_state.team === null) {
		loadMyTeam()
	}
	return _state.team
}

/**
 * The reader's team by name, for `{myTeam}` in a count line. `name` is `''`
 * for no team (or no source) and `null` while it has not been read.
 *
 * @type {{ name: (string|null) }}
 */
const _nameState = reactive({ name: null })

/** The app's name loader, `() => Promise<string|null>`. */
let _nameSource = null

/** The name read in flight. */
let _namePending = null

/**
 * Name where the reader's team name is read: a function answering the
 * team's display name, or null/'' for a reader in no team.
 *
 * @spec openspec/changes/count-line-my-team-name/specs/index-page/spec.md#requirement-the-count-line-can-name-the-readers-team
 * @param {(() => Promise<string|null>)|null} loader The app's loader, or null to unregister.
 * @return {void}
 */
export function registerMyTeamNameSource(loader) {
	_nameSource = typeof loader === 'function' ? loader : null
	_nameState.name = null
	_namePending = null
}

/**
 * Read the team name, once. Resolves to the name, or `''` without a team,
 * without a source, or when the read fails.
 *
 * @spec openspec/changes/count-line-my-team-name/specs/index-page/spec.md#requirement-the-count-line-can-name-the-readers-team
 * @return {Promise<string>} The name, or ''.
 */
export function loadMyTeamName() {
	if (_nameState.name !== null) {
		return Promise.resolve(_nameState.name)
	}
	if (_namePending) {
		return _namePending
	}
	if (!_nameSource) {
		_nameState.name = ''
		return Promise.resolve('')
	}
	_namePending = Promise.resolve()
		.then(() => _nameSource())
		.then((name) => (typeof name === 'string' ? name.trim() : ''))
		.catch(() => '')
		.then((name) => {
			_nameState.name = name
			_namePending = null
			return name
		})
	return _namePending
}

/**
 * Synchronous, reactive read of the team name: the name, `''` for no team,
 * or `null` while it is read (and starts the read on first use).
 *
 * @spec openspec/changes/count-line-my-team-name/specs/index-page/spec.md#requirement-the-count-line-can-name-the-readers-team
 * @return {string|null} The name, '' or null.
 */
export function peekMyTeamName() {
	if (_nameState.name === null) {
		loadMyTeamName()
	}
	return _nameState.name
}

/**
 * Fill `{myTeam}` in a line with the team name. A part in square brackets
 * that holds `{myTeam}` is left out while there is no name; other brackets
 * are kept as written.
 *
 * @spec openspec/changes/count-line-my-team-name/specs/index-page/spec.md#requirement-the-count-line-can-name-the-readers-team
 * @param {string} text The line.
 * @param {string} name The team name, '' for none.
 * @return {string} The filled line.
 */
export function fillMyTeamToken(text, name) {
	if (typeof text !== 'string' || !text.includes('{myTeam}')) {
		return text
	}
	return text
		.replace(/\[([^\]]*\{myTeam\}[^\]]*)\]/g, (match, part) => (name ? part.replaceAll('{myTeam}', name) : ''))
		.replaceAll('{myTeam}', name)
}
