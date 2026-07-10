/**
 * Tests for CnObjectRow — the config/schema-driven list row. Covers field
 * resolution (config over schema-configuration), the badge, and the
 * click-vs-select body behaviour mirrored from CnObjectCard.
 */

const { shallowMount } = require('@vue/test-utils')
const CnObjectRow = require('../../src/components/CnObjectRow/CnObjectRow.vue').default

const object = { id: 's-1', name: 'GitHub', url: 'https://github.com', status: 'active' }
const schema = { configuration: { objectNameField: 'name', objectDescriptionField: 'url' } }

function mountRow(propsData) {
	return shallowMount(CnObjectRow, { propsData: { object, ...propsData } })
}

describe('CnObjectRow — field resolution', () => {
	it('derives title/subtitle from schema.configuration', () => {
		const wrapper = mountRow({ schema })
		expect(wrapper.find('.cn-object-row__title').text()).toBe('GitHub')
		expect(wrapper.find('.cn-object-row__subtitle').text()).toBe('https://github.com')
	})

	it('config fields override schema configuration', () => {
		const wrapper = mountRow({ schema, config: { titleField: 'url', subtitleField: 'name' } })
		expect(wrapper.find('.cn-object-row__title').text()).toBe('https://github.com')
		expect(wrapper.find('.cn-object-row__subtitle').text()).toBe('GitHub')
	})

	it('falls back to name/title/id when no field configured', () => {
		const wrapper = mountRow({})
		expect(wrapper.find('.cn-object-row__title').text()).toBe('GitHub')
	})

	it('renders a config-driven status badge', () => {
		const wrapper = mountRow({ config: { badgeField: 'status' } })
		expect(wrapper.find('.cn-object-row__badges').exists()).toBe(true)
	})

	it('omits the badge area when no badgeField and no badges slot', () => {
		const wrapper = mountRow({})
		expect(wrapper.find('.cn-object-row__badges').exists()).toBe(false)
	})

	it('omits the leading icon column when nothing is configured', () => {
		const wrapper = mountRow({})
		expect(wrapper.find('.cn-object-row__icon').exists()).toBe(false)
	})

	it('renders the leading icon column when iconName is configured', () => {
		const wrapper = mountRow({ config: { iconName: 'Key' } })
		expect(wrapper.find('.cn-object-row__icon').exists()).toBe(true)
	})
})

describe('CnObjectRow — body click', () => {
	it('emits click for navigation when not selectable', async () => {
		const wrapper = mountRow({})
		await wrapper.find('.cn-object-row').trigger('click')
		expect(wrapper.emitted('click')[0]).toEqual([object])
		expect(wrapper.emitted('select')).toBeFalsy()
	})

	it('emits select (not click) when selectable', async () => {
		const wrapper = mountRow({ selectable: true })
		await wrapper.find('.cn-object-row').trigger('click')
		expect(wrapper.emitted('select')[0]).toEqual([object])
		expect(wrapper.emitted('click')).toBeFalsy()
	})
})
