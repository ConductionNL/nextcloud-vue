/**
 * Tests for CnPhotoAlbumCreate — inline-create Photos album dialog.
 *
 * Covers:
 *  - submit emits `create` with the trimmed name payload;
 *  - submit is disabled until a non-empty name is present;
 *  - whitespace-only names are rejected;
 *  - no create is emitted when the name is blank.
 */

const { mount } = require('@vue/test-utils')
const CnPhotoAlbumCreate = require('../CnPhotoAlbumCreate.vue').default

describe('CnPhotoAlbumCreate', () => {
	it('starts with an empty name and cannot submit', () => {
		const wrapper = mount(CnPhotoAlbumCreate)
		expect(wrapper.vm.name).toBe('')
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.unmount()
	})

	it('blocks submit when name is whitespace only', () => {
		const wrapper = mount(CnPhotoAlbumCreate)
		wrapper.setData({ name: '   ' })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})

	it('emits create with the trimmed name on submit', () => {
		const wrapper = mount(CnPhotoAlbumCreate)
		wrapper.setData({ name: '  Holiday 2026  ' })
		expect(wrapper.vm.canSubmit).toBe(true)

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ name: 'Holiday 2026' }])
		wrapper.unmount()
	})

	it('does not emit create when name is blank', () => {
		const wrapper = mount(CnPhotoAlbumCreate)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})
})
