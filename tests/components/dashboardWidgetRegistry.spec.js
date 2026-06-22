/**
 * Tests for dashboardWidgetRegistry (cn-widget-library, Wave 0).
 *
 * Covers the registry helpers: list/get/default plus register and the
 * last-registration-wins override warning.
 */

const REGISTRY_PATH = '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * Load a fresh copy of the registry module so each test starts with an empty
 * registry (the module ships empty and is mutated by self-registration).
 *
 * @return {object} the freshly-required registry module exports.
 */
function freshRegistry() {
	let mod
	jest.isolateModules(() => {
		mod = require(REGISTRY_PATH)
	})
	return mod
}

const stubEntry = (overrides = {}) => ({
	renderer: { name: 'StubRenderer' },
	form: { name: 'StubForm' },
	defaultContent: { foo: 'bar' },
	displayName: 'Stub',
	icon: 'Star',
	...overrides,
})

describe('dashboardWidgetRegistry', () => {
	it('ships empty (no widgets self-register in Wave 0)', () => {
		const { dashboardWidgetRegistry, listWidgetTypes } = freshRegistry()
		expect(Object.keys(dashboardWidgetRegistry)).toHaveLength(0)
		expect(listWidgetTypes()).toEqual([])
	})

	it('registerDashboardWidget adds a type retrievable by getWidgetTypeEntry', () => {
		const { registerDashboardWidget, getWidgetTypeEntry } = freshRegistry()
		const entry = stubEntry()
		registerDashboardWidget('my-app-chart', entry)
		expect(getWidgetTypeEntry('my-app-chart')).toBe(entry)
	})

	it('listWidgetTypes returns only form-bearing types', () => {
		const { registerDashboardWidget, listWidgetTypes } = freshRegistry()
		registerDashboardWidget('has-form', stubEntry({ form: { name: 'F' } }))
		registerDashboardWidget('null-form', stubEntry({ form: null }))
		registerDashboardWidget('undef-form', stubEntry({ form: undefined }))
		expect(listWidgetTypes()).toEqual(['has-form'])
	})

	it('getWidgetTypeEntry returns null for an unknown type', () => {
		const { getWidgetTypeEntry } = freshRegistry()
		expect(getWidgetTypeEntry('does-not-exist')).toBeNull()
	})

	it('getDefaultContent returns a fresh copy each call', () => {
		const { registerDashboardWidget, getDefaultContent } = freshRegistry()
		registerDashboardWidget('text', stubEntry({ defaultContent: { a: 1 } }))
		const first = getDefaultContent('text')
		const second = getDefaultContent('text')
		expect(first).toEqual({ a: 1 })
		expect(first).not.toBe(second)
		first.a = 999
		expect(getDefaultContent('text')).toEqual({ a: 1 })
	})

	it('getDefaultContent returns {} for an unknown type', () => {
		const { getDefaultContent } = freshRegistry()
		expect(getDefaultContent('nope')).toEqual({})
	})

	it('overriding an existing type warns (last-registration-wins)', () => {
		const { registerDashboardWidget, getWidgetTypeEntry } = freshRegistry()
		const original = stubEntry({ displayName: 'Original' })
		const override = stubEntry({ displayName: 'Override' })
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

		registerDashboardWidget('label', original)
		expect(warnSpy).not.toHaveBeenCalled()

		registerDashboardWidget('label', override)
		expect(getWidgetTypeEntry('label')).toBe(override)
		expect(warnSpy).toHaveBeenCalledTimes(1)
		expect(warnSpy.mock.calls[0][0]).toContain('label')

		warnSpy.mockRestore()
	})

	it('a first-time registration does not warn', () => {
		const { registerDashboardWidget } = freshRegistry()
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		registerDashboardWidget('brand-new', stubEntry())
		expect(warnSpy).not.toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('ignores an empty/non-string type', () => {
		const { registerDashboardWidget, dashboardWidgetRegistry } = freshRegistry()
		registerDashboardWidget('', stubEntry())
		registerDashboardWidget(null, stubEntry())
		expect(Object.keys(dashboardWidgetRegistry)).toHaveLength(0)
	})
})
