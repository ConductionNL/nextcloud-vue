/**
 * Tests for CnMapPoiCreate — inline-create Maps POI dialog.
 *
 * Covers:
 *  - starts empty and cannot submit;
 *  - submit is disabled until a non-empty name + valid coordinates;
 *  - out-of-range / non-numeric coordinates are rejected;
 *  - submit emits `create` with the parsed numeric payload;
 *  - optional category/comment normalise to null when blank.
 */

const { mount } = require('@vue/test-utils')
const CnMapPoiCreate = require('../CnMapPoiCreate.vue').default

describe('CnMapPoiCreate', () => {
	it('starts empty and cannot submit', () => {
		const wrapper = mount(CnMapPoiCreate)
		expect(wrapper.vm.name).toBe('')
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.unmount()
	})

	it('blocks submit when name present but coordinates missing', () => {
		const wrapper = mount(CnMapPoiCreate)
		wrapper.setData({ name: 'Office' })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})

	it('blocks submit when coordinates are out of range', () => {
		const wrapper = mount(CnMapPoiCreate)
		wrapper.setData({ name: 'Office', lat: '120', lng: '4.89' })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.unmount()
	})

	it('emits create with parsed numeric payload', () => {
		const wrapper = mount(CnMapPoiCreate)
		wrapper.setData({
			name: '  Office  ',
			lat: '52.37403',
			lng: '4.88969',
			category: ' Work ',
			comment: ' HQ ',
		})
		expect(wrapper.vm.canSubmit).toBe(true)

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{
			name: 'Office',
			lat: 52.37403,
			lng: 4.88969,
			category: 'Work',
			comment: 'HQ',
		}])
		wrapper.unmount()
	})

	it('normalises blank category and comment to null', () => {
		const wrapper = mount(CnMapPoiCreate)
		wrapper.setData({ name: 'Spot', lat: '0', lng: '0' })

		wrapper.vm.submit()
		expect(wrapper.emitted('create')[0]).toEqual([{
			name: 'Spot',
			lat: 0,
			lng: 0,
			category: null,
			comment: null,
		}])
		wrapper.unmount()
	})
})
