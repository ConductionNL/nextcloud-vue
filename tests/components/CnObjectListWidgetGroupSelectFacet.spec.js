/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the seams CnObjectListWidget grew so it can host dossiq's
 * Documents tab (openspec/changes/object-list-widget-grouping-select-facet):
 * `groupBy`, `selectable` + `bulkActions`, `sortable`, `facet`, and the
 * click-to-upload button that rides the existing `dropZone` action.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const lastParams = () => mockGet.mock.calls[mockGet.mock.calls.length - 1][1].params

function mountWidget(content = {}, provide = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'zaakinformatieobject', limit: 50, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true, CnRowActions: true },
		provide,
		mocks: { t: (_a, s) => s },
	})
}

describe('CnObjectListWidget — groupBy', () => {
	beforeEach(() => jest.clearAllMocks())

	it('buckets rows by the distinct groupBy value, in first-seen order', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					{ id: '1', informatieobjecttype: 'besluit' },
					{ id: '2', informatieobjecttype: 'aanvraag' },
					{ id: '3', informatieobjecttype: 'besluit' },
				],
				total: 3,
			},
		})
		const w = mountWidget({ groupBy: 'informatieobjecttype' })
		await flushPromises()

		expect(w.vm.isGrouped).toBe(true)
		expect(w.vm.groupedRows.map((g) => g.key)).toEqual(['besluit', 'aanvraag'])
		expect(w.vm.groupedRows[0].rows.map((r) => r.id)).toEqual(['1', '3'])
		expect(w.vm.groupedRows[1].rows.map((r) => r.id)).toEqual(['2'])
	})

	it('resolves the group label off an extend-inlined reference object by id, not its stringified form', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					{ id: '1', informatieobjecttype: { id: 't1', description: 'Besluit' } },
					{ id: '2', informatieobjecttype: { id: 't1', description: 'Besluit' } },
				],
				total: 2,
			},
		})
		const w = mountWidget({
			groupBy: 'informatieobjecttype',
			groupLabel: 'informatieobjecttype.description',
			extend: ['informatieobjecttype'],
		})
		await flushPromises()

		// MUTATION CHECK (red half): drop `.id` from the groupBy key resolution
		// (`String(rawKey ?? '')` on the raw object) and this collapses to one
		// bucket keyed "[object Object]" — asserting a SINGLE group here would
		// have passed either way, so the count is pinned too.
		expect(w.vm.groupedRows).toHaveLength(1)
		expect(w.vm.groupedRows[0].key).toBe('t1')
		expect(w.vm.groupedRows[0].label).toBe('Besluit')
		expect(w.vm.groupedRows[0].rows).toHaveLength(2)
	})

	it('does not group when groupBy is absent — the ungrouped path renders instead', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget()
		await flushPromises()

		expect(w.vm.isGrouped).toBe(false)
		expect(w.vm.groupedRows).toEqual([])
	})
})

describe('CnObjectListWidget — selectable + bulkActions', () => {
	beforeEach(() => jest.clearAllMocks())

	it('maps bulkActions onto the row-action shape, one handler per action', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({
			selectable: true,
			bulkActions: [{ label: 'Mark final', type: 'handler', handler: 'markFinal' }],
		})
		await flushPromises()

		expect(w.vm.mappedBulkActions).toHaveLength(1)
		expect(w.vm.mappedBulkActions[0].label).toBe('Mark final')
		expect(typeof w.vm.mappedBulkActions[0].handler).toBe('function')
	})

	it('renders no bulk bar until a row is selected', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({ selectable: true, bulkActions: [{ label: 'Mark final', type: 'handler', handler: 'x' }] })
		await flushPromises()

		expect(w.find('[data-testid="object-list-bulk-bar"]').exists()).toBe(false)

		w.vm.onSelect(['1'])
		await w.vm.$nextTick()

		expect(w.find('[data-testid="object-list-bulk-bar"]').exists()).toBe(true)
	})

	it('dispatches a bulk handler action with the selected ROW OBJECTS, then clears the selection', async () => {
		const cnDispatchAction = jest.fn()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'a' }, { id: '2', title: 'b' }], total: 2 } })
		const action = { label: 'Mark final', type: 'handler', handler: 'markFinal' }
		const w = mountWidget({ selectable: true, bulkActions: [action] }, { cnDispatchAction })
		await flushPromises()
		w.vm.onSelect(['1', '2'])

		w.vm.mappedBulkActions[0].handler()

		// MUTATION CHECK (red half): passing `this.selectedIds` (strings) instead
		// of `this.selectedRows` (objects) as the appended arg would still pass
		// a shallow `toHaveBeenCalled()` check — asserting the actual row shape
		// is what catches that.
		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({ args: [[{ id: '1', title: 'a' }, { id: '2', title: 'b' }]] }))
		expect(w.vm.selectedIds).toEqual([])
	})

	it('merges selectedIds into an open-modal bulk action props, mirroring how a drop hands over props.files', async () => {
		const cnDispatchAction = jest.fn()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const action = { label: 'Change confidentiality', type: 'open-modal', target: 'ConfidentialityDialog', props: { level: 'internal' } }
		const w = mountWidget({ selectable: true, bulkActions: [action] }, { cnDispatchAction })
		await flushPromises()
		w.vm.onSelect(['1'])

		w.vm.mappedBulkActions[0].handler()

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({
			target: 'ConfidentialityDialog',
			props: { level: 'internal', selectedIds: ['1'] },
		}))
	})

	it('leaves selection untouched (empty array) when selectable is not declared', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.selectedIds).toEqual([])
	})
})

