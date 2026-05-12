/**
 * Tests for the built-in integration registrations.
 *
 * Covers:
 *  - `builtinIntegrations` shape: the five ids, ordering, group, and
 *    that each descriptor is a valid `register()` payload (has
 *    `tab` + `widget`)
 *  - `registerBuiltinIntegrations()` registers all five onto a fresh
 *    registry, returns the new ids, and skips ids already present
 *    (collision policy: first wins) without throwing
 *  - id/order/icon/group match the PHP-side built-in providers
 */

const { createIntegrationRegistry } = require('../../src/integrations/registry.js')
const { builtinIntegrations, registerBuiltinIntegrations } = require('../../src/integrations/builtin/index.js')

describe('builtinIntegrations', () => {
	it('exposes exactly the five built-in ids in the documented order', () => {
		expect(builtinIntegrations.map((d) => d.id)).toEqual([
			'files', 'notes', 'tags', 'tasks', 'audit-trail',
		])
	})

	it('each descriptor carries the required tab + widget components', () => {
		for (const d of builtinIntegrations) {
			expect(d.tab).toBeTruthy()
			expect(d.widget).toBeTruthy()
		}
	})

	it('matches the PHP built-in providers on id / order / icon / group', () => {
		const byId = Object.fromEntries(builtinIntegrations.map((d) => [d.id, d]))
		expect(byId.files.order).toBe(1)
		expect(byId.files.icon).toBe('Paperclip')
		expect(byId.notes.order).toBe(2)
		expect(byId.notes.icon).toBe('CommentTextOutline')
		expect(byId.tags.order).toBe(3)
		expect(byId.tags.icon).toBe('TagOutline')
		expect(byId.tasks.order).toBe(4)
		expect(byId.tasks.icon).toBe('CheckboxMarkedOutline')
		expect(byId['audit-trail'].order).toBe(5)
		expect(byId['audit-trail'].icon).toBe('History')
		for (const d of builtinIntegrations) {
			expect(d.group).toBe('core')
			expect(d.requiredApp).toBe(null)
		}
	})

	it('declares referenceType === id for each built-in (AD-18 crossover)', () => {
		for (const d of builtinIntegrations) {
			expect(d.referenceType).toBe(d.id)
		}
	})
})

describe('registerBuiltinIntegrations', () => {
	it('registers all five onto a fresh registry and returns their ids', () => {
		const reg = createIntegrationRegistry()
		const ids = registerBuiltinIntegrations(reg)
		expect(ids).toEqual(['files', 'notes', 'tags', 'tasks', 'audit-trail'])
		expect(reg.list().map((p) => p.id)).toEqual(['files', 'notes', 'tags', 'tasks', 'audit-trail'])
	})

	it('skips ids already registered without throwing (collision: first wins)', () => {
		const reg = createIntegrationRegistry()
		const customNotes = { name: 'CustomNotesTab', render() {} }
		const customWidget = { name: 'CustomNotesWidget', render() {} }
		reg.register({ id: 'notes', label: 'My Notes', tab: customNotes, widget: customWidget })
		const ids = registerBuiltinIntegrations(reg)
		// notes was skipped
		expect(ids).toEqual(['files', 'tags', 'tasks', 'audit-trail'])
		// and the pre-registered one survived
		expect(reg.get('notes').label).toBe('My Notes')
		expect(reg.get('notes').tab).toBe(customNotes)
	})

	it('is idempotent — calling it twice does not throw and does not duplicate', () => {
		const reg = createIntegrationRegistry()
		registerBuiltinIntegrations(reg)
		const second = registerBuiltinIntegrations(reg)
		expect(second).toEqual([])
		expect(reg.list()).toHaveLength(5)
	})

	it('defaults to the singleton registry when no argument is passed', () => {
		const { integrations } = require('../../src/integrations/registry.js')
		integrations.__resetForTests()
		const ids = registerBuiltinIntegrations()
		expect(ids).toContain('files')
		expect(integrations.has('audit-trail')).toBe(true)
		integrations.__resetForTests()
	})
})
