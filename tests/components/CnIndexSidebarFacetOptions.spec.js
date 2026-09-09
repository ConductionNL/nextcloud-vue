/**
 * What a faceted filter select is actually handed to render.
 *
 * Two rules are pinned here:
 *  - a bucket with no count renders no count, because `(0)` is a claim about
 *    the data that nothing in the response supports;
 *  - a bucket that carries a label renders the label, so a facet over a
 *    reference names its targets instead of listing raw uuids.
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexSidebar = require('../../src/components/CnIndexSidebar/CnIndexSidebar.vue').default
const CnFacetSidebar = require('../../src/components/CnFacetSidebar/CnFacetSidebar.vue').default

const TEAM_ALPHA = '9d3f2b1a-4c5e-4a71-b8d2-1e6f0a7c3b45'

const schema = {
	properties: {
		team: { type: 'string', title: 'Team', facetable: true },
	},
}

/**
 * Read the options bound to the first filter select.
 *
 * @param {object} component The sidebar component under test
 * @param {object} facetData Facet data as the store normalises it
 * @return {Array} The option list the select renders
 */
function optionsFor(component, facetData) {
	const wrapper = shallowMount(component, {
		propsData: { schema, facetData, filters: [{ key: 'team', label: 'Team', type: 'select' }] },
	})
	const select = wrapper.findAllComponents({ name: 'NcSelect' })
		.find((s) => s.props('inputLabel') === 'Team')
	return select ? select.props('options') : wrapper.vm.getFilterOptions({ key: 'team' })
}

describe.each([
	['CnIndexSidebar', CnIndexSidebar],
	['CnFacetSidebar', CnFacetSidebar],
])('%s facet filter options', (name, component) => {
	it('names a reference facet by its label and shows the real count', () => {
		expect(optionsFor(component, {
			team: { values: [{ value: TEAM_ALPHA, count: 12, label: 'Team Alpha' }] },
		})).toEqual([{ id: TEAM_ALPHA, label: 'Team Alpha (12)' }])
	})

	it('renders no count at all when the bucket has none', () => {
		expect(optionsFor(component, {
			team: { values: [{ value: TEAM_ALPHA, label: 'Team Alpha' }] },
		})).toEqual([{ id: TEAM_ALPHA, label: 'Team Alpha' }])
	})

	it('renders a genuine zero', () => {
		expect(optionsFor(component, {
			team: { values: [{ value: TEAM_ALPHA, count: 0, label: 'Team Alpha' }] },
		})).toEqual([{ id: TEAM_ALPHA, label: 'Team Alpha (0)' }])
	})

	it('falls back to the raw value when the bucket carries no label', () => {
		expect(optionsFor(component, {
			team: { values: [{ value: 'open', count: 4 }] },
		})).toEqual([{ id: 'open', label: 'open (4)' }])
	})
})
