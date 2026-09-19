/**
 * Tests for the declared state indicators CnDataTable renders on a row
 * (working-list-row-actions). Each one must carry a text alternative, so the
 * row is readable by someone who cannot tell the icons apart.
 */

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const COLUMNS = [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }]

const INDICATORS = [
	{ id: 'suspended', field: 'suspended', icon: 'PauseCircleOutline', text: 'Suspended', tooltip: 'This case is suspended' },
	{ id: 'extended', field: 'extended', icon: 'ClockPlusOutline', text: 'Term extended' },
	{ id: 'child', field: 'parentCase', icon: 'FileTreeOutline', text: 'Part of a parent case' },
	{ id: 'decided', field: 'decision', icon: 'GavelOutline', text: 'Decision filed' },
]

function mountTable(rows, props = {}) {
	return mount(CnDataTable, {
		propsData: { columns: COLUMNS, rows, rowKey: 'id', ...props },
		stubs: { CnIcon: { name: 'CnIcon', template: '<span class="cn-icon-stub" />', props: ['name', 'size'] } },
	})
}

describe('CnDataTable — declared state indicators', () => {
	it('renders no indicator strip when the page declares none', () => {
		const wrapper = mountTable([{ id: '1', title: 'Alpha', suspended: true }])
		expect(wrapper.find('[data-testid="cn-row-indicators"]').exists()).toBe(false)
	})

	it('renders one icon per declared indicator whose condition holds', () => {
		const wrapper = mountTable(
			[{ id: '1', title: 'Alpha', suspended: true, decision: 'granted' }],
			{ rowIndicators: INDICATORS },
		)
		expect(wrapper.find('[data-testid="cn-row-indicator-suspended"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-row-indicator-decided"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-row-indicator-extended"]').exists()).toBe(false)
	})

	it('gives every indicator a text alternative, so colour is never the only signal', () => {
		const wrapper = mountTable(
			[{ id: '1', title: 'Alpha', suspended: true, decision: 'granted' }],
			{ rowIndicators: INDICATORS },
		)
		const texts = wrapper.findAll('[data-testid="cn-row-indicators"] .hidden-visually').map((n) => n.text())
		expect(texts).toEqual(['Suspended', 'Decision filed'])
	})

	it('puts the tooltip on the indicator, falling back to its text', () => {
		const wrapper = mountTable(
			[{ id: '1', title: 'Alpha', suspended: true, extended: true }],
			{ rowIndicators: INDICATORS },
		)
		expect(wrapper.find('[data-testid="cn-row-indicator-suspended"]').attributes('title')).toBe('This case is suspended')
		expect(wrapper.find('[data-testid="cn-row-indicator-extended"]').attributes('title')).toBe('Term extended')
	})

	it('stops at the cap and offers the rest for the row menu', () => {
		const row = { id: '1', title: 'Alpha', suspended: true, extended: true, parentCase: 'c9', decision: 'granted' }
		const wrapper = mountTable([row], { rowIndicators: INDICATORS })
		expect(wrapper.findAll('[data-testid="cn-row-indicators"] .cn-table-row-indicator')).toHaveLength(3)
		expect(wrapper.vm.indicatorsFor(row).overflow.map((i) => i.id)).toEqual(['decided'])
	})

	it('a record cannot add an indicator the page has not declared', () => {
		const row = { id: '1', title: 'Alpha', escalated: true, indicators: [{ field: 'escalated', text: 'Escalated' }] }
		const wrapper = mountTable([row], { rowIndicators: INDICATORS })
		expect(wrapper.find('[data-testid="cn-row-indicators"]').exists()).toBe(false)
	})
})
