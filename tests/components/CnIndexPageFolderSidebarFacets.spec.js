/**
 * CnIndexPage feeds the folder sidebar the whole result set, not the page.
 *
 * `:objects="effectiveObjects"` is the current page, so a `field`-source
 * folder sidebar built from it alone lists only the categories that happen to
 * have a row on screen. The page already holds the facet the platform computed
 * over the whole query, so it hands that to the sidebar, and tells it when the
 * rows it also passes are only part of the set.
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const CnFolderSidebarStub = {
	name: 'CnFolderSidebar',
	template: '<div class="cn-folder-sidebar-stub" />',
	props: ['folders', 'source', 'selectedId', 'objects', 'groupBy', 'facetValues', 'partial'],
}

// Page one of a longer list: only Bezwaar rows are loaded.
const objects = [
	{ id: 'a', title: 'Alpha', category: 'Bezwaar' },
	{ id: 'b', title: 'Beta', category: 'Bezwaar' },
]

const facets = {
	category: {
		values: [
			{ value: 'Bezwaar', count: 2, label: 'Bezwaar' },
			{ value: 'Vergunningen', count: 12, label: 'Vergunningen' },
		],
	},
}

/**
 * Mount the index page with a field-source folder sidebar.
 *
 * @param {object} extra Extra props to merge in
 * @return {object} The CnFolderSidebar stub component
 */
function folderSidebarOf(extra = {}) {
	const wrapper = shallowMount(CnIndexPage, {
		propsData: {
			objects,
			schema: { title: 'Case type', properties: {} },
			folderSidebar: { source: 'field', field: 'category', filterField: 'category' },
			...extra,
		},
		stubs: { CnFolderSidebar: CnFolderSidebarStub },
	})
	return wrapper.findComponent({ name: 'CnFolderSidebar' })
}

describe('CnIndexPage folder sidebar over a paged list', () => {
	it('hands the folder sidebar the facet for the grouping field', () => {
		const sidebar = folderSidebarOf({ sidebar: { enabled: true, facets } })
		expect(sidebar.props('facetValues')).toEqual(facets.category.values)
	})

	it('passes no facet values when the grouping field has no facet', () => {
		const sidebar = folderSidebarOf({
			sidebar: { enabled: true, facets: { status: { values: [{ value: 'open', count: 1 }] } } },
		})
		expect(sidebar.props('facetValues')).toEqual([])
	})

	it('tells the sidebar the rows are partial when more lie beyond the page', () => {
		const sidebar = folderSidebarOf({ pagination: { total: 40, page: 1, pages: 20, limit: 2 } })
		expect(sidebar.props('partial')).toBe(true)
	})

	it('is not partial when the page holds the whole result set', () => {
		const sidebar = folderSidebarOf({ pagination: { total: 2, page: 1, pages: 1, limit: 20 } })
		expect(sidebar.props('partial')).toBe(false)
	})

	it('is not partial when a facet supplies the whole set anyway', () => {
		const sidebar = folderSidebarOf({
			sidebar: { enabled: true, facets },
			pagination: { total: 40, page: 1, pages: 20, limit: 2 },
		})
		expect(sidebar.props('partial')).toBe(false)
	})
})
