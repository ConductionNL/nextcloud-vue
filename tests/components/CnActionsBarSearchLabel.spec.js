/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list's search field says what it searches: "Search in this list" ("Zoeken
 * in deze lijst") as its placeholder and accessible name, as the boards draw
 * it (PtNieuws, PtUitnodigen and 15 other list boards). A manifest
 * `searchPlaceholder` still names it instead.
 */
import { translate as t } from '@nextcloud/l10n'
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import { registerTranslations } from '../../src/l10n/index.js'

const stubs = { NcButton: { template: '<button type="button" v-bind="$attrs"><slot name="icon" /><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }

function searchInput(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props: { showSearch: true, ...props },
		global: { provide: { cnLook: look }, stubs },
	}).find('.cn-actions-bar__search-input')
}

describe('CnActionsBar search field label', () => {
	it.each(['board', 'nextcloud'])('names the field "Search in this list" by default (%s look)', (look) => {
		const input = searchInput({}, look)
		expect(input.attributes('placeholder')).toBe('Search in this list')
		expect(input.attributes('aria-label')).toBe('Search in this list')
	})

	it('names the field "Search in this list" in the toolbar placement too', () => {
		const input = searchInput({ searchPlacement: 'toolbar' })
		expect(input.attributes('aria-label')).toBe('Search in this list')
	})

	it('keeps a manifest searchPlaceholder', () => {
		const input = searchInput({ searchPlaceholder: 'Zoek in portals' })
		expect(input.attributes('placeholder')).toBe('Zoek in portals')
		expect(input.attributes('aria-label')).toBe('Zoek in portals')
	})

	it('reads "Zoeken in deze lijst" in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		try {
			expect(t('nextcloud-vue', 'Search in this list')).toBe('Zoeken in deze lijst')
		} finally {
			globalThis._nc_l10n_language = 'en'
			registerTranslations()
		}
	})
})
