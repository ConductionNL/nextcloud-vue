/**
 * Tests for the 18 leaf integration registrations.
 *
 * Covers:
 *  - `leafIntegrations` shape: the 18 ids, group/order clustering,
 *    and that each descriptor is a valid `register()` payload
 *    (carries `tab` + `widget`).
 *  - `registerLeafIntegrations()` registers all 18 onto a fresh
 *    registry, returns the new ids, and skips ids already present
 *    (collision policy: first wins, AD-13) without throwing.
 *  - Metadata matches the PHP-side IntegrationProviders in
 *    `openregister/lib/Service/Integration/Providers/` (id, group,
 *    requiredApp).
 *
 * Each entry shares the generic CnIntegrationTab + CnIntegrationCard
 * — bespoke per-leaf components supersede them later by repointing
 * the descriptor's `tab` / `widget`.
 */

const { createIntegrationRegistry } = require('../../src/integrations/registry.js')
const { leafIntegrations, registerLeafIntegrations } = require('../../src/integrations/builtin/leaves.js')

/**
 * The expected per-leaf metadata, sourced from
 * `openregister/lib/Service/Integration/Providers/*.php`. Keep this
 * table in sync with the PHP side — drift here is the early-warning
 * signal that the JS registration has diverged.
 *
 * @type {Array<{id: string, group: string, requiredApp: string|null}>}
 */
const EXPECTED = [
	{ id: 'calendar', group: 'comms', requiredApp: 'calendar' },
	{ id: 'contacts', group: 'comms', requiredApp: 'contacts' },
	{ id: 'email', group: 'comms', requiredApp: 'mail' },
	{ id: 'talk', group: 'comms', requiredApp: 'spreed' },
	{ id: 'bookmarks', group: 'docs', requiredApp: 'bookmarks' },
	{ id: 'collectives', group: 'docs', requiredApp: 'collectives' },
	{ id: 'maps', group: 'docs', requiredApp: 'maps' },
	{ id: 'photos', group: 'docs', requiredApp: 'photos' },
	{ id: 'activity', group: 'workflow', requiredApp: 'activity' },
	{ id: 'analytics', group: 'workflow', requiredApp: 'analytics' },
	{ id: 'cospend', group: 'workflow', requiredApp: 'cospend' },
	{ id: 'deck', group: 'workflow', requiredApp: 'deck' },
	{ id: 'flow', group: 'workflow', requiredApp: 'workflowengine' },
	{ id: 'forms', group: 'workflow', requiredApp: 'forms' },
	{ id: 'polls', group: 'workflow', requiredApp: 'polls' },
	{ id: 'time-tracker', group: 'workflow', requiredApp: 'timemanager' },
	{ id: 'shares', group: 'core', requiredApp: null },
	{ id: 'openproject', group: 'external', requiredApp: 'openconnector' },
]

