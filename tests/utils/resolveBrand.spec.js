/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-brand-block-top-bar/tasks.md
 */
import { resolveBrand } from '../../src/utils/resolveBrand.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const tr = (text) => `t:${text}`

describe('resolveBrand', () => {
	it('returns null for nothing drawable', () => {
		expect(resolveBrand(null, tr)).toBeNull()
		expect(resolveBrand('x', tr)).toBeNull()
		expect(resolveBrand({ placement: 'nav' }, tr)).toBeNull()
	})

	it('reads the shape the navigation drew, translating the text', () => {
		const brand = resolveBrand({ emblem: true, name: 'Dossiq', caption: 'Gemeente', alt: 'a', logo: '/l.svg' }, tr)
		expect(brand).toEqual({ logo: '/l.svg', emblem: true, name: 't:Dossiq', caption: 't:Gemeente', alt: 't:a', placement: '' })
	})

	it('keeps a known placement and drops an unknown one', () => {
		expect(resolveBrand({ name: 'A', placement: 'nav' }, tr).placement).toBe('nav')
		expect(resolveBrand({ name: 'A', placement: 'header' }, tr).placement).toBe('header')
		expect(resolveBrand({ name: 'A', placement: 'left' }, tr).placement).toBe('')
	})
})

describe('nav.brand.placement in the manifest schema', () => {
	const base = (placement) => ({
		$schema: 'x',
		version: '1.0.0',
		menu: [],
		pages: [],
		nav: { brand: { name: 'A', placement } },
	})
	it('accepts header and nav, rejects anything else', () => {
		expect(validateManifestV2(base('header')).errors.filter((e) => /placement/.test(JSON.stringify(e)))).toEqual([])
		expect(validateManifestV2(base('nav')).errors.filter((e) => /placement/.test(JSON.stringify(e)))).toEqual([])
		expect(validateManifestV2(base('left')).errors.some((e) => /placement/.test(JSON.stringify(e)))).toBe(true)
	})
})