describe('CnObjectListWidget — sortable (interactive)', () => {
	beforeEach(() => jest.clearAllMocks())

	it('marks every column sortable when content.sortable is true, without overriding an explicit false', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'a', status: 'draft' }], total: 1 } })
		const w = mountWidget({
			sortable: true,
			columns: [{ key: 'title' }, { key: 'status', sortable: false }],
		})
		await flushPromises()

		const byKey = Object.fromEntries(w.vm.resolvedColumns.map((c) => [c.key, c.sortable]))
		expect(byKey.title).toBe(true)
		expect(byKey.status).toBe(false)
	})

	it('marks only the listed keys sortable when content.sortable is an array', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'a', status: 'draft' }], total: 1 } })
		const w = mountWidget({ sortable: ['title'], columns: [{ key: 'title' }, { key: 'status' }] })
		await flushPromises()

		const byKey = Object.fromEntries(w.vm.resolvedColumns.map((c) => [c.key, c.sortable]))
		expect(byKey.title).toBe(true)
		expect(byKey.status).toBe(false)
	})

	it('re-fetches with the new _order when a header click reports a sort change', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({ sortable: true, columns: [{ key: 'title' }], sort: { field: 'creatiedatum', dir: 'desc' } })
		await flushPromises()
		mockGet.mockClear()

		w.vm.onSort({ key: 'title', order: 'asc' })
		await flushPromises()

		// MUTATION CHECK (red half): reading `c.sort` (the original prop)
		// instead of `this.localSort` in fetchRows would keep sending
		// `creatiedatum desc` forever — this assertion is exactly what that
		// mutation breaks.
		expect(lastParams()['_order[title]']).toBe('asc')
		expect(lastParams()).not.toHaveProperty('_order[creatiedatum]')
	})

	it('clears the sort (goes unordered) on a third click reporting key: null', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({ sortable: true, columns: [{ key: 'title' }] })
		await flushPromises()
		w.vm.onSort({ key: 'title', order: 'asc' })
		await flushPromises()
		mockGet.mockClear()

		w.vm.onSort({ key: null, order: null })
		await flushPromises()

		expect(lastParams()).not.toHaveProperty('_order[title]')
	})
})

