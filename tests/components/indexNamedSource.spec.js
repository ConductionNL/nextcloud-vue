/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * NAMED INDEX SOURCES.
 *
 * The point of this change is that a list which is not an OpenRegister object
 * no longer needs its own page component. What could go wrong quietly is the
 * precedence: a page that names a source AND carries register/schema must not
 * fire an object fetch whose rows it then discards, and must not render the
 * object list while the manifest asked for flows. Both of those produce a
 * plausible table of the WRONG things rather than an error.
 */
describe('resolveIndexSource', () => {
	it('resolves a registered source', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const source = resolveIndexSource('flows')

		expect(source).toBeTruthy()
		expect(typeof source.load).toBe('function')
		expect(typeof source.rows).toBe('function')
		expect(typeof source.loading).toBe('function')
		expect(source.columns.map((c) => c.key)).toContain('name')
	})

	/**
	 * An unknown name must WARN and degrade, not throw and not go quiet.
	 *
	 * Silence here would render an empty index that is indistinguishable from a
	 * source with genuinely no rows — the reader has no way to tell a typo from
	 * an empty list.
	 */
	it('warns and returns null for an unknown source rather than throwing', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const source = resolveIndexSource('flowz')

		expect(source).toBeNull()
		expect(warn).toHaveBeenCalled()
		expect(String(warn.mock.calls[0][0])).toContain('flowz')
		warn.mockRestore()
	})

	it('returns null for an absent source without warning', async () => {
		const { resolveIndexSource } = await import('../../src/composables/indexSources.js')
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

		expect(resolveIndexSource('')).toBeNull()
		expect(resolveIndexSource(undefined)).toBeNull()
		// Not naming a source is the ordinary case, not a mistake.
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('self-fetch precedence', () => {
	/**
	 * THE ONE THAT MATTERS: a named source suppresses the object fetch.
	 *
	 * Without this the page issues an OpenRegister request, succeeds, and then
	 * throws the rows away — so a manifest that names both silently disagrees
	 * with itself and nothing reports it.
	 */
	it('does not self-fetch when a source is named', async () => {
		const { useSelfFetchList } = await import('../../src/components/CnIndexPage/useSelfFetchList.js')

		const withSource = useSelfFetchList(
			{ register: 'dossiq', schema: 'case', entitySource: 'flows', quickFilters: null },
			null,
			() => null,
		)

		expect(withSource.isSelfFetch).toBe(false)
	})

	it('still self-fetches when register and schema are named alone', async () => {
		const { useSelfFetchList } = await import('../../src/components/CnIndexPage/useSelfFetchList.js')

		const withoutSource = useSelfFetchList(
			{ register: 'dossiq', schema: 'case', entitySource: '', quickFilters: null },
			null,
			() => null,
		)

		expect(withoutSource.isSelfFetch).toBe(true)
	})
})

describe('a named source supplies its columns to the table', () => {
	/**
	 * THE GAP THIS CLOSES. The adapter advertised `columns`, and nothing read
	 * them. An `entitySource` page with no explicit `columns` fell through to
	 * `governedColumns`, which derives from a SCHEMA — and a named source has
	 * none. The table rendered its rows with no columns at all.
	 *
	 * That failure is invisible in the worst way: a columnless table reads as
	 * an empty list, so the page looks like it is working and simply has no
	 * data. The original spec asserted the source EXPOSES columns, which was
	 * true throughout and said nothing about whether the page used them.
	 *
	 * These call the component's OWN computed rather than a copy of its logic.
	 * A test that restates the implementation passes whether or not the
	 * component was ever wired, which is the mistake that let this ship.
	 */
	const tableColumns = (ctx) => {
		const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
		return CnIndexPage.computed.tableColumns.call({
			register: null,
			effectiveVisibleColumns: null,
			...ctx,
		})
	}

	it('falls back to the source columns when the manifest sets none', () => {
		const { indexSources } = require('../../src/composables/indexSources.js')
		const source = indexSources.flows()

		const cols = tableColumns({
			columns: [], isNamedSource: true, namedSource: source,
		})

		expect(cols.length).toBeGreaterThan(0)
		expect(cols.map((c) => c.key)).toContain('name')
	})

	it('lets an explicit manifest column list win over the source', () => {
		const { indexSources } = require('../../src/composables/indexSources.js')
		const mine = [{ key: 'app', label: 'App' }]

		const cols = tableColumns({
			columns: mine, isNamedSource: true, namedSource: indexSources.flows(),
		})

		// openregister's cross-app flow list needs an `app` column the shared
		// default does not carry; overriding has to remain possible or that
		// surface loses information when it migrates.
		expect(cols).toEqual(mine)
	})

	it('is empty for an ordinary index with neither columns nor a source', () => {
		expect(tableColumns({ columns: [], isNamedSource: false, namedSource: null })).toEqual([])
	})
})

describe('a named source supplies its create and navigation actions', () => {
	/**
	 * THE GAP THIS CLOSES, and it is the same one twice. #810 wired the
	 * source's `columns` and stopped there, leaving `addLabel` and the routes
	 * defined-and-never-read. Two apps' E2E caught it in the same way: after
	 * migrating their flow list off a custom page, `getByRole('button', {name:
	 * 'New flow'})` found nothing.
	 *
	 * A missing create button is not a crash. The list still renders, so the
	 * page looks finished and is simply unusable — which is why the adapter
	 * advertising a field is worth nothing until something reads it.
	 */
	const CnIndexPage = () => require('../../src/components/CnIndexPage/CnIndexPage.vue').default
	const flows = () => require('../../src/composables/indexSources.js').indexSources.flows()

	it('labels the create button from the source', () => {
		const label = CnIndexPage().computed.resolvedAddLabel.call({
			addLabel: '',
			cnTranslate: (s) => s,
			isNamedSource: true,
			namedSource: flows(),
			effectiveSchema: null,
		})
		expect(label).toBe('New flow')
	})

	it('creates by navigating to the editor, not by opening the object form dialog', () => {
		const pushed = []
		CnIndexPage().methods.onAddClick.call({
			$: { vnode: { props: {} } },
			isNamedSource: true,
			namedSource: flows(),
			$router: { push: (r) => pushed.push(r) },
			showFormDialog: true,
			$emit: () => {},
		})
		// The form dialog builds an OpenRegister object from a schema. A flow is
		// not one, so reaching it here would be the regression.
		expect(pushed).toEqual(['/flows/new'])
	})

	it('opens a clicked row in the source detail route', () => {
		const pushed = []
		CnIndexPage().methods.onRowClick.call({
			selectable: false,
			rowClickToView: true,
			isNamedSource: true,
			namedSource: flows(),
			$router: { push: (r) => pushed.push(r) },
			$emit: () => {},
		})
		expect(pushed).toEqual([])

		CnIndexPage().methods.onRowClick.call({
			selectable: false,
			rowClickToView: true,
			isNamedSource: true,
			namedSource: flows(),
			$router: { push: (r) => pushed.push(r) },
			$emit: () => {},
		}, { id: 'abc' })
		expect(pushed).toEqual(['/flows/abc'])
	})

	it('leaves an explicit @add listener in charge', () => {
		const pushed = []
		let emitted = null
		CnIndexPage().methods.onAddClick.call({
			$: { vnode: { props: { onAdd: () => {} } } },
			isNamedSource: true,
			namedSource: flows(),
			$router: { push: (r) => pushed.push(r) },
			showFormDialog: true,
			$emit: (e) => { emitted = e },
		})
		expect(emitted).toBe('add')
		expect(pushed).toEqual([])
	})
})
