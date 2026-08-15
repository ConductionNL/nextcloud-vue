import { mount } from '@vue/test-utils'
import CnMetadataTab from '@/components/CnAdvancedFormDialog/CnMetadataTab.vue'

describe('CnMetadataTab', () => {
	it('renders default ID/Created/Updated rows from @self', () => {
		const wrapper = mount(CnMetadataTab, {
			propsData: {
				item: { '@self': { id: 'abc', created: '2025-01-01T00:00:00Z', updated: '2025-02-01T00:00:00Z' } },
			},
		})
		const text = wrapper.text()
		expect(text).toContain('abc')
		expect(text).toMatch(/2025/)
	})

	it('appends extraRows after defaults', () => {
		const wrapper = mount(CnMetadataTab, {
			propsData: {
				item: { '@self': { id: 'abc', created: '2025-01-01T00:00:00Z' } },
				extraRows: [['Version', '7'], ['Owner', 'thijn']],
			},
		})
		expect(wrapper.vm.resolvedRows.length).toBe(5)
		expect(wrapper.text()).toContain('Version')
		expect(wrapper.text()).toContain('thijn')
	})

	it('replaceRows skips defaults', () => {
		const wrapper = mount(CnMetadataTab, {
			propsData: {
				item: { '@self': { id: 'abc' } },
				extraRows: [['Only', 'me']],
				replaceRows: true,
			},
		})
		expect(wrapper.vm.resolvedRows).toEqual([['Only', 'me']])
		expect(wrapper.text()).not.toContain('abc')
	})
})
