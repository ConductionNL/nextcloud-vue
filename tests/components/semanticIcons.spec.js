/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * ADR-077 — the semantic icon vocabulary's invariants.
 *
 * The vocabulary only buys recognisability if it is actually a bijection and
 * every name actually resolves. Both properties are cheap to assert and were
 * both violated in the pre-ADR fleet: `icon-category-organization` stood for 15
 * concepts, and shillinq shipped `LedgerOutline` / `FileSignOutline` — names
 * that do not exist in vue-material-design-icons at all.
 */
import fs from 'fs'
import path from 'path'

import {
	SEMANTIC_ICONS,
	SEMANTIC_ICONS_TIER_A,
	SEMANTIC_ICONS_TIER_B,
	SEMANTIC_ICON_TIERS,
	SEMANTIC_ICON_COMPONENTS,
	conceptForIcon,
	getSemanticIconComponent,
} from '../../src/components/CnIcon/semanticIcons.js'

// jest transpiles this spec to CommonJS, so __dirname is provided natively.
/** Absolute path to the installed icon package. */
const ICON_PKG = path.resolve(__dirname, '../../node_modules/vue-material-design-icons')

describe('ADR-077 semantic icon vocabulary', () => {
	it('is not empty and covers both tiers', () => {
		expect(Object.keys(SEMANTIC_ICONS_TIER_A).length).toBeGreaterThan(0)
		expect(Object.keys(SEMANTIC_ICONS_TIER_B).length).toBeGreaterThan(0)
		expect(Object.keys(SEMANTIC_ICONS)).toHaveLength(
			Object.keys(SEMANTIC_ICONS_TIER_A).length
			+ Object.keys(SEMANTIC_ICONS_TIER_B).length,
		)
	})

	// The check that would have caught `LedgerOutline` before it shipped.
	it('every icon name exists in vue-material-design-icons', () => {
		const missing = Object.entries(SEMANTIC_ICONS)
			.filter(([, icon]) => !fs.existsSync(path.join(ICON_PKG, `${icon}.vue`)))
			.map(([concept, icon]) => `${concept} -> ${icon}`)
		expect(missing).toEqual([])
	})

	// One concept, one icon — and no icon doing double duty. This is what stops
	// the historical overloading from creeping back in.
	it('is a bijection: no icon serves two concepts', () => {
		const byIcon = {}
		for (const [concept, icon] of Object.entries(SEMANTIC_ICONS)) {
			byIcon[icon] = byIcon[icon] || []
			byIcon[icon].push(concept)
		}
		const shared = Object.entries(byIcon)
			.filter(([, concepts]) => concepts.length > 1)
			.map(([icon, concepts]) => `${icon} <- ${concepts.join(', ')}`)
		expect(shared).toEqual([])
	})

	it('the two tiers do not overlap', () => {
		const overlap = Object.keys(SEMANTIC_ICONS_TIER_A)
			.filter((c) => c in SEMANTIC_ICONS_TIER_B)
		expect(overlap).toEqual([])
	})

	it('tags every concept with its tier', () => {
		for (const concept of Object.keys(SEMANTIC_ICONS_TIER_A)) {
			expect(SEMANTIC_ICON_TIERS[concept]).toBe('A')
		}
		for (const concept of Object.keys(SEMANTIC_ICONS_TIER_B)) {
			expect(SEMANTIC_ICON_TIERS[concept]).toBe('B')
		}
	})

	it('ships a component for every name in the vocabulary', () => {
		const missing = Object.values(SEMANTIC_ICONS)
			.filter((icon) => !SEMANTIC_ICON_COMPONENTS[icon])
		expect(missing).toEqual([])
	})

	it('pins the Tier A concepts users meet in every app', () => {
		// Named explicitly so a silent change to a universal glyph fails here.
		expect(SEMANTIC_ICONS_TIER_A.dashboard).toBe('ViewDashboardOutline')
		expect(SEMANTIC_ICONS_TIER_A.store).toBe('StoreOutline')
		expect(SEMANTIC_ICONS_TIER_A.settings).toBe('CogOutline')
		expect(SEMANTIC_ICONS_TIER_A.documentation).toBe('BookOpenVariantOutline')
		expect(SEMANTIC_ICONS_TIER_A['features-roadmap']).toBe('MapMarkerPath')
	})

	describe('getSemanticIconComponent', () => {
		it('resolves a vocabulary name without any registerIcons() call', () => {
			expect(getSemanticIconComponent('StoreOutline')).toBeTruthy()
		})

		it('returns null for a name outside the vocabulary', () => {
			// The invented names that shipped in real manifests.
			expect(getSemanticIconComponent('LedgerOutline')).toBeNull()
			expect(getSemanticIconComponent('FileSignOutline')).toBeNull()
		})

		it('returns null for empty and non-string input', () => {
			expect(getSemanticIconComponent('')).toBeNull()
			expect(getSemanticIconComponent(null)).toBeNull()
			expect(getSemanticIconComponent(undefined)).toBeNull()
			expect(getSemanticIconComponent(42)).toBeNull()
		})
	})

	describe('conceptForIcon', () => {
		it('maps a canonical icon back to its concept', () => {
			expect(conceptForIcon('StoreOutline')).toBe('store')
			expect(conceptForIcon('ViewDashboardOutline')).toBe('dashboard')
		})

		it('returns null for an unknown icon', () => {
			expect(conceptForIcon('NotAnIconName')).toBeNull()
		})
	})
})
