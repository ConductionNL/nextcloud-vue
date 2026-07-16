/**
 * Tests for the built-in integration registrations.
 *
 * Covers:
 *  - `builtinIntegrations` shape: the five canonical PHP-backed built-ins
 *    (`files`, `notes`, `tags`, `tasks`, `audit-trail`) PLUS the bespoke
 *    leaf overrides bundled with the built-ins; ordering, group, and
 *    that each descriptor is a valid `register()` payload (has `tab` +
 *    `widget`).
 *  - `registerBuiltinIntegrations()` registers all entries onto a fresh
 *    registry, returns the new ids, and skips ids already present
 *    (collision policy: first wins) without throwing.
 *  - id/order/icon/group match the PHP-side built-in providers (canonical
 *    five only — bespoke leaf overrides validate their metadata in the
 *    leaves.spec.js cross-check).
 */

const { createIntegrationRegistry } = require('../../src/integrations/registry.js')
const { builtinIntegrations, registerBuiltinIntegrations } = require('../../src/integrations/builtin/index.js')

// Canonical PHP-backed built-ins (group 'core', requiredApp null) — the
// ordering for `registerBuiltinIntegrations()` output cross-checks
// against this list. Bespoke leaf overrides follow in declaration
// order in `builtinIntegrations`.
const CANONICAL_IDS = ['files', 'notes', 'tags', 'tasks', 'audit-trail']

// Bespoke leaf overrides bundled with the built-ins so the AD-13
// first-wins collision policy upgrades a leaf to a richer Vue pair at
// bootstrap. Keep this in lock-step with `src/integrations/builtin/index.js`.
const BESPOKE_LEAF_IDS = [
	// comms
	'calendar',
	'contacts',
	'email',
	'talk',
	// docs
	'bookmarks',
	'collectives',
	'maps',
	'photos',
	// workflow
	'deck',
	'polls',
	'shares',
	'activity',
	'analytics',
	'cospend',
	'flow',
	'forms',
	'time-tracker',
	'field-inspection',
	// external
	'openproject',
	'xwiki',
]

// `version-history` is a bespoke-but-`core`-group addition (not a
// PHP-backed provider like the canonical five) declared right after
// `audit-trail` and before the comms/docs/workflow/external bespoke
// leaf block — see `src/integrations/builtin/version-history.js`.
const ALL_IDS = [...CANONICAL_IDS, 'version-history', ...BESPOKE_LEAF_IDS]

// Same set but sorted by `order` ascending — `reg.list()` returns the
// providers sorted by `.order` (see `registry.js`), so the assertion
// against the snapshot must match the order-sorted shape, not the
// declaration order in `builtinIntegrations`.
const SORTED_IDS = [
	'files', // 1
	'notes', // 2
	'tags', // 3
	'tasks', // 4
	'audit-trail', // 5
	'version-history', // 6
	'shares', // 10
	'calendar', // 20
	'contacts', // 21
	'email', // 22
	'talk', // 23
	'openproject', // 31
	'xwiki', // 32
	'bookmarks', // 40
	'collectives', // 41
	'maps', // 42
	'photos', // 43
	'activity', // 60
	'analytics', // 61
	'cospend', // 62
	'deck', // 63
	'flow', // 64
	'forms', // 65
	'polls', // 66
	'time-tracker', // 67
	'field-inspection', // 68
]

describe('builtinIntegrations', () => {
	it('exposes the canonical five plus bespoke leaf overrides in the documented order', () => {
		expect(builtinIntegrations.map((d) => d.id)).toEqual(ALL_IDS)
	})

	it('each descriptor carries the required tab + widget components', () => {
		for (const d of builtinIntegrations) {
			expect(d.tab).toBeTruthy()
			expect(d.widget).toBeTruthy()
		}
	})

	it('the canonical five match the PHP built-in providers on id / order / icon / group', () => {
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
		for (const id of CANONICAL_IDS) {
			expect(byId[id].group).toBe('core')
			expect(byId[id].requiredApp).toBe(null)
		}
	})

	it('bespoke leaf override for `talk` mirrors the leaf-side metadata', () => {
		const byId = Object.fromEntries(builtinIntegrations.map((d) => [d.id, d]))
		const talk = byId.talk
		expect(talk).toBeTruthy()
		expect(talk.icon).toBe('ChatOutline')
		expect(talk.group).toBe('comms')
		expect(talk.requiredApp).toBe('spreed')
		expect(talk.order).toBe(23)
		expect(talk.referenceType).toBe('talk')
	})

	it('declares referenceType === id for each entry (AD-18 crossover)', () => {
		for (const d of builtinIntegrations) {
			expect(d.referenceType).toBe(d.id)
		}
	})

	it('version-history is additive alongside audit-trail (no collision)', () => {
		const byId = Object.fromEntries(builtinIntegrations.map((d) => [d.id, d]))
		expect(byId['audit-trail']).toBeTruthy()
		expect(byId['version-history']).toBeTruthy()
		expect(byId['version-history'].order).toBe(6)
		expect(byId['version-history'].icon).toBe('FileCompare')
		expect(byId['version-history'].group).toBe('core')
		expect(byId['version-history'].requiredApp).toBe(null)
	})
})

describe('registerBuiltinIntegrations', () => {
	it('registers every entry onto a fresh registry and returns the new ids', () => {
		const reg = createIntegrationRegistry()
		const ids = registerBuiltinIntegrations(reg)
		// `ids` is the declaration-order list of newly-registered ids
		expect(ids).toEqual(ALL_IDS)
		// `reg.list()` returns providers sorted by `.order` ascending
		expect(reg.list().map((p) => p.id)).toEqual(SORTED_IDS)
	})

	it('skips ids already registered without throwing (collision: first wins)', () => {
		const reg = createIntegrationRegistry()
		const customNotes = { name: 'CustomNotesTab', render() {} }
		const customWidget = { name: 'CustomNotesWidget', render() {} }
		reg.register({ id: 'notes', label: 'My Notes', tab: customNotes, widget: customWidget })
		const ids = registerBuiltinIntegrations(reg)
		// notes was skipped, the rest registered in their original relative order
		expect(ids).toEqual(ALL_IDS.filter((id) => id !== 'notes'))
		// and the pre-registered one survived
		expect(reg.get('notes').label).toBe('My Notes')
		expect(reg.get('notes').tab).toBe(customNotes)
	})

	it('is idempotent — calling it twice does not throw and does not duplicate', () => {
		const reg = createIntegrationRegistry()
		registerBuiltinIntegrations(reg)
		const second = registerBuiltinIntegrations(reg)
		expect(second).toEqual([])
		expect(reg.list()).toHaveLength(ALL_IDS.length)
	})

	it('defaults to the singleton registry when no argument is passed', () => {
		const { integrations } = require('../../src/integrations/registry.js')
		integrations.__resetForTests()
		const ids = registerBuiltinIntegrations()
		expect(ids).toContain('files')
		expect(integrations.has('audit-trail')).toBe(true)
		expect(integrations.has('talk')).toBe(true)
		integrations.__resetForTests()
	})
})
