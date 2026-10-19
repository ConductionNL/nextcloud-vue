import { defaultFilterViews } from '../../src/utils/savedViewHelpers.js'
import { normalizeSavedViewMenu, syncSavedViewMenu, toggleSavedViewMenuEntry, withSavedViewMenu } from '../../src/utils/savedViewMenu.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's page config overrides: one generic merge per key, the slot
 * overlay, the menu badge's count source, and the badge on a menu entry.
 *
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
 */
import { applySavedViewOverrides, applySavedViewSlots, SAVED_VIEW_CONFIG_KEYS, SAVED_VIEW_OVERRIDE_KEYS, savedViewBadge, savedViewOverrides } from '../../src/utils/savedViewOverrides.js'
import RESTORE from '../fixtures/saved-view-overrides-restore.json'

const PAGE = {
	register: 'dossiq',
	schema: 'case',
	filter: { isFinalStatus: false },
	columns: ['title', 'status'],
	viewModes: ['table', 'cards'],
	quickFilters: [{ label: 'Mine', filter: { assignee: '@me' } }],
	sidePanel: [{ id: 'a' }],
	pageTabs: null,
	title: 'Cases',
}

describe('savedViewOverrides', () => {
	it('reads view.overrides, else query.overrides, and keeps only the allowed keys', () => {
		expect(savedViewOverrides({ overrides: { columns: ['a'], register: 'other' } })).toEqual({ columns: ['a'] })
		expect(savedViewOverrides({ query: { overrides: { viewMode: 'cards' } } })).toEqual({ viewMode: 'cards' })
		expect(savedViewOverrides({ query: { filters: {} } })).toBeNull()
		expect(savedViewOverrides({ overrides: { register: 'other' } })).toBeNull()
		expect(savedViewOverrides(null)).toBeNull()
	})

	it('allows the page config keys, their aliases, header, sortOption, slots and badge', () => {
		expect(SAVED_VIEW_OVERRIDE_KEYS).toEqual(expect.arrayContaining([...SAVED_VIEW_CONFIG_KEYS, 'tabs', 'views', 'header', 'sortOption', 'slots', 'badge']))
		expect(SAVED_VIEW_OVERRIDE_KEYS).not.toContain('register')
		expect(SAVED_VIEW_OVERRIDE_KEYS).not.toContain('schema')
	})

	it('keeps every key of the restore blocks dossiq applies verbatim', () => {
		for (const block of Object.values(RESTORE)) {
			expect(savedViewOverrides({ overrides: block })).toEqual(block)
		}
	})

	it('rides along on a default view in query.overrides, so a copy keeps it', () => {
		const [view] = defaultFilterViews([{ slug: 'my-work', name: 'My work', filters: {}, overrides: { viewMode: 'cards' } }], { register: 'dossiq', schema: 'case' })
		expect(view.query.overrides).toEqual({ viewMode: 'cards' })
		expect(savedViewOverrides(view)).toEqual({ viewMode: 'cards' })
	})
})

