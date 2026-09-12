/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the three seams CnObjectListWidget grew so a manifest can express
 * a document list on a case: `extend`, `rowActions` and `dropZone`.
 *
 * The one worth stating up front is `extend`. A dotted column key such as
 * `informatieobject.title` is read by CnDataTable as a PATH INTO THE ROW, and
 * the row holds a uuid string at `informatieobject` unless the fetch asked
 * OpenRegister to inline the referenced object. Six columns off one reference
 * therefore render as six copies of one uuid, with nothing failing and nothing
 * logged. `_extend` is what makes the path resolve, so the assertion that
 * matters is on the OUTGOING PARAMS, not on anything the component renders.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

// `mock`-prefixed so jest's hoisted factory may close over it.
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

/** The params of the most recent fetch. */
const lastParams = () => mockGet.mock.calls[mockGet.mock.calls.length - 1][1].params

function mountWidget(content = {}, provide = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'zaakinformatieobject', limit: 5, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true, CnRowActions: true },
		provide,
		mocks: { t: (_a, s) => s },
	})
}

/**
 * A drag event carrying the given files, shaped like the browser's.
 *
 * @param {Array<File>} files The files the drag carries.
 * @return {object} A drag-event stand-in with a spied preventDefault.
 */
function fileDragEvent(files = []) {
	return {
		preventDefault: jest.fn(),
		dataTransfer: { types: files.length > 0 ? ['Files'] : [], files },
	}
}

describe('CnObjectListWidget — extend', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
	})

	it('forwards content.extend as OpenRegister _extend', async () => {
		mountWidget({ extend: ['informatieobject'] })
		await flushPromises()
		expect(lastParams()._extend).toEqual(['informatieobject'])
	})

	it('sends no _extend at all when the key is absent', async () => {
		mountWidget()
		await flushPromises()
		expect(lastParams()).not.toHaveProperty('_extend')
	})

	it('sends no _extend for an empty or all-blank list, rather than an empty param', async () => {
		mountWidget({ extend: [] })
		await flushPromises()
		expect(lastParams()).not.toHaveProperty('_extend')

		mockGet.mockClear()
		mountWidget({ extend: ['', null, 7] })
		await flushPromises()
		expect(lastParams()).not.toHaveProperty('_extend')
	})

	it('keeps a dotted column key intact once the extended row carries the reference', async () => {
		mockGet.mockResolvedValue({
			data: { results: [{ id: '1', informatieobject: { title: 'Besluit', status: 'draft' } }], total: 1 },
		})
		const w = mountWidget({
			extend: ['informatieobject'],
			columns: [{ key: 'informatieobject.title', label: 'Title' }, { key: 'informatieobject.status', label: 'Status' }],
		})
		await flushPromises()
		expect(w.vm.resolvedColumns.map((c) => c.key))
			.toEqual(['informatieobject.title', 'informatieobject.status'])
	})

	it('falls back to the display name when the reference was NOT extended', async () => {
		// The row holds a uuid STRING at `informatieobject`, so no dotted column
		// resolves on any row and the existing all-columns-blank fallback fires.
		// Worth pinning: this is the visible symptom of a missing `extend`, and
		// it is a Name column rather than an error.
		mockGet.mockResolvedValue({
			data: { results: [{ id: '1', informatieobject: 'e5b0-uuid', name: 'row one' }], total: 1 },
		})
		const w = mountWidget({ columns: [{ key: 'informatieobject.title', label: 'Title' }] })
		await flushPromises()
		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['name'])
	})
})

describe('CnObjectListWidget — rowActions', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'a' }], total: 1 } })
	})

	it('renders no row-actions menu when none are declared', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.mappedRowActions).toEqual([])
	})

	it('maps a declared action onto the CnRowActions shape', async () => {
		const w = mountWidget({
			rowActions: [{ label: 'Versions', icon: 'History', type: 'open-modal', target: 'VersionHistoryPanel' }],
		})
		await flushPromises()
		const [mapped] = w.vm.mappedRowActions
		expect(mapped.label).toBe('Versions')
		expect(mapped.icon).toBe('History')
		expect(mapped.destructive).toBe(false)
		expect(typeof mapped.handler).toBe('function')
	})

	it('merges the clicked row onto an open-modal row action as props.row', async () => {
		// Without this, "Versions" or "Delete" on a row opens a modal that
		// cannot say WHICH row it was clicked on — action.props is otherwise
		// forwarded verbatim (no per-click information at all), same reason a
		// drop hands a modal props.files and a bulk action hands props.selectedIds.
		const cnDispatchAction = jest.fn()
		const action = { label: 'Versions', type: 'open-modal', target: 'VersionHistoryPanel', props: { a: 1 } }
		const row = { id: '1' }
		const w = mountWidget({ rowActions: [action] }, { cnDispatchAction })
		await flushPromises()

		w.vm.mappedRowActions[0].handler(row)

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({
			target: 'VersionHistoryPanel',
			props: { a: 1, row },
		}))
	})

	it('appends the row to a handler action so a registry function receives it', async () => {
		const cnDispatchAction = jest.fn()
		const w = mountWidget(
			{ rowActions: [{ label: 'Open', type: 'handler', handler: 'openThing', args: ['x'] }] },
			{ cnDispatchAction },
		)
		await flushPromises()
		const row = { id: '1' }

		w.vm.mappedRowActions[0].handler(row)

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({ args: ['x', row] }))
	})

	it('marks a destructive action so CnRowActions can colour it', async () => {
		const w = mountWidget({ rowActions: [{ label: 'Delete', destructive: true, type: 'handler', handler: 'del' }] })
		await flushPromises()
		expect(w.vm.mappedRowActions[0].destructive).toBe(true)
	})
})

