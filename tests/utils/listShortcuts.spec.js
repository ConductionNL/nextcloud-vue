/**
 * Tests for the list's keyboard shortcuts (working-list-row-actions, task 7).
 *
 * One catalogue serves the key handler, the command palette and the help
 * sheet. A shortcut only one of them knows about is not a shortcut.
 */

import {
	chordOf,
	isTypingTarget,
	LIST_SHORTCUTS,
	listPaletteCommands,
	shortcutFor,
} from '../../src/utils/listShortcuts.js'

function keyEvent(key, extra = {}) {
	return { key, target: { tagName: 'DIV' }, ...extra }
}

describe('LIST_SHORTCUTS', () => {
	it('covers every repeated action the spec names', () => {
		const ids = LIST_SHORTCUTS.map((s) => s.id)
		expect(ids).toEqual(expect.arrayContaining([
			'row-next',
			'row-previous',
			'row-open',
			'row-primary',
			'row-quick-edit',
			'row-select',
			'bulk-action',
			'list-help',
		]))
	})

	it('binds each chord once', () => {
		const keys = LIST_SHORTCUTS.map((s) => s.keys)
		expect(new Set(keys).size).toBe(keys.length)
	})

	it('gives every shortcut a description, so the help sheet has something to say', () => {
		expect(LIST_SHORTCUTS.every((s) => typeof s.description === 'string' && s.description !== '')).toBe(true)
	})
})

describe('isTypingTarget', () => {
	it('knows the places the list must keep its hands off', () => {
		expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true)
		expect(isTypingTarget({ tagName: 'textarea' })).toBe(true)
		expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true)
		expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
		expect(isTypingTarget({ tagName: 'DIV' })).toBe(false)
	})
})

describe('chordOf', () => {
	it('ignores a chord carrying a modifier, which belongs to the browser', () => {
		expect(chordOf(keyEvent('j'))).toBe('j')
		expect(chordOf(keyEvent('j', { ctrlKey: true }))).toBe('')
		expect(chordOf(keyEvent('j', { metaKey: true }))).toBe('')
	})
})

describe('shortcutFor', () => {
	it('matches a plain key to its shortcut', () => {
		expect(shortcutFor(keyEvent('j')).id).toBe('row-next')
		expect(shortcutFor(keyEvent('Enter')).id).toBe('row-open')
	})

	it('does not fire while somebody is typing', () => {
		// A single-letter shortcut that eats a case number out of the search
		// box is not a shortcut.
		expect(shortcutFor({ key: 'e', target: { tagName: 'INPUT' } })).toBeNull()
	})

	it('answers nothing for a key it does not bind', () => {
		expect(shortcutFor(keyEvent('q'))).toBeNull()
	})
})

describe('listPaletteCommands', () => {
	it('lists every shortcut the page can actually run', () => {
		const entries = listPaletteCommands({ 'row-next': () => {}, 'list-help': () => {} })
		expect(entries.map((e) => e.id)).toEqual(['list.row-next', 'list.list-help'])
		expect(entries[0].shortcut).toBe('j')
		expect(entries[0].title).toBe('Move to the next row')
	})

	it('leaves out a shortcut the page has nothing behind', () => {
		// Listing it would put a line in the palette that does nothing when
		// clicked, which is worse than not offering it.
		expect(listPaletteCommands({})).toEqual([])
	})

	it('carries the handler through as the command', () => {
		const ran = []
		const [entry] = listPaletteCommands({ 'row-open': () => ran.push('open') })
		entry.run()
		expect(ran).toEqual(['open'])
	})
})
