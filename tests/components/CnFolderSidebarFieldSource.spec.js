/**
 * The `field` folder source, when the rows it is handed are only one page.
 *
 * `fieldTree` derives its folders from the distinct grouping values across
 * `objects`. On any list with more than one page that is a partial view: the
 * folders are incomplete, they change as the reader pages, their counts are
 * per page rather than totals, and a category whose rows all sit on a later
 * page cannot be reached at all.
 *
 * The platform already computes the complete answer. OpenRegister's facets
 * are calculated with the pagination parameters removed, so a facet over the
 * grouping field is exactly the distinct values and the true totals. Where one
 * is available it is the source of truth; where it is not, the component must
 * not present a page as though it were the whole set.
 */

const { shallowMount } = require('@vue/test-utils')
const CnFolderSidebar = require('../../src/components/CnFolderSidebar/CnFolderSidebar.vue').default

// One page of rows. Every row here is a Bezwaar; the Vergunningen rows exist
// but sit on a later page, which is the case that used to be unreachable.
const pageOne = [
	{ id: 'a', category: 'Bezwaar' },
	{ id: 'b', category: 'Bezwaar' },
]

// What OpenRegister answers for a facet over `category`, across the whole
// query rather than the page.
const categoryFacet = {
	values: [
		{ value: 'Bezwaar', count: 2, label: 'Bezwaar' },
		{ value: 'Vergunningen', count: 12, label: 'Vergunningen' },
		{ value: 'Handhaving', count: 7, label: 'Handhaving' },
	],
}

/**
 * Mount the sidebar on the `field` source.
 *
 * @param {object} props Props to merge over the field-source defaults
 * @return {object} The mounted wrapper
 */
function mountField(props = {}) {
	return shallowMount(CnFolderSidebar, {
		propsData: { source: 'field', groupBy: 'category', objects: pageOne, ...props },
	})
}

describe('CnFolderSidebar field source over a paged list', () => {
	it('builds its folders from the facet rather than the loaded page', () => {
		const tree = mountField({ facetValues: categoryFacet.values }).vm.normalizedTree
		expect(tree.map((f) => f.name)).toEqual(['Bezwaar', 'Vergunningen', 'Handhaving'])
	})

	it('reaches a category whose rows all sit on a later page', () => {
		const tree = mountField({ facetValues: categoryFacet.values }).vm.normalizedTree
		expect(tree.find((f) => f.id === 'Vergunningen')).toBeTruthy()
	})

	it('counts the whole result set, not the page', () => {
		const tree = mountField({ facetValues: categoryFacet.values }).vm.normalizedTree
		expect(tree.find((f) => f.id === 'Vergunningen').count).toBe(12)
		expect(tree.find((f) => f.id === 'Handhaving').count).toBe(7)
	})

	it('names a folder by the bucket label when the facet carries one', () => {
		const tree = mountField({
			facetValues: [{ value: 'ct-uuid-1', count: 4, label: 'Vergunningen' }],
		}).vm.normalizedTree
		expect(tree[0]).toMatchObject({ id: 'ct-uuid-1', name: 'Vergunningen', count: 4 })
	})

	it('still groups the rows when no facet is available and the page is the whole set', () => {
		const tree = mountField({ partial: false }).vm.normalizedTree
		expect(tree).toEqual([
			{ id: 'Bezwaar', name: 'Bezwaar', count: 2, children: [] },
		])
	})

	it('does not present a per-page count as a total when rows lie beyond the page', () => {
		const tree = mountField({ partial: true }).vm.normalizedTree
		expect(tree).toHaveLength(1)
		expect(tree[0].id).toBe('Bezwaar')
		// The folder is still offered, because it is real and reaching it is
		// better than hiding it. The count is not, because 2 is this page's
		// tally and would read as the total for the category.
		expect(tree[0].count).toBeUndefined()
	})

	it('marks itself partial in the DOM so the incompleteness is visible', () => {
		const wrapper = mountField({ partial: true })
		expect(wrapper.find('.cn-folder-sidebar__partial').exists()).toBe(true)
	})

	it('is not partial once a facet supplies the whole set', () => {
		const wrapper = mountField({ partial: true, facetValues: categoryFacet.values })
		expect(wrapper.find('.cn-folder-sidebar__partial').exists()).toBe(false)
	})
})
