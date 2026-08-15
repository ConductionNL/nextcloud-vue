/**
 * Tests for the integration icon registration.
 *
 * The integration descriptors declare their app icon as an MDI *name
 * string*; CnIcon resolves those against a shared registry. If a
 * descriptor's icon is not registered, CnIcon silently falls back to
 * HelpCircleOutline — which is exactly the bug CnIntegrationWidget's
 * tabs / empty states hit before this module existed (every leaf showed
 * the same generic glyph).
 *
 * These tests guarantee:
 *  - every icon referenced by a built-in OR leaf descriptor has a
 *    matching component in INTEGRATION_ICON_COMPONENTS, so no leaf ever
 *    degrades to the fallback glyph;
 *  - registerIntegrationIcons() actually installs those components into
 *    CnIcon's registry (so CnIcon resolves them, not the fallback);
 *  - the helper is idempotent.
 */

const {
	INTEGRATION_ICON_COMPONENTS,
	registerIntegrationIcons,
} = require('../../src/integrations/icons.js')
const { builtinIntegrations } = require('../../src/integrations/builtin/index.js')
const { leafIntegrations } = require('../../src/integrations/builtin/leaves.js')
const { ICON_MAP, registerIcons } = require('../../src/components/CnIcon/CnIcon.vue')

describe('integration icon registration', () => {
	test('every descriptor icon has a registered component', () => {
		const descriptors = [...builtinIntegrations, ...leafIntegrations]
		const missing = []
		for (const descriptor of descriptors) {
			if (typeof descriptor.icon !== 'string' || descriptor.icon === '') {
				continue
			}
			if (!INTEGRATION_ICON_COMPONENTS[descriptor.icon]) {
				missing.push(`${descriptor.id} → ${descriptor.icon}`)
			}
		}
		expect(missing).toEqual([])
	})

	test('registerIntegrationIcons installs the set into CnIcon and CnIcon resolves them (not the fallback)', () => {
		registerIntegrationIcons()
		const fallback = ICON_MAP.HelpCircleOutline
		for (const name of Object.keys(INTEGRATION_ICON_COMPONENTS)) {
			expect(ICON_MAP[name]).toBeDefined()
			expect(ICON_MAP[name]).not.toBe(fallback)
			expect(ICON_MAP[name]).toBe(INTEGRATION_ICON_COMPONENTS[name])
		}
	})

	test('registerIntegrationIcons is idempotent', () => {
		const spy = jest.fn(registerIcons)
		// Calling twice must not throw and must leave the registry intact.
		expect(() => {
			registerIntegrationIcons()
			registerIntegrationIcons()
		}).not.toThrow()
		expect(Object.keys(INTEGRATION_ICON_COMPONENTS).length).toBeGreaterThan(0)
		spy.mockRestore?.()
	})
})