describe('applySavedViewOverrides, one key at a time', () => {
	const apply = (overrides) => applySavedViewOverrides(PAGE, overrides)

	it('returns the page config itself without overrides', () => {
		expect(applySavedViewOverrides(PAGE, null)).toBe(PAGE)
	})

	it('columns', () => {
		expect(apply({ columns: ['title', 'deadline'] }).columns).toEqual(['title', 'deadline'])
	})

	it('cardLayout, cardFields, cardComponent and listConfig', () => {
		const out = apply({ cardLayout: { title: 'title' }, cardFields: ['title'], cardComponent: 'CaseCard', listConfig: { titleField: 'title' } })
		expect(out).toMatchObject({ cardLayout: { title: 'title' }, cardFields: ['title'], cardComponent: 'CaseCard', listConfig: { titleField: 'title' } })
	})

	it('viewModes and the viewMode it opens in, or views as their alias', () => {
		expect(apply({ viewModes: ['cards', 'table'], viewMode: 'cards' })).toMatchObject({ viewModes: ['cards', 'table'], viewMode: 'cards' })
		expect(apply({ views: ['cards', 'map'] }).viewModes).toEqual(['cards', 'map'])
	})

	it('statRow, afterList, countText, footerNote, emptyText and headerButtons', () => {
		const out = apply({ statRow: [{ id: 's' }], afterList: [{ id: 'a' }], countText: '{shown} of {total}', footerNote: 'f', emptyText: 'e', headerButtons: [{ action: 'add' }] })
		expect(out).toMatchObject({ statRow: [{ id: 's' }], afterList: [{ id: 'a' }], countText: '{shown} of {total}', footerNote: 'f', emptyText: 'e', headerButtons: [{ action: 'add' }] })
	})

	it('quickFiltersFrom with its placement and the number visible', () => {
		const from = { field: 'caseType', register: 'dossiq', schema: 'caseType', labelField: 'title' }
		expect(apply({ quickFiltersFrom: from, quickFilterPlacement: 'toolbar', quickFilterMaxVisible: 4 })).toMatchObject({ quickFiltersFrom: from, quickFilterPlacement: 'toolbar', quickFilterMaxVisible: 4 })
	})

	it('folderSidebar null hides the folder sidebar; sidebar, row click and the form keys pass', () => {
		const out = apply({ folderSidebar: null, sidebar: { enabled: true }, rowClickToView: true, showViewAction: false, actions: [], includeFields: ['title'], fieldOverrides: {}, defaultSort: [{ field: 'deadline', order: 'asc' }], addLabel: 'New', searchPlaceholder: 'Search' })
		expect(out.folderSidebar).toBeNull()
		expect(out).toMatchObject({ sidebar: { enabled: true }, rowClickToView: true, showViewAction: false, includeFields: ['title'], defaultSort: [{ field: 'deadline', order: 'asc' }], addLabel: 'New', searchPlaceholder: 'Search' })
	})

	it('quickFilters', () => {
		const chips = [{ label: 'Late', filter: { 'deadline[lt]': '@today' } }]
		expect(apply({ quickFilters: chips }).quickFilters).toBe(chips)
	})

	it('sidePanel', () => {
		expect(apply({ sidePanel: [{ id: 'workload' }] }).sidePanel).toEqual([{ id: 'workload' }])
	})

	it('title, showTitle, breadcrumb, notice and headerMeta, flat or grouped in header', () => {
		const flat = { title: 'My work', showTitle: true, breadcrumb: { label: 'Cases' }, notice: { text: 'Yours' }, headerMeta: '{total} open' }
		expect(apply(flat)).toMatchObject(flat)
		expect(apply({ header: flat })).toMatchObject(flat)
		expect(apply({ header: { title: 'Grouped' }, title: 'Flat' }).title).toBe('Flat')
	})

	it('pageTabs with countFrom, or tabs as their alias', () => {
		const tabs = [{ label: 'AVG-verzoeken', route: 'Cases', countFrom: { register: 'dossiq', schema: 'case' } }, { label: 'Datalekken', route: 'Breaches' }]
		expect(apply({ pageTabs: tabs }).pageTabs).toBe(tabs)
		expect(apply({ tabs }).pageTabs).toBe(tabs)
	})

	it('leaves every key the view does not carry, and never the register or schema', () => {
		const out = apply({ columns: ['x'], register: 'other' })
		expect(out.register).toBe('dossiq')
		expect(out.quickFilters).toBe(PAGE.quickFilters)
		expect(out.title).toBe('Cases')
	})

	it('slots lay a component over the page slot, and null takes it out', () => {
		const page = { 'below-header': 'CaseSearchRefusal', 'after-search': 'CaseTypeFieldFilters' }
		const out = applySavedViewSlots(page, { slots: { 'before-collection': 'WorkloadSummaryBar', 'below-header': null } })
		expect(out).toEqual({ 'after-search': 'CaseTypeFieldFilters', 'before-collection': 'WorkloadSummaryBar' })
		expect(applySavedViewSlots(page, null)).toEqual(page)
	})

	it('slots take a list of components, one of them as itself, an empty list empties the slot', () => {
		const out = applySavedViewSlots({ 'below-header': 'A' }, { slots: { 'below-header': ['B'], 'before-collection': ['C', 'D'], 'after-search': [] } })
		expect(out).toEqual({ 'below-header': 'B', 'before-collection': ['C', 'D'] })
	})
})

describe('savedViewBadge', () => {
	const own = { register: 'dossiq', schema: 'case', filter: { isFinalStatus: false, assignee: '@me' } }

	it('true, or count: true, counts the view\'s own list: the page filter with the view filters', () => {
		expect(savedViewBadge(true, PAGE, { assignee: '@me' })).toEqual({ count: own })
		expect(savedViewBadge({ count: true, counterVariant: 'attention' }, PAGE, { assignee: '@me' })).toEqual({ count: own, counterVariant: 'attention' })
		expect(savedViewBadge({ counterVariant: 'attention' }, PAGE, { assignee: '@me' })).toEqual({ count: own, counterVariant: 'attention' })
	})

	it('a count object may name its own register, schema and filter', () => {
		expect(savedViewBadge({ count: { schema: 'task', filter: { open: true } } }, PAGE, { assignee: '@me' })).toEqual({ count: { register: 'dossiq', schema: 'task', filter: { open: true } } })
	})

	it('gives none without a badge or a list to count', () => {
		expect(savedViewBadge(undefined, PAGE)).toBeNull()
		expect(savedViewBadge(true, {})).toBeNull()
		expect(savedViewBadge({ count: 5 }, PAGE)).toBeNull()
	})
})

describe('a badge on a "My views" menu entry', () => {
	const badge = { count: { register: 'dossiq', schema: 'case', filter: { assignee: '@me' } }, counterVariant: 'attention' }

	it('is kept on the stored entry and drawn as the entry count', () => {
		const entries = toggleSavedViewMenuEntry([], { id: 'default:my-work', page: 'Cases', name: 'My work', badge })
		expect(entries[0].badge).toEqual(badge)
		const item = withSavedViewMenu([], entries).find((i) => i.id === 'saved-view-default:my-work')
		expect(item.count).toEqual(badge.count)
		expect(item.counterVariant).toBe('attention')
	})

	it('drops a malformed badge', () => {
		expect(normalizeSavedViewMenu([{ id: '1', page: 'Cases', badge: { count: 'many' } }])[0].badge).toBeUndefined()
	})

	it('follows the view on sync, and goes when the view no longer asks for one', () => {
		const entries = [{ id: '1', page: 'Cases', name: 'Old' }]
		expect(syncSavedViewMenu(entries, 'Cases', [{ id: 1, name: 'New', menuBadge: badge }])[0]).toEqual({ id: '1', page: 'Cases', name: 'New', badge })
		expect(syncSavedViewMenu([{ ...entries[0], badge }], 'Cases', [{ id: 1, name: 'New', menuBadge: null }])[0].badge).toBeUndefined()
	})
})
