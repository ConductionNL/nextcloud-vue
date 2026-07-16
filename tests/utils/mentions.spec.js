/**
 * Tests for src/utils/mentions.js — pure `@mention` token helpers.
 *
 * Covers the full parse/serialize/extract/detect/insert matrix including the
 * edge cases called out in the spec: email-like strings, escaped `@`,
 * adjacent punctuation, quoted ids with spaces, round-trips and caret math.
 */

import {
	parseMentions,
	extractMentionedIds,
	serializeMentionToken,
	detectMentionQuery,
	insertMentionToken,
} from '../../src/utils/mentions.js'

describe('parseMentions', () => {
	it('parses a simple unquoted mention with surrounding text', () => {
		const segments = parseMentions('hi @jan.doe, please review')
		expect(segments).toEqual([
			{ type: 'text', value: 'hi ' },
			{ type: 'mention', id: 'jan.doe', raw: '@jan.doe' },
			{ type: 'text', value: ', please review' },
		])
	})

	it('parses a quoted mention with a space in the id', () => {
		const segments = parseMentions('ping @"jan de vries" today')
		expect(segments).toEqual([
			{ type: 'text', value: 'ping ' },
			{ type: 'mention', id: 'jan de vries', raw: '@"jan de vries"' },
			{ type: 'text', value: ' today' },
		])
	})

	it('parses a mention at the very start of the string', () => {
		const segments = parseMentions('@jan hello')
		expect(segments[0]).toEqual({ type: 'mention', id: 'jan', raw: '@jan' })
	})

	it('parses a mention at the very end of the string', () => {
		const segments = parseMentions('cc @piet')
		expect(segments[segments.length - 1]).toEqual({ type: 'mention', id: 'piet', raw: '@piet' })
	})

	it('does NOT parse an email address as a mention', () => {
		const text = 'contact john@example.com for details'
		expect(parseMentions(text)).toEqual([{ type: 'text', value: text }])
	})

	it('does NOT parse a backslash-escaped @ as a mention', () => {
		const text = 'literal \\@notauser here'
		expect(parseMentions(text)).toEqual([{ type: 'text', value: text }])
	})

	it('terminates an unquoted id at adjacent punctuation', () => {
		const segments = parseMentions('thanks @jan!')
		expect(segments).toEqual([
			{ type: 'text', value: 'thanks ' },
			{ type: 'mention', id: 'jan', raw: '@jan' },
			{ type: 'text', value: '!' },
		])
	})

	it('terminates an unquoted id at a comma', () => {
		const segments = parseMentions('@jan, @piet?')
		expect(segments.filter((s) => s.type === 'mention').map((s) => s.id)).toEqual(['jan', 'piet'])
		expect(segments.map((s) => s.type === 'text' ? s.value : s.raw).join('')).toBe('@jan, @piet?')
	})

	it('handles multiple mentions separated by whitespace', () => {
		const segments = parseMentions('@jan @piet')
		expect(segments.filter((s) => s.type === 'mention')).toHaveLength(2)
	})

	it('keeps ids with underscore, apostrophe and hyphen intact', () => {
		const segments = parseMentions("hey @an-na_o'brien.x done")
		expect(segments[1]).toEqual({ type: 'mention', id: "an-na_o'brien.x", raw: "@an-na_o'brien.x" })
	})

	it('round-trips: concatenating segments reconstructs the input exactly', () => {
		const text = 'a @jan b @"jan de vries" c john@example.com @piet!'
		const rebuilt = parseMentions(text).map((s) => s.type === 'text' ? s.value : s.raw).join('')
		expect(rebuilt).toBe(text)
	})

	it('returns [] for an empty string', () => {
		expect(parseMentions('')).toEqual([])
	})

	it('returns [] for non-string input', () => {
		expect(parseMentions(null)).toEqual([])
		expect(parseMentions(undefined)).toEqual([])
		expect(parseMentions(42)).toEqual([])
	})

	it('does not treat a bare @ followed by whitespace as a mention', () => {
		const text = 'weights are 5 @ 10kg'
		expect(parseMentions(text)).toEqual([{ type: 'text', value: text }])
	})
})

