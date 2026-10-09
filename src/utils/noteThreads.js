/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Threads for a record's notes: one level deep, replies under their top-level
 * note, oldest first. A reply to a reply attaches to the same top-level note.
 *
 * @module utils/noteThreads
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-2
 */

/** A reply this many notes (or more) below its parent shows a one-line quote of it. */
export const QUOTE_DISTANCE = 5

const created = (note) => new Date(note.creationDateTime || note.created || 0).getTime()

/**
 * Whether the notes response says the backend supports replies: its notes carry
 * a `parentId` key (null or not). An OpenRegister that ignores the parent would
 * save a reply as a loose note and the reader would never know, so without the
 * key Reply is not offered.
 *
 * @param {Array<object>} notes The notes as the backend returned them.
 * @return {boolean} True when replies are supported.
 */
export function supportsReplies(notes) {
	return Array.isArray(notes) && notes.some((note) => note && Object.hasOwn(note, 'parentId'))
}

/**
 * The id of the top-level note of the thread a note belongs to.
 *
 * @param {object} note A note (top-level or a reply).
 * @param {Array<object>} notes All notes.
 * @return {string|number} The top-level note's id.
 */
export function threadRootId(note, notes) {
	const byId = new Map(notes.map((n) => [String(n.id), n]))
	let current = note
	const seen = new Set()
	while (current && current.parentId !== null && current.parentId !== undefined && current.parentId !== '' && byId.has(String(current.parentId)) && !seen.has(String(current.id))) {
		seen.add(String(current.id))
		current = byId.get(String(current.parentId))
	}
	return current ? current.id : note.id
}

/**
 * Group notes into threads. The top-level notes keep the order they came in
 * (the caller sorts); each note's replies follow it, oldest first. A reply
 * whose parent is not in the list (deleted, or beyond the page) stands alone.
 *
 * @param {Array<object>} notes The notes.
 * @return {Array<{note: object, replies: object[]}>} The threads.
 */
export function threadNotes(notes) {
	const list = Array.isArray(notes) ? notes : []
	const ids = new Set(list.map((n) => String(n.id)))
	const isReply = (n) => n.parentId !== null && n.parentId !== undefined && n.parentId !== '' && ids.has(String(n.parentId))
	const threads = list.filter((n) => !isReply(n)).map((note) => ({ note, replies: [] }))
	const byRoot = new Map(threads.map((t) => [String(t.note.id), t]))
	for (const reply of list.filter(isReply)) {
		const thread = byRoot.get(String(threadRootId(reply, list)))
		if (thread) {
			thread.replies.push(reply)
		}
	}
	for (const thread of threads) {
		thread.replies.sort((a, b) => created(a) - created(b))
	}
	return threads
}

/**
 * A one-line quote of the note a reply answers, when that note is far up the
 * list; an empty string when the parent is close enough to see.
 *
 * @param {object} reply The reply.
 * @param {Array<object>} orderedNotes The notes in the order they are listed (top-level and replies, flattened).
 * @return {string} The quote (first 80 characters), or ''.
 */
export function quoteFor(reply, orderedNotes) {
	const parentIndex = orderedNotes.findIndex((n) => String(n.id) === String(reply.parentId))
	const replyIndex = orderedNotes.findIndex((n) => n.id === reply.id)
	if (parentIndex < 0 || replyIndex < 0 || Math.abs(replyIndex - parentIndex) <= QUOTE_DISTANCE) {
		return ''
	}
	const text = String(orderedNotes[parentIndex].message || orderedNotes[parentIndex].content || '').replace(/\s+/g, ' ').trim()
	return text.length > 80 ? `${text.slice(0, 79)}…` : text
}
