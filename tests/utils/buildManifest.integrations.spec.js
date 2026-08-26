/**
 * ADR-110 — the Integrations section.
 *
 * `section: "integrations"` takes a menu entry OUT of the navigation and puts
 * it in the Integrations section of the per-user settings modal. These tests
 * pin the two properties that make that safe: the entry is RELOCATED rather
 * than dropped (ADR-044 Decision 5's no-functionality-loss invariant), and it
 * never leaks back into a nav bucket.
 */

const {
	buildManifest,
	applyMenuLayout,
	applyIntegrationsSection,
	applySettingsSection,
} = require('../../src/utils/buildManifest.js')

describe('applyIntegrationsSection', () => {
	it('lifts a listed entry out of the nav and tags it', () => {
		const menu = [
			{ id: 'Cases', label: 'Cases', route: 'Cases' },
			{ id: 'AvgLink', label: 'AVG', href: '/apps/openregister/#/avg' },
		]
		const out = applyIntegrationsSection(menu, ['AvgLink'])
		const avg = out.find((i) => i.id === 'AvgLink')
		expect(avg.section).toBe('integrations')
		expect(out.find((i) => i.id === 'Cases').section).toBeUndefined()
	})

	it('relocates rather than drops — the entry still exists', () => {
		// ADR-044 Decision 5: a navigation refactor MUST NOT drop a reachable
		// function. The whole reason Integrations is a destination and not a
		// deletion is that this invariant has to keep holding.
		const menu = [{ id: 'AiLink', label: 'AI oversight', href: '/apps/hermiq/ai-oversight' }]
		const out = applyIntegrationsSection(menu, ['AiLink'])
		expect(out).toHaveLength(1)
		expect(out[0].href).toBe('/apps/hermiq/ai-oversight')
	})

	it('lifts an entry out of a nested group', () => {
		const menu = [
			{
				id: 'SettingsGroup',
				label: 'Settings',
				children: [
					{ id: 'AvgLink', label: 'AVG', href: '/apps/openregister/#/avg' },
					{ id: 'Keep', label: 'Keep', route: 'Keep' },
				],
			},
		]
		const out = applyIntegrationsSection(menu, ['AvgLink'])
		const group = out.find((i) => i.id === 'SettingsGroup')
		expect(group.children.map((c) => c.id)).toEqual(['Keep'])
		expect(out.find((i) => i.id === 'AvgLink').section).toBe('integrations')
	})

	it('drops an empty non-clickable group left behind, keeps a clickable one', () => {
		const menu = [
			{ id: 'Shell', label: 'Shell', children: [{ id: 'A', href: '/apps/x' }] },
			{ id: 'Clickable', label: 'Clickable', route: 'R', children: [{ id: 'B', href: '/apps/y' }] },
		]
		const out = applyIntegrationsSection(menu, ['A', 'B'])
		expect(out.find((i) => i.id === 'Shell')).toBeUndefined()
		expect(out.find((i) => i.id === 'Clickable')).toBeDefined()
	})

	it('is a no-op for an absent or empty id list', () => {
		const menu = [{ id: 'Cases', route: 'Cases' }]
		expect(applyIntegrationsSection(menu, undefined)).toBe(menu)
		expect(applyIntegrationsSection(menu, [])).toBe(menu)
	})
})

describe('applyMenuLayout — integrations ordering', () => {
	it('integrations wins over settings when an id is listed in both', () => {
		// An integration link is not a settings page of this app. If a stale
		// settingsSection entry still names it, the entry must still end up in
		// exactly one place, and that place is Integrations.
		const menu = [{ id: 'AvgLink', label: 'AVG', href: '/apps/openregister/#/avg' }]
		const out = applyMenuLayout(menu, {
			settingsSection: ['AvgLink'],
			integrationsSection: ['AvgLink'],
		})
		const hits = out.filter((i) => i.id === 'AvgLink')
		expect(hits).toHaveLength(1)
		expect(hits[0].section).toBe('integrations')
	})

	it('leaves settings entries alone', () => {
		const menu = [
			{ id: 'CaseTypes', label: 'Case types', route: 'CaseTypes' },
			{ id: 'AvgLink', label: 'AVG', href: '/apps/openregister/#/avg' },
		]
		const out = applyMenuLayout(menu, {
			settingsSection: ['CaseTypes'],
			integrationsSection: ['AvgLink'],
		})
		expect(out.find((i) => i.id === 'CaseTypes').section).toBe('settings')
		expect(out.find((i) => i.id === 'AvgLink').section).toBe('integrations')
	})

	it('runs end to end through buildManifest', () => {
		const base = {
			version: '1.0.0',
			menu: [
				{ id: 'Cases', label: 'Cases', route: 'Cases' },
				{ id: 'AvgLink', label: 'AVG', href: '/apps/openregister/#/avg' },
			],
			pages: [],
		}
		const merged = buildManifest(base, [], { integrationsSection: ['AvgLink'] })
		expect(merged.menu.find((i) => i.id === 'AvgLink').section).toBe('integrations')
		expect(merged.menu.find((i) => i.id === 'Cases').section).toBeUndefined()
	})
})

describe('the nav buckets never claim an integrations entry', () => {
	// CnAppNav splits on `=== 'main' | 'footer' | 'settings'`. This asserts the
	// property that makes that safe from the data side: nothing in the layout
	// pipeline leaves an integrations entry wearing another section's tag.
	it('an integrations entry matches no nav bucket', () => {
		const menu = [{ id: 'AvgLink', href: '/apps/openregister/#/avg' }]
		const out = applyMenuLayout(menu, { integrationsSection: ['AvgLink'] })
		const entry = out[0]
		expect(entry.section ?? 'main').not.toBe('main')
		expect(entry.section).not.toBe('footer')
		expect(entry.section).not.toBe('settings')
	})

	it('settingsSection and integrationsSection do not cross-contaminate', () => {
		const menu = [
			{ id: 'S', route: 'S' },
			{ id: 'I', href: '/apps/other' },
		]
		const out = applyMenuLayout(menu, { settingsSection: ['S'], integrationsSection: ['I'] })
		expect(out.filter((i) => i.section === 'settings').map((i) => i.id)).toEqual(['S'])
		expect(out.filter((i) => i.section === 'integrations').map((i) => i.id)).toEqual(['I'])
	})

	it('applySettingsSection does not claim an already-tagged integrations entry', () => {
		const menu = [{ id: 'I', href: '/apps/other', section: 'integrations' }]
		const out = applySettingsSection(menu, ['Something-else'])
		expect(out.find((i) => i.id === 'I').section).toBe('integrations')
	})
})