describe('extractMentionedIds', () => {
	it('returns unique ids in first-appearance order', () => {
		expect(extractMentionedIds('@jan @piet @jan again')).toEqual(['jan', 'piet'])
	})

	it('includes quoted ids', () => {
		expect(extractMentionedIds('ping @"jan de vries" and @piet')).toEqual(['jan de vries', 'piet'])
	})

	it('returns [] when there are no mentions', () => {
		expect(extractMentionedIds('plain note, email a@b.com')).toEqual([])
	})

	it('returns [] for empty/non-string input', () => {
		expect(extractMentionedIds('')).toEqual([])
		expect(extractMentionedIds(null)).toEqual([])
	})
})

describe('serializeMentionToken', () => {
	it('serializes a simple id unquoted', () => {
		expect(serializeMentionToken('jan.doe')).toBe('@jan.doe')
	})

	it('serializes an id with a space quoted', () => {
		expect(serializeMentionToken('jan de vries')).toBe('@"jan de vries"')
	})

	it('serializes an id with a slash quoted', () => {
		expect(serializeMentionToken('federated_user/jan')).toBe('@"federated_user/jan"')
	})

	it('round-trips through parseMentions for a simple id', () => {
		const token = serializeMentionToken('jan.doe')
		const segments = parseMentions(`hi ${token} bye`)
		expect(segments[1]).toEqual({ type: 'mention', id: 'jan.doe', raw: token })
	})

	it('round-trips through parseMentions for an id with spaces', () => {
		const token = serializeMentionToken('jan de vries')
		const segments = parseMentions(`hi ${token} bye`)
		expect(segments[1].id).toBe('jan de vries')
	})
})

describe('detectMentionQuery', () => {
	it('detects an in-progress @partial at the caret', () => {
		expect(detectMentionQuery('hi @ja', 6)).toEqual({ query: 'ja', start: 3 })
	})

	it('detects a bare @ (empty query)', () => {
		expect(detectMentionQuery('hi @', 4)).toEqual({ query: '', start: 3 })
	})

	it('returns null when the caret is not inside a mention', () => {
		expect(detectMentionQuery('hi jan', 6)).toBeNull()
	})

	it('returns null for an email-like @ (no boundary before it)', () => {
		expect(detectMentionQuery('mail john@exa', 13)).toBeNull()
	})

	it('returns null when the caret sits after a completed mention plus space', () => {
		expect(detectMentionQuery('hi @jan ', 8)).toBeNull()
	})

	it('returns null for non-string input', () => {
		expect(detectMentionQuery(null, 0)).toBeNull()
	})
})

describe('insertMentionToken', () => {
	it('replaces the in-progress partial mid-sentence and returns the new caret', () => {
		const result = insertMentionToken('hi @ja can you check', 6, 'jan.doe')
		expect(result.text).toBe('hi @jan.doe can you check')
		expect(result.cursor).toBe('hi @jan.doe '.length)
	})

	it('replaces a bare @ at the end of the string', () => {
		const result = insertMentionToken('ping @', 6, 'piet')
		expect(result.text).toBe('ping @piet ')
		expect(result.cursor).toBe('ping @piet '.length)
	})

	it('quotes ids that need quoting', () => {
		const result = insertMentionToken('@ja', 3, 'jan de vries')
		expect(result.text).toBe('@"jan de vries" ')
	})

	it('inserts verbatim at the caret when no partial is in progress', () => {
		const result = insertMentionToken('note text', 4, 'jan')
		expect(result.text).toBe('note@jan text')
		expect(result.cursor).toBe('note@jan '.length)
	})

	it('works at the very start of an empty composer', () => {
		const result = insertMentionToken('@', 1, 'jan')
		expect(result.text).toBe('@jan ')
		expect(result.cursor).toBe(5)
	})
})
