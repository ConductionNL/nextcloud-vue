/**
 * Tests for the XWiki leaf registration.
 *
 * Covers: the `xwikiIntegration` descriptor shape (id / group /
 * storage hints / referenceType / tab + widget present), that
 * `registerXwikiIntegration()` registers it onto a fresh registry and
 * is skip-on-collision (first wins), and that it is NOT part of the
 * built-in set (`registerBuiltinIntegrations()` doesn't pull it in).
 */

const { createIntegrationRegistry } = require('../../src/integrations/registry.js')
const { xwikiIntegration, registerXwikiIntegration } = require('../../src/integrations/builtin/xwiki.js')
const { builtinIntegrations, registerBuiltinIntegrations } = require('../../src/integrations/builtin/index.js')

describe('xwikiIntegration descriptor', () => {
	it('mirrors the PHP XwikiProvider metadata', () => {
		expect(xwikiIntegration.id).toBe('xwiki')
		expect(xwikiIntegration.label).toBe('Articles')
		expect(xwikiIntegration.icon).toBe('FileDocumentMultiple')
		expect(xwikiIntegration.group).toBe('external')
		expect(xwikiIntegration.requiredApp).toBe('openconnector')
		expect(xwikiIntegration.referenceType).toBe('xwiki')
	})

	it('carries the required tab + widget components', () => {
		expect(xwikiIntegration.tab).toBeTruthy()
		expect(xwikiIntegration.widget).toBeTruthy()
	})

	it('is NOT one of the always-available built-ins', () => {
		expect(builtinIntegrations.map((d) => d.id)).not.toContain('xwiki')
	})
})

describe('registerXwikiIntegration', () => {
	it('registers the xwiki integration onto a fresh registry', () => {
		const reg = createIntegrationRegistry()
		expect(registerXwikiIntegration(reg)).toBe(true)
		expect(reg.has('xwiki')).toBe(true)
		expect(reg.get('xwiki').label).toBe('Articles')
	})

	it('is skip-on-collision (first wins, no throw)', () => {
		const reg = createIntegrationRegistry()
		const customTab = { name: 'CustomXwikiTab', render() {} }
		const customWidget = { name: 'CustomXwikiWidget', render() {} }
		reg.register({ id: 'xwiki', label: 'My XWiki', tab: customTab, widget: customWidget })
		expect(registerXwikiIntegration(reg)).toBe(false)
		expect(reg.get('xwiki').label).toBe('My XWiki')
		expect(reg.get('xwiki').tab).toBe(customTab)
	})

	it('is not registered by registerBuiltinIntegrations()', () => {
		const reg = createIntegrationRegistry()
		registerBuiltinIntegrations(reg)
		expect(reg.has('xwiki')).toBe(false)
		// ...but can be added afterwards
		registerXwikiIntegration(reg)
		expect(reg.has('xwiki')).toBe(true)
		// sorted by `order`: files(1) notes(2) tags(3) tasks(4) audit-trail(5) xwiki(30)
		expect(reg.list().map((p) => p.id)).toEqual(['files', 'notes', 'tags', 'tasks', 'audit-trail', 'xwiki'])
	})

	it('defaults to the singleton registry when no argument is passed', () => {
		const { integrations } = require('../../src/integrations/registry.js')
		integrations.__resetForTests()
		expect(registerXwikiIntegration()).toBe(true)
		expect(integrations.has('xwiki')).toBe(true)
		integrations.__resetForTests()
	})
})
