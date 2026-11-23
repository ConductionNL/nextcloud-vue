/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@mention` token parsing / serialization for note-style text fields.
 *
 * Mentions persist inline in plain text using the same convention as
 * Nextcloud Comments/Talk: `@userId` when the id contains only
 * `[A-Za-z0-9_.'-]`, or `@"user id"` (quoted) otherwise. A mention token is
 * only recognized when the `@` is preceded by the start of the string or
 * whitespace — never mid-word — so email-like substrings (`john@example.com`)
 * are never misparsed, and a leading backslash (`\@notauser`) is a natural
 * escape since it breaks that adjacency requirement.
 *
 * A group is mentioned as `@"group/<gid>"`, the format Nextcloud Comments and
 * Talk use. It is always quoted, so a group can never collide with a user whose
 * id is `group`. Expanding a group to its members and notifying them is the job
 * of whoever dispatches mention notifications.
 *
 * All functions here are pure and side-effect-free.
 *
 * @module utils/mentions
 */

// Unquoted id: letters, digits, underscore, period, apostrophe, hyphen.
// Deliberately excludes punctuation like `!`, `,`, `?`, whitespace and `/`
// so trailing punctuation terminates the id instead of being consumed.
const SIMPLE_ID = '[A-Za-z0-9_.\'-]+'
// Quoted id: anything except a double quote, so ids with spaces/slashes work.
const QUOTED_ID = '"([^"]+)"'

// The prefix that marks a quoted mention as a group.
const GROUP_PREFIX = 'group/'

// A mention only starts at the beginning of the string or after whitespace —
// this is what prevents `john@example.com` from matching (the `@` there is
// preceded by `n`, not whitespace) and makes `\@notauser` a working escape
// (the `@` there is preceded by `\`, not whitespace). The lookbehind doesn't
// consume the boundary character, so matches never overlap surrounding text.
const MENTION_REGEX = new RegExp(`(?<=^|\\s)@(?:${QUOTED_ID}|(${SIMPLE_ID}))`, 'g')

/**
 * Split text into ordered text/mention segments. Concatenating every
 * segment's `value`/`raw` reconstructs the original text exactly.
 *
 * @param {string} text The raw note text.
 * @return {Array<{type: 'text', value: string}|{type: 'mention', id: string, raw: string, kind?: 'group', groupId?: string}>} Ordered segments. A group mention has `kind: 'group'` and its `groupId` (its `id` stays the token's own text, `group/<gid>`); a user mention has neither.
 */
export function parseMentions(text) {
	if (typeof text !== 'string' || text === '') {
		return []
	}

	const segments = []
	let lastIndex = 0
	MENTION_REGEX.lastIndex = 0

	let match
	while ((match = MENTION_REGEX.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
		}
		const id = match[1] !== undefined ? match[1] : match[2]
		const isGroup = match[1] !== undefined && id.startsWith(GROUP_PREFIX) && id.length > GROUP_PREFIX.length
		segments.push(isGroup
			? { type: 'mention', id, raw: match[0], kind: 'group', groupId: id.slice(GROUP_PREFIX.length) }
			: { type: 'mention', id, raw: match[0] })
		lastIndex = match.index + match[0].length
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) })
	}

	return segments
}

/**
 * Extract the unique set of mentioned user ids, in first-appearance order.
 * Group mentions are not users; see `extractMentionedGroupIds`.
 *
 * @param {string} text The raw note text.
 * @return {string[]} Unique mentioned user ids.
 */
export function extractMentionedIds(text) {
	const ids = []
	for (const segment of parseMentions(text)) {
		if (segment.type === 'mention' && segment.kind !== 'group' && !ids.includes(segment.id)) {
			ids.push(segment.id)
		}
	}
	return ids
}

/**
 * Extract the unique set of mentioned group ids (`@"group/<gid>"`), in
 * first-appearance order.
 *
 * @param {string} text The raw note text.
 * @return {string[]} Unique mentioned group ids, without the `group/` prefix.
 */
export function extractMentionedGroupIds(text) {
	const ids = []
	for (const segment of parseMentions(text)) {
		if (segment.type === 'mention' && segment.kind === 'group' && !ids.includes(segment.groupId)) {
			ids.push(segment.groupId)
		}
	}
	return ids
}

/**
 * Serialize a user or group id into its canonical mention token.
 *
 * @param {string} id The user id (or group id) to encode.
 * @param {'user'|'group'} [kind] `group` gives `@"group/<id>"`.
 * @return {string} `@id` when unambiguous, `@"id"` otherwise; a group is always `@"group/<id>"`.
 */
export function serializeMentionToken(id, kind = 'user') {
	const value = String(id)
	if (kind === 'group') {
		return `@"${GROUP_PREFIX}${value}"`
	}
	return new RegExp(`^${SIMPLE_ID}$`).test(value) ? `@${value}` : `@"${value}"`
}

// Matches an in-progress, unterminated `@partial` ending exactly at the
// caret — i.e. no closing quote, no trailing whitespace consumed yet.
const IN_PROGRESS_MENTION = /(?:^|\s)@([A-Za-z0-9_.'-]*)$/

/**
 * Determine whether the caret sits inside an in-progress `@partial` mention
 * that hasn't been completed yet (used to gate a live autocomplete lookup).
 *
 * @param {string} text The full composer text.
 * @param {number} cursorPosition The caret offset within `text`.
 * @return {{query: string, start: number}|null} The in-progress query and where it starts, or `null`.
 */
export function detectMentionQuery(text, cursorPosition) {
	if (typeof text !== 'string') {
		return null
	}
	const upToCursor = text.slice(0, cursorPosition)
	const match = upToCursor.match(IN_PROGRESS_MENTION)
	if (!match) {
		return null
	}
	const atIndex = upToCursor.lastIndexOf('@')
	return { query: match[1], start: atIndex }
}

/**
 * Replace the in-progress `@partial` ending at `cursorPosition` with the
 * serialized mention token for `id`, followed by a single trailing space.
 *
 * @param {string} text The full composer text.
 * @param {number} cursorPosition The caret offset within `text`.
 * @param {string} id The selected suggestion's id.
 * @param {'user'|'group'} [kind] The suggestion's kind.
 * @return {{text: string, cursor: number}} The updated text and new caret position.
 */
export function insertMentionToken(text, cursorPosition, id, kind = 'user') {
	const detected = detectMentionQuery(text, cursorPosition)
	const token = serializeMentionToken(id, kind)
	// When no in-progress query is found, insert at the caret verbatim.
	const before = text.slice(0, detected ? detected.start : cursorPosition)
	const after = text.slice(cursorPosition)
	// Ensure exactly one space after the token: reuse a pre-existing one
	// instead of doubling up when the caret already sat before whitespace.
	const insertedSpace = after.startsWith(' ') ? '' : ' '
	return {
		text: before + token + insertedSpace + after,
		cursor: before.length + token.length + 1,
	}
}
