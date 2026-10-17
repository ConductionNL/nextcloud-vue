/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A query preset or a folder scope sets the list's presentation under the same
 * key names (index-scope-presentation): title, count line, add label, header
 * buttons, breadcrumb, meta, cards after the list. A scope wins over the page
 * config a preset produced. The query pairs that chose a preset show no
 * removable filter chip.
 *
 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-a-preset-or-a-scope-sets-the-list-s-presentation
 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-an-index-page-can-draw-widgets-after-its-list
 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-the-query-that-chose-a-preset-is-not-a-removable-filter
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { applyQueryPreset } from '../../src/utils/queryPresets.js'
import { resolveScopePresentation, SCOPE_PRESENTATION_KEYS } from '../../src/utils/scopeListLayout.js'

const Crumbs = { name: 'CnBreadcrumbs', props: ['crumbs'], template: '<nav class="crumbs">{{ crumbs.map((c) => c.label).join("|") }}</nav>' }
const Probe = { name: 'Probe', props: ['content', 'widgetId'], template: '<div class="probe">{{ widgetId }}</div>' }

const FOLDERS = [
	{
		id: 'klacht',
		name: 'Klachten',
		title: 'Klachten',
		countText: '{total} klachten',
		addLabel: 'Klacht registreren',
		breadcrumb: { label: 'Alle zaken', route: 'Cases' },
		headerMeta: 'Awb hoofdstuk 9',
		afterList: [{ id: 'per-onderwerp', type: 'probe', title: 'Klachten per onderwerp', content: {} }],
	},
	{ id: 'woo', name: 'Woo-verzoeken' },
]

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Alle zaken',
			schema: { title: 'Zaak', properties: { caseType: { title: 'Soort zaak' } } },
			objects: [{ id: 1 }, { id: 2 }],
			pagination: { page: 1, pages: 1, total: 7, limit: 20 },
			showTitle: true,
			addLabel: 'Zaak toevoegen',
			folderSidebar: { source: 'custom', filterField: 'caseType', folders: FOLDERS },
			...extra,
		},
		global: {
			provide: { cnLook: 'board', cnRegistry: { probe: Probe } },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnBreadcrumbs: Crumbs, CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true, CnFolderSidebar: true },
		},
	})
}

describe('scope presentation keys', () => {
	it('are the query preset keys without the list layout ones', () => {
		expect(SCOPE_PRESENTATION_KEYS).toEqual(expect.arrayContaining(['title', 'countText', 'quickFilters', 'addLabel', 'headerButtons', 'breadcrumb', 'headerMeta', 'afterList']))
		expect(SCOPE_PRESENTATION_KEYS).not.toContain('columns')
		expect(SCOPE_PRESENTATION_KEYS).not.toContain('defaultSort')
	})

	it('read the folder entry first, then the row x-index', () => {
		expect(resolveScopePresentation({ scope: { addLabel: 'A' }, row: { 'x-index': { addLabel: 'B', title: 'T' } } })).toEqual({ addLabel: 'A', title: 'T' })
		expect(resolveScopePresentation({})).toEqual({})
	})
})

describe('a query preset sets the new keys and fixes its query', () => {
	it('lays addLabel, headerButtons, breadcrumb, headerMeta and afterList over the config', () => {
		const preset = {
			match: { caseType: 'uuid-klacht' },
			addLabel: 'Klacht registreren',
			headerButtons: [{ action: 'add' }],
			breadcrumb: { label: 'Alle zaken', route: 'Cases' },
			headerMeta: 'Awb',
			afterList: [{ id: 'x', type: 'chart' }],
		}
		const out = applyQueryPreset({ register: 'r', queryPresets: [preset] }, preset)
		expect(out).toMatchObject({ register: 'r', addLabel: 'Klacht registreren', headerMeta: 'Awb', fixedFilters: { caseType: 'uuid-klacht' } })
		expect(out.breadcrumb).toEqual(preset.breadcrumb)
		expect(out.afterList).toEqual(preset.afterList)
		expect(out.queryPresets).toBeUndefined()
	})

	it('shows no removable chip for the query pair that chose the preset', () => {
		const w = mountPage({ folderSidebar: null, activeFilters: { caseType: 'organization', status: 'open' }, fixedFilters: { caseType: 'organization' } })
		expect(w.vm.activeFilterChips.map((c) => c.key)).toEqual(['status'])
	})

	it('still shows a chip for the same key with another value', () => {
		const w = mountPage({ folderSidebar: null, activeFilters: { caseType: 'resident' }, fixedFilters: { caseType: 'organization' } })
		expect(w.vm.activeFilterChips.map((c) => c.key)).toEqual(['caseType'])
	})
})

describe('a folder scope sets the presentation', () => {
	it('keeps the page values while no folder is selected', () => {
		const w = mountPage()
		expect(w.find('h1').text()).toBe('Alle zaken')
		expect(w.vm.resolvedAddLabel).toBe('Zaak toevoegen')
		expect(w.find('[data-testid="cn-index-page-after-list"]').exists()).toBe(false)
	})

	it('takes the scope title, count line, add label, breadcrumb, meta and cards', async () => {
		const w = mountPage()
		w.vm.onFolderSelect('klacht')
		await nextTick()
		expect(w.find('h1').text()).toBe('Klachten')
		expect(w.vm.headerDescription).toBe('7 klachten')
		expect(w.vm.resolvedAddLabel).toBe('Klacht registreren')
		expect(w.find('.crumbs').text()).toBe('Alle zaken|Klachten')
		expect(w.find('[data-testid="cn-header-trail-meta"]').text()).toBe('Awb hoofdstuk 9')
		const after = w.find('[data-testid="cn-index-page-after-list"]')
		expect(after.find('.probe').text()).toBe('per-onderwerp')
		expect(after.text()).toContain('Klachten per onderwerp')
	})

	it('wins over a value the page got from a preset', async () => {
		const w = mountPage({ addLabel: 'From a preset' })
		w.vm.onFolderSelect('klacht')
		await nextTick()
		expect(w.vm.resolvedAddLabel).toBe('Klacht registreren')
		w.vm.onFolderSelect('woo')
		await nextTick()
		expect(w.vm.resolvedAddLabel).toBe('From a preset')
	})
})

describe('afterList on the page', () => {
	it('draws the page cards after the list in order', () => {
		const w = mountPage({ folderSidebar: null, afterList: [{ id: 'a', type: 'probe' }, { id: 'b', type: 'probe' }] })
		expect(w.findAll('[data-testid="cn-index-page-after-list"] .probe').map((p) => p.text())).toEqual(['a', 'b'])
	})
})
