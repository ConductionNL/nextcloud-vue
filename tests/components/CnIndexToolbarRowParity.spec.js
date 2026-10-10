/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row 1 of the board toolbar as DqZaken, PqTickets, PqLeads and PtPortals draw
 * it: the chips, Save view, then Filter and the view switch as one unit that
 * wraps together; Save view as a Dutch ghost button; the search placeholder
 * from the manifest, translated.
 *
 * @spec openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-filter-and-the-view-switch-are-one-unit-at-the-end-of-row-1
 * @spec openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-save-view-is-a-ghost-button-in-the-users-language
 * @spec openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-the-search-placeholder-comes-from-the-manifest
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const stubs = { NcButton: { template: '<button type="button" v-bind="$attrs"><slot name="icon" /><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props: { showSearch: true, showSidebarToggle: true, showViewToggle: true, viewMode: 'table', availableViewModes: ['table', 'cards'], ...props },
		slots: { 'actions-end': '<div class="cn-saved-views__save" data-o="save">Save view</div>' },
		global: { provide: { cnLook: look }, stubs },
	})
}

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rules whose selector list contains the needle.
 *
 * @param {string} needle Part of a selector.
 * @return {string} The joined rule bodies.
 */
function rulesFor(needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').some((s) => s.trim().includes(needle))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board toolbar row 1: Filter and the view switch are one unit', () => {
	it('puts Filter and the switch inside one group after Save view', () => {
		const w = mountBar()
		const unit = w.find('[data-testid="cn-actions-bar-view-controls"]')
		expect(unit.exists()).toBe(true)
		expect(unit.find('[data-testid="cn-actions-bar-filter-button"]').exists()).toBe(true)
		expect(unit.find('.cn-actions-bar__view-toggle').exists()).toBe(true)
		const row = w.find('[data-testid="cn-actions-bar-row-views"]').element
		const kids = [...row.children]
		expect(kids.indexOf(row.querySelector('[data-o="save"]'))).toBeLessThan(kids.indexOf(unit.element))
	})

	it('draws the unit for a lone Filter button and leaves it out with neither control', () => {
		expect(mountBar({ showViewToggle: false }).find('[data-testid="cn-actions-bar-view-controls"]').exists()).toBe(true)
		expect(mountBar({ showViewToggle: false, showSidebarToggle: false }).find('[data-testid="cn-actions-bar-view-controls"]').exists()).toBe(false)
	})

	it('keeps the legacy bar without the unit', () => {
		const w = mountBar({}, 'nextcloud')
		expect(w.find('[data-testid="cn-actions-bar-view-controls"]').exists()).toBe(false)
		expect(w.find('.cn-actions-bar__view-toggle-thumb').exists()).toBe(true)
	})

	it('lets the unit wrap as one and sit at the start of the next line after Save view', () => {
		expect(rulesFor('.cn-actions-bar__view-controls')).toMatch(/flex-wrap:\s*nowrap/)
		expect(rulesFor('.cn-saved-views__save ~ .cn-actions-bar__view-controls')).toMatch(/margin-inline-start:\s*0/)
		expect(rulesFor('.cn-actions-bar__row--views > :is(.cn-saved-views__save')).toMatch(/margin-inline-start:\s*auto/)
	})
})

describe('Save view is a ghost button in the user language', () => {
	it('has no border, a 34px height, radius 17 and the light primary tint', () => {
		const body = rulesFor('.cn-saved-views__save .button-vue')
		expect(body).toMatch(/border:\s*0/)
		expect(body).toMatch(/height:\s*34px/)
		expect(body).toMatch(/border-radius:\s*17px/)
		expect(body).toMatch(/var\(--color-primary-element-light\)/)
	})

	it('reads Dutch from the library catalogue, with the rest of the toolbar', () => {
		const nl = JSON.parse(fs.readFileSync(path.join(__dirname, '../../l10n/nl.json'), 'utf8')).translations
		expect(nl['Save view']).toBe('Weergave opslaan')
		expect(nl['Active:']).toBe('Actief:')
		expect(nl.Filter).toBe('Filter')
		expect(nl['Clear all']).toBe('Alles wissen')
		expect(nl['{count} active']).toBe('{count} actief')
	})
})

describe('the search placeholder comes from the manifest', () => {
	const BarStub = {
		name: 'CnActionsBar',
		props: ['searchPlaceholder'],
		template: '<div class="bar" :data-placeholder="searchPlaceholder" />',
	}

	function mountPage(extra = {}) {
		return mount(CnIndexPage, {
			propsData: {
				title: 'All cases',
				schema: { title: 'Case', properties: {} },
				objects: [],
				pagination: { page: 1, pages: 1, total: 0, limit: 20 },
				...extra,
			},
			global: {
				provide: { cnLook: 'board', cnTranslate: (key) => (key === 'Search by case, number or requester' ? 'Zoek op zaak, nummer of verzoeker' : key) },
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
				stubs: { CnActionsBar: BarStub, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
			},
		})
	}

	it('runs config.searchPlaceholder through the app translate', () => {
		expect(mountPage({ searchPlaceholder: 'Search by case, number or requester' }).find('.bar').attributes('data-placeholder')).toBe('Zoek op zaak, nummer of verzoeker')
	})

	it('passes nothing without the key, so the library default stays', () => {
		expect(mountPage().find('.bar').attributes('data-placeholder')).toBe('')
	})

	it('is a manifest key of an index page', () => {
		const manifest = (config) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'p', route: '/p', type: 'index', title: 'P', config }],
		})
		expect(validateManifestV2(manifest({ register: 'r', schema: 's', searchPlaceholder: 'Search by case' })).valid).toBe(true)
		expect(validateManifestV2(manifest({ register: 'r', schema: 's', searchPlaceholder: '' })).valid).toBe(false)
	})
})
