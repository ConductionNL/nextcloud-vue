import { mount } from '@vue/test-utils'

// Controllable @nextcloud/dialogs mock — each test can set what pick() resolves to.
// `mock`-prefixed so babel-plugin-jest-hoist allows the factory to reference them.
let mockPickResult = ''
const mockPick = jest.fn(() => Promise.resolve(mockPickResult))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	FilePickerType: { Choose: 1 },
	getFilePickerBuilder: jest.fn(() => {
		const builder = {}
		const chain = () => builder
		builder.setMultiSelect = chain
		builder.setMimeTypeFilter = chain
		builder.setModal = chain
		builder.setType = chain
		builder.allowDirectories = chain
		builder.build = () => ({ pick: mockPick })
		return builder
	}),
}))

import CnRelatedFiles from '@/components/CnRelatedFiles/CnRelatedFiles.vue'

const files = [
	{ path: '/Projects/spec.pdf', name: 'spec.pdf' },
	{ path: '/Photos/photo.jpg' },
	{ path: '/Archives/data.zip', name: 'data.zip', description: 'Raw export' },
]

describe('CnRelatedFiles', () => {
	beforeEach(() => {
		mockPickResult = ''
		mockPick.mockClear()
	})

	it('renders the add button in editable mode', () => {
		const wrapper = mount(CnRelatedFiles)
		expect(wrapper.find('[data-testid="cn-related-files-add"]').exists()).toBe(true)
	})

	it('hides the add button in readOnly mode', () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { readOnly: true } })
		expect(wrapper.find('[data-testid="cn-related-files-add"]').exists()).toBe(false)
	})

	it('renders the empty state when files[] is empty', () => {
		const wrapper = mount(CnRelatedFiles)
		expect(wrapper.find('[data-testid="cn-related-files-empty"]').exists()).toBe(true)
	})

	it('renders one row per file', () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files } })
		expect(wrapper.findAll('.cn-related-files__item').length).toBe(3)
	})

	it('derives the display name from the basename when name is absent', () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files } })
		expect(wrapper.text()).toContain('photo.jpg')
	})

	it('shows the path subline and description', () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files } })
		expect(wrapper.text()).toContain('/Archives/data.zip')
		expect(wrapper.text()).toContain('Raw export')
	})

	it('picks icons by extension', () => {
		const wrapper = mount(CnRelatedFiles)
		expect(wrapper.vm.iconFor({ name: 'foo.pdf' })).toBe('📕')
		expect(wrapper.vm.iconFor({ path: '/a/photo.png' })).toBe('🖼️')
		expect(wrapper.vm.iconFor({ name: 'archive.zip' })).toBe('🗜️')
		expect(wrapper.vm.iconFor({ name: 'unknown.xyz' })).toBe('📎')
	})

	it('emits remove + update:files when a row Remove is clicked', async () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files } })
		await wrapper.findAll('.cn-related-files__action--remove').at(1).trigger('click')
		expect(wrapper.emitted('remove')[0][0]).toMatchObject({ path: '/Photos/photo.jpg' })
		expect(wrapper.emitted('update:files')[0][0]).toHaveLength(2)
		expect(wrapper.emitted('update:files')[0][0].map((f) => f.path)).not.toContain('/Photos/photo.jpg')
	})

	it('readOnly hides both the add control and the remove buttons', () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files, readOnly: true } })
		expect(wrapper.find('[data-testid="cn-related-files-add"]').exists()).toBe(false)
		expect(wrapper.findAll('.cn-related-files__action--remove').length).toBe(0)
	})

	it('adds a single picked file — emits @add (single ref) + update:files', async () => {
		mockPickResult = '/Docs/report.pdf'
		const wrapper = mount(CnRelatedFiles, { propsData: { files: [], allowMultiple: false } })
		await wrapper.vm.openPicker()
		expect(wrapper.emitted('add')[0][0]).toMatchObject({ path: '/Docs/report.pdf', name: 'report.pdf' })
		expect(wrapper.emitted('update:files')[0][0]).toHaveLength(1)
	})

	it('adds multiple picked files — emits @add (array) + update:files', async () => {
		mockPickResult = ['/Docs/a.pdf', '/Docs/b.docx']
		const wrapper = mount(CnRelatedFiles, { propsData: { files: [] } })
		await wrapper.vm.openPicker()
		expect(Array.isArray(wrapper.emitted('add')[0][0])).toBe(true)
		expect(wrapper.emitted('add')[0][0]).toHaveLength(2)
		expect(wrapper.emitted('update:files')[0][0]).toHaveLength(2)
	})

	it('a cancelled pick (empty result) emits nothing', async () => {
		mockPickResult = ''
		const wrapper = mount(CnRelatedFiles, { propsData: { files: [] } })
		await wrapper.vm.openPicker()
		expect(wrapper.emitted('add')).toBeFalsy()
		expect(wrapper.emitted('update:files')).toBeFalsy()
	})

	it('path-input fallback relates a typed path and clears the field', async () => {
		const wrapper = mount(CnRelatedFiles, { propsData: { files: [], pathInput: true } })
		const input = wrapper.find('[data-testid="cn-related-files-path-input"]')
		await input.setValue('/Typed/manual.txt')
		await wrapper.find('[data-testid="cn-related-files-path-add"]').trigger('click')
		expect(wrapper.emitted('add')[0][0]).toMatchObject({ path: '/Typed/manual.txt', name: 'manual.txt' })
		expect(wrapper.emitted('update:files')[0][0]).toHaveLength(1)
		expect(wrapper.vm.pathDraft).toBe('')
	})

	it('renders the title + description header', () => {
		const wrapper = mount(CnRelatedFiles, {
			propsData: { title: 'Related files', description: 'Files linked to this project' },
		})
		expect(wrapper.text()).toContain('Related files')
		expect(wrapper.text()).toContain('Files linked to this project')
	})

	it('exposes an item-actions scoped slot', () => {
		const wrapper = mount(CnRelatedFiles, {
			propsData: { files },
			scopedSlots: {
				'item-actions': '<span class="custom-action">{{ props.file.path }}</span>',
			},
		})
		expect(wrapper.findAll('.custom-action').length).toBe(3)
		expect(wrapper.find('.cn-related-files__action--remove').exists()).toBe(false)
	})
})
