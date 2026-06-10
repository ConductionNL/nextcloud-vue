/**
 * Tests for the cn-app-nav-shell-refactor manifest schema additions.
 *
 * Covers the additive fields landed by the change:
 *  - menu[].section enum extended with "footer"
 *  - menu[].type: "item" | "caption"
 *  - menu[].count: positive integer | "auto"
 *  - menu[].pinned: boolean
 *  - menu[].open: boolean
 *  - nav.primaryAction (existing) + nav.includePersonalSettings (existing)
 *  - pages[].primaryAction: same shape as nav.primaryAction
 *
 * Exercised against the v2 schema (the canonical compiled validator);
 * the v1 schema is permissive and accepts the same shapes implicitly.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function buildV2Manifest(overrides = {}) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.7.0',
		menu: [{ id: 'home', label: 'app.home', route: 'home', order: 1 }],
		pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
		...overrides,
	}
}

describe('cn-app-nav-shell-refactor — manifest schema additions', () => {
	describe('menu[].section "footer"', () => {
		it('accepts section: "footer"', () => {
			const m = buildV2Manifest({
				menu: [
					{ id: 'docs', label: 'app.docs', section: 'footer', href: 'https://docs.example.org' },
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('rejects an unknown section value', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'bad', label: 'app.bad', section: 'unknown' }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(false)
		})
	})

	describe('menu[].type "caption"', () => {
		it('accepts type: "caption"', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'section-1', label: 'Section', type: 'caption', order: 1 }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('rejects an unknown type value', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'x', label: 'X', type: 'header' }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(false)
		})
	})

	describe('menu[].count (literal + "auto")', () => {
		it('accepts a positive integer count', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'a', label: 'A', route: 'home', count: 42 }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('accepts count: "auto"', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'a', label: 'A', route: 'home', count: 'auto' }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('rejects a negative integer count', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'a', label: 'A', route: 'home', count: -1 }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(false)
		})

		it('rejects an unknown sentinel string', () => {
			const m = buildV2Manifest({
				menu: [{ id: 'a', label: 'A', route: 'home', count: 'live' }],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(false)
		})
	})

	describe('menu[].pinned + open', () => {
		it('accepts pinned: true and open: true on a parent item', () => {
			const m = buildV2Manifest({
				menu: [
					{
						id: 'parent',
						label: 'P',
						route: 'home',
						pinned: true,
						open: true,
						children: [{ id: 'child', label: 'C', route: 'home' }],
					},
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})
	})

	describe('nav.primaryAction + page-scoped primaryAction', () => {
		it('accepts a nav-root primaryAction', () => {
			const m = buildV2Manifest({
				nav: { primaryAction: { id: 'create', label: '+ New', icon: 'Plus' } },
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('accepts a page-scoped primaryAction on a pages[] entry', () => {
			const m = buildV2Manifest({
				pages: [
					{
						id: 'home',
						route: '/',
						type: 'index',
						title: 'app.home',
						primaryAction: { id: 'create-home', label: '+ New', icon: 'Plus' },
					},
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('accepts both nav-root AND page-scoped primaryAction in the same manifest', () => {
			const m = buildV2Manifest({
				nav: { primaryAction: { id: 'app-create', label: '+ New' } },
				pages: [
					{
						id: 'home',
						route: '/',
						type: 'index',
						title: 'app.home',
						primaryAction: { id: 'create-home', label: '+ New' },
					},
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('accepts payload field on primaryAction (free-form)', () => {
			const m = buildV2Manifest({
				nav: { primaryAction: { id: 'app-create', label: '+ New', payload: { presetId: 42 } } },
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})

		it('rejects a primaryAction missing the required label field', () => {
			const m = buildV2Manifest({
				nav: { primaryAction: { id: 'app-create' } },
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(false)
		})
	})

	describe('full manifest with every new field', () => {
		it('validates a manifest carrying all new fields at once', () => {
			const m = buildV2Manifest({
				nav: {
					primaryAction: { id: 'app-create', label: '+ New', icon: 'Plus' },
					includePersonalSettings: true,
					settingsLabel: 'Preferences',
				},
				menu: [
					{ id: 'section-1', label: 'Group', type: 'caption', order: 1 },
					{ id: 'home', label: 'Home', route: 'home', order: 2, count: 'auto', pinned: false },
					{ id: 'docs', label: 'Docs', section: 'footer', href: 'https://docs.example.org', order: 3 },
					{ id: 'app-settings', label: 'Settings', section: 'settings', route: 'home', order: 4 },
				],
				pages: [
					{
						id: 'home',
						route: '/',
						type: 'index',
						title: 'app.home',
						config: { register: 'decisions', schema: 'decision' },
						primaryAction: { id: 'create-decision', label: '+ New decision', icon: 'Plus' },
					},
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})
	})

	describe('back-compat — legacy manifest without new fields', () => {
		it('still validates a manifest using only pre-change fields', () => {
			const m = buildV2Manifest({
				menu: [
					{ id: 'home', label: 'Home', route: 'home', order: 1 },
					{ id: 'app-settings', label: 'Settings', section: 'settings', route: 'home', order: 2 },
				],
			})
			const result = validateManifest(m)
			expect(result.valid).toBe(true)
		})
	})
})
