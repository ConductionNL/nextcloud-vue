/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A menu caption (`type: "caption"`, a section heading such as shillinq's
 * Verkoop / Inkoop / Bank / Boekhouding) survives the menu-layout
 * relocations. The cleanup after relocating dropped every entry without a
 * route, href, action or children, which is every caption, so an app that
 * passed a menuLayout with relocations lost its section headings. A caption
 * the relocations emptied (every entry under it moved away) is dropped, so no
 * heading is left over nothing.
 */

const { applyMenuRelocations } = require('../../src/utils/buildManifest.js')

const caption = (id) => ({ id, label: id, type: 'caption' })
const leaf = (id) => ({ id, label: id, route: id })

describe('applyMenuRelocations: captions', () => {
	it('keeps the captions while relocating a group', () => {
		const menu = [
			caption('sales'),
			leaf('invoices'),
			{ id: 'old', label: 'Old', children: [leaf('quotes')] },
			caption('bank'),
			leaf('statements'),
		]
		const out = applyMenuRelocations(menu, { old: 'invoices-group' })
		expect(out.map((m) => m.id)).toEqual(['sales', 'invoices', 'bank', 'statements', 'old'])
	})

	it('keeps a caption that still has an entry under it after a relocation', () => {
		const menu = [leaf('home'), caption('later'), { id: 'g', label: 'G', children: [leaf('a')] }, leaf('x')]
		const out = applyMenuRelocations(menu, { x: 'g' })
		expect(out.map((m) => m.id)).toEqual(['home', 'later', 'g'])
	})

	it('keeps a caption the app declared over nothing: only a relocation that empties one drops it', () => {
		const menu = [caption('empty'), caption('next'), leaf('y'), { id: 'g', label: 'G', children: [] }, leaf('z')]
		const out = applyMenuRelocations(menu, { z: 'g' })
		expect(out.map((m) => m.id)).toEqual(['empty', 'next', 'y', 'g'])
	})

	it('drops a caption whose every entry was relocated away', () => {
		const menu = [
			caption('sales'),
			leaf('invoices'),
			caption('moved'),
			leaf('a'),
			leaf('b'),
			caption('bank'),
			{ id: 'g', label: 'G', children: [leaf('c')] },
		]
		const out = applyMenuRelocations(menu, { a: 'g', b: 'g' })
		expect(out.map((m) => m.id)).toEqual(['sales', 'invoices', 'bank', 'g'])
		expect(out.find((m) => m.id === 'g').children.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
	})

	it('leaves the menu untouched without relocations', () => {
		const menu = [caption('sales'), leaf('invoices')]
		expect(applyMenuRelocations(menu, undefined)).toBe(menu)
	})
})
