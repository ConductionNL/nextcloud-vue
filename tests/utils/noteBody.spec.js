/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-4
 */
import { imageMarkdown, isRecordFileUrl, parseNoteBody } from '../../src/utils/noteBody.js'

const record = { apiBase: '/apps/openregister/api', register: 'tasks', schema: 'task', objectId: 'T1' }
const own = '/index.php/apps/openregister/api/objects/tasks/task/T1/files/42/download'

describe('isRecordFileUrl', () => {
	it('accepts a file of this record, with or without index.php', () => {
		expect(isRecordFileUrl(own, record)).toBe(true)
		expect(isRecordFileUrl('/apps/openregister/api/objects/tasks/task/T1/files/42/download', record)).toBe(true)
	})

	it('refuses another record, another site, a protocol-relative URL and a traversal', () => {
		expect(isRecordFileUrl('/apps/openregister/api/objects/tasks/task/T2/files/1/download', record)).toBe(false)
		expect(isRecordFileUrl('https://evil.example/apps/openregister/api/objects/tasks/task/T1/files/1', record)).toBe(false)
		expect(isRecordFileUrl('//evil.example/apps/openregister/api/objects/tasks/task/T1/files/1', record)).toBe(false)
		expect(isRecordFileUrl('/apps/openregister/api/objects/tasks/task/T1/files/../../T2/files/1', record)).toBe(false)
		expect(isRecordFileUrl(own, null)).toBe(false)
	})
})

describe('parseNoteBody', () => {
	it('shows a same-record image as an image, between text and mentions', () => {
		const pieces = parseNoteBody(`look @jan ![error](${own}) thanks`, record)
		expect(pieces.map((p) => p.type)).toEqual(['text', 'mention', 'text', 'image', 'text'])
		expect(pieces[3]).toEqual({ type: 'image', alt: 'error', src: own })
	})

	it('a foreign image is a link, never an image', () => {
		const pieces = parseNoteBody('![x](https://evil.example/pixel.png)', record)
		expect(pieces).toEqual([{ type: 'link', text: 'x', href: 'https://evil.example/pixel.png' }])
	})

	it('an unsafe URL stays text', () => {
		const pieces = parseNoteBody('![x](javascript:alert(1))', record)
		expect(pieces.every((p) => p.type === 'text')).toBe(true)
	})

	it('without a record every image is a link', () => {
		expect(parseNoteBody(`![a](${own})`, null)[0].type).toBe('link')
	})

	it('nothing else becomes markup', () => {
		const pieces = parseNoteBody('# heading <b>bold</b> **x**', record)
		expect(pieces).toEqual([{ type: 'text', value: '# heading <b>bold</b> **x**' }])
	})

	it('a group mention comes through', () => {
		expect(parseNoteBody('hi @"group/planning"', record)[1]).toMatchObject({ type: 'mention', kind: 'group', groupId: 'planning' })
	})
})

describe('imageMarkdown', () => {
	it('writes ![name](url) and keeps brackets out of the name', () => {
		expect(imageMarkdown('shot [1].png', own)).toBe(`![shot  1 .png](${own})`)
	})
})
