/**
 * Tests for CnBookmarkCreate — inline-create Bookmarks dialog.
 *
 * Covers:
 *  - submit is blocked until title + a valid http(s) URL are present;
 *  - submit emits `create` with the full payload (title/url/description/tags);
 *  - comma-separated tags are parsed into a trimmed string[];
 *  - URL validation rejects non-http(s) and malformed values.
 */

const { mount } = require('@vue/test-utils')
const CnBookmarkCreate = require('../CnBookmarkCreate.vue').default

describe('CnBookmarkCreate', () => {
	it('blocks submit when title is empty', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({ url: 'https://conduction.nl' })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})

	it('blocks submit when URL is missing or invalid', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({ title: 'Conduction', url: 'not-a-url' })
		expect(wrapper.vm.urlValid).toBe(false)
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})

	it('rejects non-http(s) protocols', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({ title: 'X', url: 'ftp://example.org/file' })
		expect(wrapper.vm.urlValid).toBe(false)
		wrapper.unmount()
	})

	it('accepts a valid https URL', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({ title: 'Conduction', url: 'https://conduction.nl' })
		expect(wrapper.vm.urlValid).toBe(true)
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.unmount()
	})

	it('emits create with the full payload on submit', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({
			title: 'Conduction',
			url: 'https://conduction.nl',
			description: 'Company site',
			tagsInput: 'vendor, reference',
		})

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.title).toBe('Conduction')
		expect(payload.url).toBe('https://conduction.nl')
		expect(payload.description).toBe('Company site')
		expect(payload.tags).toEqual(['vendor', 'reference'])
		wrapper.unmount()
	})

	it('parses comma-separated tags, trimming + dropping empties', () => {
		const wrapper = mount(CnBookmarkCreate)
		wrapper.setData({ tagsInput: '  a , ,b,  c  ' })
		expect(wrapper.vm.parsedTags).toEqual(['a', 'b', 'c'])
		wrapper.unmount()
	})
})
