/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The map widget form stores a chosen base map preset as an ordinary base map,
 * keeps a custom one, and writes the location field under `markers.geoProperty`
 * only when one is chosen, so the content of existing maps stays as it was.
 */
import { mount } from '@vue/test-utils'
import CnMapWidgetForm from '@/components/CnMapWidgetForm/CnMapWidgetForm.vue'
import { basemapFromPreset } from '@/components/CnMapWidget/basemapPresets.js'

const STUBS = { CnRegisterSchemaSelect: true, CnFieldPicker: true, NcSelect: true }

/**
 * The last content the form emitted.
 *
 * @param {object} wrapper The mounted form.
 * @return {object} The content.
 */
function lastContent(wrapper) {
	return wrapper.emitted('update:content').at(-1)[0]
}

describe('CnMapWidgetForm', () => {
	it('emits the same content shape as before for an existing map', () => {
		const custom = { name: 'Eigen kaart', url: 'https://tiles.example.org/{z}/{x}/{y}.png', options: {} }
		const content = { register: 'r', schema: 's', basemaps: [custom], markers: { dataSource: { register: 'r', schema: 's' } } }
		const wrapper = mount(CnMapWidgetForm, { props: { editingWidget: { content } }, global: { stubs: STUBS } })

		expect(lastContent(wrapper).basemaps).toEqual([custom])
		expect(lastContent(wrapper).markers).not.toHaveProperty('geoProperty')
		expect(wrapper.vm.basemapOption.id).toBe('custom')
	})

	it('stores a chosen preset as the base map', async () => {
		const wrapper = mount(CnMapWidgetForm, { global: { stubs: STUBS } })
		expect(wrapper.vm.basemapOption.id).toBe('osm')

		wrapper.vm.onBasemap({ id: 'pdok-brt' })
		await wrapper.vm.$nextTick()

		expect(lastContent(wrapper).basemaps).toEqual([basemapFromPreset('pdok-brt')])
		expect(wrapper.vm.basemapOption.id).toBe('pdok-brt')
	})

	it('writes the location field under markers, and drops it with the register', async () => {
		const wrapper = mount(CnMapWidgetForm, { props: { value: { register: 'r', schema: 's' } }, global: { stubs: STUBS } })
		wrapper.vm.geoProperty = 'perceel'
		await wrapper.vm.$nextTick()
		expect(lastContent(wrapper).markers.geoProperty).toBe('perceel')

		wrapper.vm.updateSource('register', 'other')
		await wrapper.vm.$nextTick()
		expect(lastContent(wrapper).markers).not.toHaveProperty('geoProperty')
	})
})
