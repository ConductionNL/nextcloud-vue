/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-2
 */
import { quoteFor, supportsReplies, threadNotes, threadRootId } from '../../src/utils/noteThreads.js'

const note = (id, parentId, created, message = `note ${id}`) => ({ id, parentId, created, message })

describe('supportsReplies', () => {
	it('true only when notes carry a parentId key, null or not', () => {
		expect(supportsReplies([note(1, null, '2026-01-01')])).toBe(true)
		expect(supportsReplies([{ id: 1, message: 'x' }])).toBe(false)
		expect(supportsReplies([])).toBe(false)
		expect(supportsReplies(undefined)).toBe(false)
	})
})

describe('threadNotes', () => {
	const notes = [
		note(1, null, '2026-01-01T10:00'),
		note(2, null, '2026-01-01T11:00'),
		note(4, 1, '2026-01-01T13:00'),
		note(3, 1, '2026-01-01T12:00'),
		note(5, 3, '2026-01-01T14:00'),
	]

	it('replies sit under their top-level note, oldest first', () => {
		const threads = threadNotes(notes)
		expect(threads.map((t) => t.note.id)).toEqual([1, 2])
		expect(threads[0].replies.map((r) => r.id)).toEqual([3, 4, 5])
		expect(threads[1].replies).toEqual([])
	})

	it('a reply to a reply attaches to the same top-level note', () => {
		expect(threadRootId(notes[4], notes)).toBe(1)
		expect(threadRootId(notes[0], notes)).toBe(1)
	})

	it('keeps the order the top-level notes came in', () => {
		expect(threadNotes([notes[1], notes[0]]).map((t) => t.note.id)).toEqual([2, 1])
	})

	it('a reply whose parent is not in the list stands alone', () => {
		const threads = threadNotes([note(9, 99, '2026-01-01')])
		expect(threads).toHaveLength(1)
		expect(threads[0].note.id).toBe(9)
	})

	it('survives a parent cycle', () => {
		expect(() => threadNotes([note(1, 2, '2026-01-01'), note(2, 1, '2026-01-02')])).not.toThrow()
	})
})

describe('quoteFor', () => {
	it('quotes the parent only when it is more than five notes up', () => {
		const flat = [note(1, null, 'a', 'The original question about the permit'), ...[2, 3, 4, 5, 6, 7].map((i) => note(i, null, 'b')), note(8, 1, 'c')]
		expect(quoteFor(flat[7], flat)).toBe('The original question about the permit')
		expect(quoteFor(flat[7], flat.slice(3))).toBe('')
		expect(quoteFor({ id: 2, parentId: 1 }, [note(1, null, 'a'), note(2, 1, 'b')])).toBe('')
	})

	it('shortens a long parent to one line', () => {
		const flat = [note(1, null, 'a', `${'word '.repeat(40)}\nnext line`), ...[2, 3, 4, 5, 6, 7].map((i) => note(i, null, 'b')), note(8, 1, 'c')]
		const quote = quoteFor(flat[7], flat)
		expect(quote.length).toBeLessThanOrEqual(80)
		expect(quote).not.toContain('\n')
		expect(quote.endsWith('…')).toBe(true)
	})
})
