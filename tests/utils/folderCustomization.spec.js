/**
 * Tests for the folder-customization catalogs and resolvers (vault icons &
 * colors, the Proton Pass pattern).
 */

const {
	FOLDER_COLORS,
	FOLDER_ICONS,
	folderColorTint,
	resolveFolderColor,
	resolveFolderIcon,
	searchFolderIcons,
} = require('../../src/utils/folderCustomization.js')

describe('folderCustomization catalogs', () => {
	it('ships 12 colors with light + dark variants and unique keys', () => {
		expect(FOLDER_COLORS).toHaveLength(12)
		const keys = new Set(FOLDER_COLORS.map((c) => c.key))
		expect(keys.size).toBe(12)
		for (const c of FOLDER_COLORS) {
			expect(c.light).toMatch(/^#[0-9a-f]{6}$/)
			expect(c.dark).toMatch(/^#[0-9a-f]{6}$/)
			expect(typeof c.label).toBe('string')
		}
	})

	it('keeps each pair the same HUE across themes (identity survives a flip)', () => {
		// Hue from a hex, in degrees. A vault must stay recognizably "the
		// blue one" in both modes — the pairs differ in lightness, not hue.
		const hueOf = (hex) => {
			const int = parseInt(hex.slice(1), 16)
			const r = ((int >> 16) & 0xff) / 255
			const g = ((int >> 8) & 0xff) / 255
			const b = (int & 0xff) / 255
			const max = Math.max(r, g, b)
			const min = Math.min(r, g, b)
			const d = max - min
			if (d === 0) return 0
			let h
			if (max === r) h = ((g - b) / d) % 6
			else if (max === g) h = (b - r) / d + 2
			else h = (r - g) / d + 4
			return ((h * 60) + 360) % 360
		}
		for (const c of FOLDER_COLORS) {
			if (c.key === 'gray') continue // desaturated — hue is meaningless
			const diff = Math.abs(hueOf(c.light) - hueOf(c.dark))
			const wrapped = Math.min(diff, 360 - diff)
			expect(wrapped).toBeLessThanOrEqual(12)
		}
	})

	it('ships a curated icon set with unique kebab-case keys and components', () => {
		expect(FOLDER_ICONS.length).toBeGreaterThanOrEqual(20)
		const keys = new Set(FOLDER_ICONS.map((e) => e.key))
		expect(keys.size).toBe(FOLDER_ICONS.length)
		for (const e of FOLDER_ICONS) {
			expect(e.key).toMatch(/^[a-z0-9][a-z0-9-]*$/)
			expect(e.component).toBeTruthy()
		}
	})
})

describe('resolveFolderColor', () => {
	it('resolves a key to the theme-matching variant', () => {
		const blue = FOLDER_COLORS.find((c) => c.key === 'blue')
		expect(resolveFolderColor('blue', 'light')).toBe(blue.light)
		expect(resolveFolderColor('blue', 'dark')).toBe(blue.dark)
	})

	it('passes a literal hex through unchanged (hand-edited storage)', () => {
		expect(resolveFolderColor('#123456', 'dark')).toBe('#123456')
	})

	it('resolves unset and unknown values to null', () => {
		expect(resolveFolderColor(null, 'light')).toBeNull()
		expect(resolveFolderColor(undefined, 'dark')).toBeNull()
		expect(resolveFolderColor('', 'light')).toBeNull()
		expect(resolveFolderColor('vermilion', 'light')).toBeNull()
	})
})

describe('folderColorTint', () => {
	it('derives the tint from the SAME theme hex at the given alpha', () => {
		const blue = FOLDER_COLORS.find((c) => c.key === 'blue')
		const int = parseInt(blue.dark.slice(1), 16)
		/* eslint-disable no-bitwise */
		const expected = `rgba(${(int >> 16) & 0xff}, ${(int >> 8) & 0xff}, ${int & 0xff}, 0.15)`
		/* eslint-enable no-bitwise */
		expect(folderColorTint('blue', 'dark')).toBe(expected)
	})

	it('honours a custom alpha', () => {
		expect(folderColorTint('red', 'light', 0.28)).toMatch(/0\.28\)$/)
	})

	it('is null for unset and unknown values (caller keeps neutral chrome)', () => {
		expect(folderColorTint(null, 'light')).toBeNull()
		expect(folderColorTint('vermilion', 'dark')).toBeNull()
	})
})

describe('resolveFolderIcon', () => {
	it('resolves a known key to its component', () => {
		const briefcase = FOLDER_ICONS.find((e) => e.key === 'briefcase')
		expect(resolveFolderIcon('briefcase')).toBe(briefcase.component)
	})

	it('resolves unset and unknown keys to null (caller falls back)', () => {
		expect(resolveFolderIcon(null)).toBeNull()
		expect(resolveFolderIcon(undefined)).toBeNull()
		expect(resolveFolderIcon('unicorn')).toBeNull()
	})
})

describe('searchFolderIcons', () => {
	it('returns the full catalog for an empty query', () => {
		expect(searchFolderIcons('')).toEqual(FOLDER_ICONS)
		expect(searchFolderIcons('   ')).toEqual(FOLDER_ICONS)
	})

	it('matches case-insensitively on key and English label', () => {
		const byKey = searchFolderIcons('CREDIT')
		expect(byKey.map((e) => e.key)).toContain('credit-card')
		const byLabel = searchFolderIcons('work')
		expect(byLabel.map((e) => e.key)).toContain('briefcase')
	})

	it('matches the TRANSLATED label so users search in their own language', () => {
		const nl = { Travel: 'Reizen' }
		const hits = searchFolderIcons('reizen', (label) => nl[label] || label)
		expect(hits.map((e) => e.key)).toContain('airplane')
		// Without the translate function the same query finds nothing.
		expect(searchFolderIcons('reizen').map((e) => e.key)).not.toContain('airplane')
	})
})
