import { mount } from '@vue/test-utils'
import CnSearchPage from '@/components/CnSearchPage/CnSearchPage.vue'

const facets = [
	{ key: 'schema', label: 'Schema', multiple: true, options: [
		{ value: 'article', label: 'Article', count: 7 },
		{ value: 'page', label: 'Page', count: 3 },
	] },
	{ key: 'status', label: 'Status', multiple: false, options: [
		{ value: 'draft', label: 'Draft' },
		{ value: 'published', label: 'Published' },
	] },
]
const results = [
	{ id: '1', title: 'Hello world', snippet: 'A short snippet …', schema: 'article' },
	{ id: '2', title: 'About us', schema: 'page', subtitle: '/about' },
]

describe('CnSearchPage', () => {
	it('renders the query input + submit', () => {
		const wrapper = mount(CnSearchPage)
		expect(wrapper.find('input[type="search"]').exists()).toBe(true)
		expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
	})

	it('shows the idle state before any search has run', () => {
		const wrapper = mount(CnSearchPage)
		expect(wrapper.find('.cn-search-page__idle').exists()).toBe(true)
	})

	it('emits search on submit with the query + facets', async () => {
		const wrapper = mount(CnSearchPage, {
			propsData: { activeFacets: { schema: ['article'] } },
		})
		wrapper.vm.localQuery = 'foo'
		wrapper.vm.onQuerySubmit()
		expect(wrapper.emitted('search')[0][0]).toMatchObject({
			query: 'foo',
			facets: { schema: ['article'] },
		})
	})

	it('emits query-change + update:query on input', () => {
		const wrapper = mount(CnSearchPage)
		wrapper.vm.localQuery = 'q'
		wrapper.vm.onQueryInput()
		expect(wrapper.emitted('query-change')[0][0]).toBe('q')
		expect(wrapper.emitted('update:query')[0][0]).toBe('q')
	})

	it('renders facets when provided', () => {
		const wrapper = mount(CnSearchPage, { propsData: { facets } })
		expect(wrapper.find('[data-testid="cn-search-page-facets"]').exists()).toBe(true)
		expect(wrapper.findAll('input[type="checkbox"]').length).toBe(2) // multiple=true
		expect(wrapper.findAll('input[type="radio"]').length).toBe(2) // multiple=false
	})

	it('toggleFacet multi adds + removes values', () => {
		const wrapper = mount(CnSearchPage, { propsData: { facets, activeFacets: {} } })
		wrapper.vm.toggleFacet('schema', 'article', true, true)
		expect(wrapper.emitted('facets-change')[0][0]).toEqual({ schema: ['article'] })
	})

	it('toggleFacet single sets the array to a single value', () => {
		const wrapper = mount(CnSearchPage, { propsData: { facets, activeFacets: {} } })
		wrapper.vm.toggleFacet('status', 'draft', true, false)
		expect(wrapper.emitted('facets-change')[0][0]).toEqual({ status: ['draft'] })
	})

	it('isFacetActive reports active state correctly', () => {
		const wrapper = mount(CnSearchPage, {
			propsData: { facets, activeFacets: { schema: ['article'] } },
		})
		expect(wrapper.vm.isFacetActive('schema', 'article')).toBe(true)
		expect(wrapper.vm.isFacetActive('schema', 'page')).toBe(false)
	})

	it('clearFacets emits empty map', () => {
		const wrapper = mount(CnSearchPage, {
			propsData: { facets, activeFacets: { schema: ['article'] } },
		})
		wrapper.vm.clearFacets()
		expect(wrapper.emitted('facets-change').pop()[0]).toEqual({})
	})

	it('hasActiveFacets is true when any active facet exists', () => {
		const wrapper = mount(CnSearchPage, {
			propsData: { facets, activeFacets: { schema: ['article'] } },
		})
		expect(wrapper.vm.hasActiveFacets).toBe(true)
	})

	it('renders results in the list', () => {
		const wrapper = mount(CnSearchPage, { propsData: { results } })
		expect(wrapper.findAll('.cn-search-page__result').length).toBe(2)
		expect(wrapper.text()).toContain('Hello world')
		expect(wrapper.text()).toContain('article')
	})

	it('emits result-click on result-row click', async () => {
		const wrapper = mount(CnSearchPage, { propsData: { results } })
		await wrapper.findAll('.cn-search-page__result').at(0).trigger('click')
		expect(wrapper.emitted('result-click')[0][0]).toMatchObject({ id: '1' })
	})

	it('shows empty state after a search with no matches', async () => {
		const wrapper = mount(CnSearchPage, { propsData: { results: [] } })
		wrapper.vm.onQuerySubmit()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-search-page__empty').exists()).toBe(true)
	})

	it('shows loading state when loading=true', () => {
		const wrapper = mount(CnSearchPage, { propsData: { loading: true } })
		expect(wrapper.find('.cn-search-page__loading').exists()).toBe(true)
	})

	it('shows the "more" footer when totalCount > results.length', () => {
		const wrapper = mount(CnSearchPage, {
			propsData: { results, totalCount: 50 },
		})
		expect(wrapper.text()).toContain('Showing 2 of 50')
	})
})