describe('CnObjectListWidget — facet', () => {
	beforeEach(() => jest.clearAllMocks())

	it('lists distinct values across an array-valued facet field, sorted', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					{ id: '1', keywords: ['bezwaar', 'spoed'] },
					{ id: '2', keywords: ['bezwaar'] },
					{ id: '3', keywords: [] },
				],
				total: 3,
			},
		})
		const w = mountWidget({ facet: { field: 'keywords', label: 'Keywords' } })
		await flushPromises()

		expect(w.vm.facetOptions).toEqual(['bezwaar', 'spoed'])
	})

	it('narrows facetedRows to rows carrying a selected value; no selection means no narrowing', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					// Row 1 carries BOTH keywords, so an `every` (must match all
					// selected values) and a `some` (must match at least one)
					// intersection check disagree on it once only "spoed" is
					// selected — that disagreement is what the mutation check
					// below exercises.
					{ id: '1', keywords: ['bezwaar', 'spoed'] },
					{ id: '2', keywords: ['spoed'] },
					{ id: '3', keywords: ['bezwaar'] },
				],
				total: 3,
			},
		})
		const w = mountWidget({ facet: { field: 'keywords' } })
		await flushPromises()
		expect(w.vm.facetedRows.map((r) => r.id)).toEqual(['1', '2', '3'])

		w.vm.toggleFacetValue('spoed')
		await w.vm.$nextTick()

		// MUTATION CHECK (red half): swapping this `some` for an `every` still
		// keeps row 1 (both its keywords are selected... trivially, since only
		// one is) but drops nothing here; the real bar is the next assertion.
		expect(w.vm.facetedRows.map((r) => r.id)).toEqual(['1', '2'])

		w.vm.clearFacet()
		await w.vm.$nextTick()
		expect(w.vm.facetedRows.map((r) => r.id)).toEqual(['1', '2', '3'])
	})

	it('a row satisfies the facet on ANY selected value, not all of them (some, not every)', async () => {
		mockGet.mockResolvedValue({
			data: {
				results: [
					// Only "bezwaar" is selected below. Row 1 carries an EXTRA
					// keyword ("spoed") the filter never selected — an `every`
					// check would require the row's keywords to be a subset of
					// the selection and reject it; `some` (the correct
					// intersection semantics) keeps it.
					{ id: '1', keywords: ['bezwaar', 'spoed'] },
					{ id: '2', keywords: ['spoed'] },
				],
				total: 2,
			},
		})
		const w = mountWidget({ facet: { field: 'keywords' } })
		await flushPromises()

		w.vm.toggleFacetValue('bezwaar')
		await w.vm.$nextTick()

		expect(w.vm.facetedRows.map((r) => r.id)).toEqual(['1'])
	})

	it('shows the "no items match this filter" state when the facet selection matches nothing, distinct from the no-rows-at-all state', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', keywords: ['bezwaar'] }], total: 1 } })
		const w = mountWidget({ facet: { field: 'keywords' } })
		await flushPromises()
		expect(w.vm.showNoFacetMatchState).toBe(false)

		w.vm.toggleFacetValue('nonexistent')
		await w.vm.$nextTick()

		expect(w.vm.showNoFacetMatchState).toBe(true)
		expect(w.vm.showingEmptyState).toBe(false)
	})

	it('renders no facet control when content.facet is absent', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', keywords: ['bezwaar'] }], total: 1 } })
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.facetOptions).toEqual([])
		expect(w.find('[data-testid="object-list-facet"]').exists()).toBe(false)
	})
})

describe('CnObjectListWidget — upload button (rides dropZone)', () => {
	beforeEach(() => jest.clearAllMocks())

	it('shows no upload button without a dropZone declared', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.showUploadButton).toBe(false)
	})

	it('shows the upload button when dropZone is declared, and hides it when content.upload is false', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const dropZone = { type: 'handler', handler: 'upload' }
		const shown = mountWidget({ dropZone })
		await flushPromises()
		expect(shown.vm.showUploadButton).toBe(true)

		const hidden = mountWidget({ dropZone, upload: false })
		await flushPromises()
		expect(hidden.vm.showUploadButton).toBe(false)
	})

	it('dispatches the dropZone action with the picked files, same shape as a drop', async () => {
		const cnDispatchAction = jest.fn()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } }, { cnDispatchAction })
		await flushPromises()
		const files = [new File(['a'], 'a.pdf')]

		w.vm.onUploadFilesSelected({ target: { files, value: 'C:\\fakepath\\a.pdf' } })

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({ args: [files] }))
		expect(w.emitted('files-dropped')[0]).toEqual([files])
	})

	it('does nothing when the file picker is dismissed with no files chosen', async () => {
		const cnDispatchAction = jest.fn()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } }, { cnDispatchAction })
		await flushPromises()

		w.vm.onUploadFilesSelected({ target: { files: [], value: '' } })

		expect(cnDispatchAction).not.toHaveBeenCalled()
		expect(w.emitted('files-dropped')).toBeUndefined()
	})
})
