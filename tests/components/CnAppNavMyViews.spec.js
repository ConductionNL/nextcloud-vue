/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The standard "My views" menu section (Ruben's design rule, 19 Oct): every
 * app that offers saved views ends its menu with it, after every main entry
 * and so just above the footer entries (Help, Advanced). It lists the user's
 * pinned views, or one line saying how to add one, so the section can be
 * found. It replaces app-specific groups such as dossiq's "My case types".
 *
 * @spec openspec/changes/my-views-menu-section/specs/app-nav/spec.md#requirement-every-app-menu-ends-with-my-views
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import { withSavedViewMenu } from '../../src/utils/savedViewMenu.js'

const MENU = [
	{ id: 'Dashboard', route: 'Dashboard', label: 'Dashboard', order: 1 },
	{ id: 'Zaken', type: 'caption', label: 'Cases', order: 10 },
	{ id: 'Cases', route: 'Cases', label: 'All cases', order: 11 },
	{ id: 'Rel', type: 'caption', label: 'Relations', order: 20 },
	{ id: 'Contacts', route: 'Contacts', label: 'Contacts', order: 21 },
	{ id: 'Help', route: 'Help', label: 'Help', section: 'footer', order: 90 },
]

/**
 * Mount the nav with a menu.
 *
 * @param {Array<object>} menu The menu.
 * @return {import('@vue/test-utils').VueWrapper} The nav.
 */
function mountNav(menu) {
	const $route = reactive({ name: 'Dashboard', path: '/', query: {} })
	return mount(CnAppNav, {
		global: { provide: { cnManifest: { menu }, cnTranslate: (k) => k }, mocks: { $route } },
	})
}

describe('the My views menu section', () => {
	it('ends the main menu with the pinned views, the footer entries still after it', () => {
		const out = withSavedViewMenu(MENU, [{ id: '7', page: 'Cases', name: 'Mine, overdue' }], { showEmpty: true })
		const main = out.filter((item) => item.section !== 'footer').map((item) => item.id)
		expect(main.slice(-2)).toEqual(['saved-views-caption', 'saved-view-7'])
		const w = mountNav(out)
		const ids = w.findAll('[data-testid^="cn-nav-"]').map((el) => el.attributes('data-testid'))
		expect(ids.indexOf('cn-nav-caption-saved-views-caption')).toBeGreaterThan(ids.indexOf('cn-nav-entry-Contacts'))
		expect(ids.indexOf('cn-nav-entry-saved-view-7')).toBeGreaterThan(ids.indexOf('cn-nav-caption-saved-views-caption'))
	})

	it('shows the section with a line saying how to add a filter while none is pinned', () => {
		const out = withSavedViewMenu(MENU, [], { showEmpty: true })
		expect(out.filter((item) => item.section !== 'footer').slice(-2).map((item) => item.type)).toEqual(['caption', 'hint'])
		const w = mountNav(out)
		const hint = w.find('[data-testid="cn-nav-hint-saved-views-empty"]')
		expect(hint.exists()).toBe(true)
		expect(hint.text()).toBe('Add a view to the menu from Filters')
		expect(hint.find('a').exists()).toBe(false)
	})

	it('adds nothing for an app without saved views', () => {
		expect(withSavedViewMenu(MENU, [], { showEmpty: false })).toBe(MENU)
	})

	it('gives the My views heading a pencil that opens the user settings (DqZijbalk)', async () => {
		const out = withSavedViewMenu(MENU, [], { showEmpty: true })
		const open = jest.fn()
		const $route = reactive({ name: 'Dashboard', path: '/', query: {} })
		const w = mount(CnAppNav, {
			global: { provide: { cnManifest: { menu: out }, cnTranslate: (k) => k, cnOpenUserSettings: open }, mocks: { $route } },
		})
		const pencil = w.find('[data-testid="cn-nav-caption-edit-saved-views-caption"]')
		expect(pencil.exists()).toBe(true)
		await pencil.trigger('click')
		expect(open).toHaveBeenCalled()
	})
})
