/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The side panel's line under its title counts the list ("48 zaken, 8 op deze
 * pagina", DqFilterBeheren) when the page declares `sidebar.subtitle`, instead
 * of the schema's description ("A case instance in the case management
 * system...", in English on a Dutch page).
 *
 * @spec openspec/changes/index-sidebar-count-subtitle/specs/index-sidebar-count-subtitle/spec.md
 */

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

describe('the side panel subtitle', () => {
	it('reads the subtitle the page hands it, over the schema description', () => {
		const resolvedSubname = CnIndexSidebar.computed.resolvedSubname
		expect(resolvedSubname.call({ subtitle: '48 cases, 8 on this page', schema: { description: 'A case instance' } })).toBe('48 cases, 8 on this page')
		expect(resolvedSubname.call({ subtitle: '', schema: { description: 'A case instance' } })).toBe('A case instance')
	})

	it('fills the page\'s sidebar.subtitle with the total and the rows shown', () => {
		const sidebarSubtitle = CnIndexPage.computed.sidebarSubtitle
		const ctx = {
			sidebar: { enabled: true, subtitle: '{total} cases, {shown} on this page' },
			effectivePagination: { total: 48 },
			effectiveObjects: new Array(8).fill({}),
			cnTranslate: (key) => key,
			cnAppId: '',
		}
		expect(sidebarSubtitle.call(ctx)).toBe('48 cases, 8 on this page')
		expect(sidebarSubtitle.call({ ...ctx, sidebar: { enabled: true } })).toBe('')
		expect(sidebarSubtitle.call({ ...ctx, effectivePagination: {} })).toBe('')
	})
})