describe('leafIntegrations', () => {
	it('exposes exactly 18 leaf descriptors', () => {
		expect(leafIntegrations).toHaveLength(EXPECTED.length)
	})

	it('exposes every expected leaf id', () => {
		const ids = new Set(leafIntegrations.map((d) => d.id))
		for (const e of EXPECTED) {
			expect(ids.has(e.id)).toBe(true)
		}
	})

	it('each descriptor carries the required tab + widget components (parity gate)', () => {
		for (const d of leafIntegrations) {
			expect(d.tab).toBeTruthy()
			expect(d.widget).toBeTruthy()
		}
	})

	it.each(EXPECTED)('matches the PHP IntegrationProvider for %s', (expected) => {
		const found = leafIntegrations.find((d) => d.id === expected.id)
		expect(found).toBeTruthy()
		expect(found.group).toBe(expected.group)
		expect(found.requiredApp).toBe(expected.requiredApp)
	})

	it('declares referenceType === id for each leaf (AD-18 crossover)', () => {
		for (const d of leafIntegrations) {
			expect(d.referenceType).toBe(d.id)
		}
	})

	it('declares a defaultSize for grid layout fallback', () => {
		for (const d of leafIntegrations) {
			expect(d.defaultSize).toEqual({ w: expect.any(Number), h: expect.any(Number) })
		}
	})

	it('clusters order numbers by group (comms 20-29 / external 30-39 / docs 40-49 / workflow 60-69 / core 10-19)', () => {
		const byId = Object.fromEntries(leafIntegrations.map((d) => [d.id, d]))
		// Comms: 20-29
		for (const id of ['calendar', 'contacts', 'email', 'talk']) {
			expect(byId[id].order).toBeGreaterThanOrEqual(20)
			expect(byId[id].order).toBeLessThan(30)
		}
		// External: 30-39
		expect(byId.openproject.order).toBeGreaterThanOrEqual(30)
		expect(byId.openproject.order).toBeLessThan(40)
		// Docs: 40-49
		for (const id of ['bookmarks', 'collectives', 'maps', 'photos']) {
			expect(byId[id].order).toBeGreaterThanOrEqual(40)
			expect(byId[id].order).toBeLessThan(50)
		}
		// Workflow: 60-69
		for (const id of ['activity', 'analytics', 'cospend', 'deck', 'flow', 'forms', 'polls', 'time-tracker']) {
			expect(byId[id].order).toBeGreaterThanOrEqual(60)
			expect(byId[id].order).toBeLessThan(70)
		}
		// Core: 10-19
		expect(byId.shares.order).toBeGreaterThanOrEqual(10)
		expect(byId.shares.order).toBeLessThan(20)
	})

	it('every leaf uses the same generic Tab + Card components', () => {
		// The leaves.js implementation wires all 18 through CnIntegrationTab + CnIntegrationCard.
		// Bespoke per-leaf overrides land in follow-ups; until then they must point at the same pair.
		const tabs = new Set(leafIntegrations.map((d) => d.tab))
		const widgets = new Set(leafIntegrations.map((d) => d.widget))
		expect(tabs.size).toBe(1)
		expect(widgets.size).toBe(1)
	})
})

describe('registerLeafIntegrations', () => {
	it('registers all 18 leaves onto a fresh registry and returns the new ids', () => {
		const reg = createIntegrationRegistry()
		const registered = registerLeafIntegrations(reg)
		expect(registered).toHaveLength(18)
		expect(reg.list()).toHaveLength(18)
	})

	it('skips ids already present without throwing (collision policy: first wins)', () => {
		const reg = createIntegrationRegistry()
		// Pre-register a stub with id 'calendar' — our leaf should NOT clobber it.
		const stubTab = { name: 'AppCalendarTab' }
		const stubWidget = { name: 'AppCalendarCard' }
		reg.register({ id: 'calendar', label: 'App-supplied calendar', tab: stubTab, widget: stubWidget })

		const registered = registerLeafIntegrations(reg)
		expect(registered).not.toContain('calendar')
		expect(reg.list()).toHaveLength(18) // 1 pre-existing + 17 newly registered
		expect(reg.get('calendar').label).toBe('App-supplied calendar')
		expect(reg.get('calendar').tab).toBe(stubTab)
	})

	it('is idempotent on repeated calls', () => {
		const reg = createIntegrationRegistry()
		const first = registerLeafIntegrations(reg)
		const second = registerLeafIntegrations(reg)
		expect(first).toHaveLength(18)
		expect(second).toHaveLength(0) // all already present
		expect(reg.list()).toHaveLength(18)
	})

	it('uses the default singleton when no registry argument is given', () => {
		// The default singleton's prior state isn't isolated across tests,
		// but registerLeafIntegrations() must not throw and must return
		// either the new ids (first run) or an empty array (subsequent).
		const result = registerLeafIntegrations()
		expect(Array.isArray(result)).toBe(true)
	})
})