describe('CnObjectListWidget — dropZone', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1' }], total: 1 } })
	})

	it('takes no part in a drag when no dropZone is declared', async () => {
		const w = mountWidget()
		await flushPromises()
		const ev = fileDragEvent([new File(['a'], 'a.pdf')])

		w.vm.onDragEnter(ev)

		expect(w.vm.dropping).toBe(false)
		expect(ev.preventDefault).not.toHaveBeenCalled()
	})

	it('paints the overlay while a file drag is over a drop-enabled widget', async () => {
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } })
		await flushPromises()

		w.vm.onDragEnter(fileDragEvent([new File(['a'], 'a.pdf')]))
		await w.vm.$nextTick()

		expect(w.vm.dropping).toBe(true)
		expect(w.find('.cn-object-list-widget__drop-overlay').exists()).toBe(true)
	})

	it('ignores a drag that carries no files', async () => {
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } })
		await flushPromises()

		w.vm.onDragEnter(fileDragEvent([]))

		expect(w.vm.dropping).toBe(false)
	})

	it('keeps the overlay up when the pointer crosses into a child element', async () => {
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } })
		await flushPromises()
		const file = [new File(['a'], 'a.pdf')]

		w.vm.onDragEnter(fileDragEvent(file)) // widget
		w.vm.onDragEnter(fileDragEvent(file)) // the table inside it
		w.vm.onDragLeave(fileDragEvent(file)) // leaving the widget for the table

		expect(w.vm.dropping).toBe(true)
	})

	it('hands the dropped files to the declared action and clears the overlay', async () => {
		const cnDispatchAction = jest.fn()
		const w = mountWidget(
			{ dropZone: { type: 'handler', handler: 'upload' } },
			{ cnDispatchAction },
		)
		await flushPromises()
		const files = [new File(['a'], 'a.pdf')]
		w.vm.onDragEnter(fileDragEvent(files))

		w.vm.onDrop(fileDragEvent(files))

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({ args: [files] }))
		expect(w.vm.dropping).toBe(false)
		expect(w.emitted('files-dropped')[0]).toEqual([files])
	})

	it('rides an open-modal drop through props.files, because a modal has no argument list', async () => {
		const cnDispatchAction = jest.fn()
		const w = mountWidget(
			{ dropZone: { type: 'open-modal', target: 'DocumentMetadataDialog', props: { caseId: 'c1' } } },
			{ cnDispatchAction },
		)
		await flushPromises()
		const files = [new File(['a'], 'a.pdf')]

		w.vm.onDrop(fileDragEvent(files))

		expect(cnDispatchAction).toHaveBeenCalledWith(expect.objectContaining({
			target: 'DocumentMetadataDialog',
			props: { caseId: 'c1', files },
		}))
	})

	it('lets a drop that is not files fall through to the browser, and dispatches nothing', async () => {
		// preventDefault on a non-file drop would swallow a text or link drop
		// the page might legitimately want, so the widget must not claim it.
		const cnDispatchAction = jest.fn()
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } }, { cnDispatchAction })
		await flushPromises()
		const ev = fileDragEvent([])

		w.vm.onDrop(ev)

		expect(cnDispatchAction).not.toHaveBeenCalled()
		expect(ev.preventDefault).not.toHaveBeenCalled()
	})

	it('claims a file drop so the browser does not navigate to the file', async () => {
		const w = mountWidget({ dropZone: { type: 'handler', handler: 'upload' } })
		await flushPromises()
		const ev = fileDragEvent([new File(['a'], 'a.pdf')])

		w.vm.onDrop(ev)

		expect(ev.preventDefault).toHaveBeenCalled()
	})
})
