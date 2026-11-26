/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The scope a companion turn carries, and how an answer's sources are listed.
 */
import { sourceFileId, sourceName, sourcePage, turnScopeOf } from '../../src/utils/aiChatScope.js'

describe('turnScopeOf', () => {
	it('scopes a document page to its file', () => {
		expect(turnScopeOf({ pageKind: 'document', fileId: '24753' })).toEqual({ type: 'file', fileId: 24753 })
		expect(turnScopeOf({ pageKind: 'file', fileId: 9 })).toEqual({ type: 'file', fileId: 9 })
	})

	it('scopes a folder page to its folder', () => {
		expect(turnScopeOf({ pageKind: 'folder', fileId: 12 })).toEqual({ type: 'folder', fileId: 12 })
	})

	it('sends no scope elsewhere', () => {
		expect(turnScopeOf(null)).toBeNull()
		expect(turnScopeOf({})).toBeNull()
		expect(turnScopeOf({ pageKind: 'index', fileId: 5 })).toBeNull()
		expect(turnScopeOf({ pageKind: 'document' })).toBeNull()
		expect(turnScopeOf({ pageKind: 'document', fileId: 'abc' })).toBeNull()
		expect(turnScopeOf({ pageKind: 'document', fileId: 0 })).toBeNull()
	})
})

describe('answer sources', () => {
	it('opens a file source by file_id, fileId or id', () => {
		expect(sourceFileId({ type: 'file', file_id: 7 })).toBe(7)
		expect(sourceFileId({ type: 'file', fileId: '8' })).toBe(8)
		expect(sourceFileId({ type: 'file', id: 9 })).toBe(9)
	})

	it('opens no other source, and no file the person lost', () => {
		expect(sourceFileId({ type: 'object', id: 3 })).toBeNull()
		expect(sourceFileId({ type: 'file', file_id: 7, available: false })).toBeNull()
		expect(sourceFileId(null)).toBeNull()
	})

	it('reads the page and the name', () => {
		expect(sourcePage({ page: 3 })).toBe(3)
		expect(sourcePage({})).toBeNull()
		expect(sourceName({ name: 'offerte.pdf', id: 7 })).toBe('offerte.pdf')
		expect(sourceName({ id: 7 })).toBe('7')
		expect(sourceName(undefined)).toBe('')
	})
})
