/**
 * The `showAdd` contract on CnIndexPage — both directions, pinned.
 *
 * WHY THIS EXISTS
 * ---------------
 * procest#779 held the fleet pin at `2.2.0-vue3.7` on the theory that
 * `2.2.0-vue3.9` had made a previously truthy-by-omission `showAdd` evaluate
 * strictly, so a consumer that never passes the prop lost its Add control.
 *
 * That theory was wrong — the two published artifacts are byte-identical in
 * every expression that gates the button — but the contract it assumed is real
 * and load-bearing, and nothing pinned it. procest mounts CnIndexPage without
 * `showAdd` at all, so the default IS its Add control.
 *
 * The two halves pull against each other, which is why both are asserted here:
 *
 *   - OMITTED must render the button. A consumer that never mentions the prop
 *     gets an Add control. This is what procest depends on.
 *   - EXPLICIT `false` / `0` / `null` must suppress it. Vue only substitutes a
 *     prop default for `undefined`, so these reach the component as themselves
 *     and must stay falsy. Making omission truthy by widening the check — e.g.
 *     `showAdd !== false`, or defaulting on any nullish value — would silently
 *     resurrect the Add button for every consumer that deliberately turned it
 *     off, which is the failure mode `2701fc0` exists to prevent for token
 *     values.
 *
 * A fix that satisfies only the first half is a revert wearing a fix's clothes.
 *
 * Asserted on the BUTTON itself (`data-testid="cn-cta-primary"`, and its
 * rendered label), never on the actions bar that contains it — the reported
 * symptom was a control absent from the DOM while its container rendered fine.
 */

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

// Mounted the way procest's CaseTypeList does: schema + objects + loading +
// selectable, an `@add` listener, and NO `showAdd`.
const procestLikeProps = {
	title: 'Case Types',
	description: 'Configure case types',
	schema: { title: 'Case Type', properties: { title: { type: 'string' } } },
	objects: [{ id: 'ct-1', title: 'Vergunning' }],
	loading: false,
	selectable: true,
}

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true,
	NcEmptyContent: true,
}

function mountIndex(extraProps = {}) {
	return mount(CnIndexPage, {
		props: { ...procestLikeProps, ...extraProps },
		global: {
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
	})
}

/**
 * The primary Add control, found the way a user finds it — a button carrying
 * the Add label — not by the prop under test.
 *
 * @param {object} wrapper Mounted CnIndexPage.
 * @return {object} The VTU wrapper for the Add button (may not exist).
 */
const addButton = (wrapper) => wrapper.find('[data-testid="cn-cta-primary"]')

describe('CnIndexPage showAdd contract', () => {
	it('OMITTED: renders the Add control (procest mounts it this way)', () => {
		const wrapper = mountIndex()
		const btn = addButton(wrapper)

		expect(btn.exists()).toBe(true)
		// The label the e2e actually matches: "Add <schema.title>", falling back
		// to "Add Item" when the schema has no title.
		expect(btn.text()).toContain('Add Case Type')
	})

	it('OMITTED with no schema title: still renders, labelled "Add Item"', () => {
		const wrapper = mountIndex({ schema: { properties: {} } })
		const btn = addButton(wrapper)

		expect(btn.exists()).toBe(true)
		expect(btn.text()).toContain('Add Item')
	})

	// The other half. Each of these reaches the component as itself — Vue
	// substitutes a prop default only for `undefined` — and each must stay
	// falsy. If one of these ever starts rendering the button, a consumer that
	// deliberately hid it has had it silently restored.
	it.each([
		['false', false],
		['0', 0],
		['null', null],
	])('EXPLICIT %s: suppresses the Add control', (_label, value) => {
		const wrapper = mountIndex({ showAdd: value })

		expect(addButton(wrapper).exists()).toBe(false)
	})

	// Control: proves the two cases above are distinguishable by this selector
	// at all. Without it, a selector that never matched anything would satisfy
	// every suppression assertion while proving nothing.
	it('CONTROL: the same selector finds the button when showAdd is explicitly true', () => {
		expect(addButton(mountIndex({ showAdd: true })).exists()).toBe(true)
	})
})
