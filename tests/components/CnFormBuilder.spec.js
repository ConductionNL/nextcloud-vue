import { mount } from '@vue/test-utils'
import CnFormBuilder from '@/components/CnFormBuilder/CnFormBuilder.vue'

describe('CnFormBuilder', () => {
	it('renders the palette + empty fields list initially', () => {
		const wrapper = mount(CnFormBuilder)
		expect(wrapper.find('[data-testid="cn-form-builder-palette"]').exists()).toBe(true)
		expect(wrapper.find('.cn-form-builder__empty').exists()).toBe(true)
	})

	it('addField appends a field of the given type', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		expect(wrapper.vm.model.length).toBe(1)
		expect(wrapper.vm.model[0]).toMatchObject({ type: 'string', required: false })
		expect(wrapper.vm.model[0].key).toMatch(/^field_/)
	})

	it('addField selects the newly-added field', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('number')
		expect(wrapper.vm.selectedIndex).toBe(0)
	})

	it('addField enum seeds an empty options[]', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('enum')
		expect(wrapper.vm.model[0].options).toEqual([])
	})

	it('emits input on add/update/remove/move', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		wrapper.vm.updateSelected('label', 'Name')
		wrapper.vm.addField('number')
		wrapper.vm.moveField(1, -1)
		wrapper.vm.removeField(0)
		expect(wrapper.emitted('input').length).toBeGreaterThanOrEqual(5)
	})

	it('updateSelected mutates the active field', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		wrapper.vm.updateSelected('label', 'My label')
		expect(wrapper.vm.model[0].label).toBe('My label')
	})

	it('moveField up/down reorders + updates selection', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string') // idx 0 (selected)
		wrapper.vm.addField('number') // idx 1 (selected)
		wrapper.vm.selectedIndex = 0
		wrapper.vm.moveField(0, 1) // string moves to idx 1
		expect(wrapper.vm.model[0].type).toBe('number')
		expect(wrapper.vm.model[1].type).toBe('string')
		expect(wrapper.vm.selectedIndex).toBe(1)
	})

	it('moveField is a no-op at boundaries', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		const before = [...wrapper.vm.model]
		wrapper.vm.moveField(0, -1)
		expect(wrapper.vm.model).toEqual(before)
		wrapper.vm.moveField(0, 1)
		expect(wrapper.vm.model).toEqual(before)
	})

	it('removeField removes the field + adjusts selection', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		wrapper.vm.addField('number')
		wrapper.vm.selectedIndex = 1
		wrapper.vm.removeField(0)
		expect(wrapper.vm.model.length).toBe(1)
		expect(wrapper.vm.selectedIndex).toBe(0)
	})

	it('removeField on selected clears selection', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		wrapper.vm.removeField(0)
		expect(wrapper.vm.selectedIndex).toBe(-1)
	})

	it('save() emits a copy of the model', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		wrapper.vm.save()
		expect(wrapper.emitted('save')[0][0]).toHaveLength(1)
	})

	it('seeds from the value prop', () => {
		const wrapper = mount(CnFormBuilder, {
			propsData: { value: [{ key: 'name', type: 'string', label: 'Name' }] },
		})
		expect(wrapper.vm.model.length).toBe(1)
	})

	it('selectedField returns null when no selection', () => {
		const wrapper = mount(CnFormBuilder)
		expect(wrapper.vm.selectedField).toBeNull()
	})

	it('previewJson serialises the model', () => {
		const wrapper = mount(CnFormBuilder)
		wrapper.vm.addField('string')
		expect(wrapper.vm.previewJson).toContain('"type": "string"')
	})

	it('hidePreview hides the preview details element', () => {
		const wrapper = mount(CnFormBuilder, { propsData: { hidePreview: true } })
		expect(wrapper.find('.cn-form-builder__preview').exists()).toBe(false)
	})
})
