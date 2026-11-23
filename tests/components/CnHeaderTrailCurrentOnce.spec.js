/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A breadcrumb whose last crumb names the page itself is not drawn twice:
 * DqPostvak reads "Postvak · berichten van de hele organisatie ...", one
 * crumb (the current page) before the meta note, not "Postvak / Postvak".
 *
 * @spec openspec/changes/header-trail-current-once/specs/header-trail-current-once/spec.md
 */
import CnHeaderTrail from '../../src/components/CnPageHeader/CnHeaderTrail.vue'

/**
 * The trail's crumbs for a context.
 *
 * @param {object|Array<object>} breadcrumb The declared crumbs.
 * @param {string} current The page title.
 * @return {Array<object>} The crumbs.
 */
function crumbs(breadcrumb, current) {
	const ctx = { breadcrumb, current, translate: (text) => ({ Mailbox: 'Postvak', Procurement: 'Inkoop' })[text] || text }
	ctx.declared = CnHeaderTrail.computed.declared.call(ctx)
	return CnHeaderTrail.computed.crumbs.call(ctx)
}

describe('CnHeaderTrail, the current page once', () => {
	it('draws a crumb that names the page itself only once, as the current one', () => {
		expect(crumbs({ label: 'Mailbox', route: 'Postvak' }, 'Postvak').map((c) => c.label)).toEqual(['Postvak'])
	})

	it('keeps a parent crumb before the page', () => {
		expect(crumbs({ label: 'Procurement', route: 'Contracts' }, 'Contracten').map((c) => c.label)).toEqual(['Inkoop', 'Contracten'])
	})
})
