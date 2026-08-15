import { mount } from '@vue/test-utils'
import CnFileManager from '@/components/CnFileManager/CnFileManager.vue'

const files = [
	{ id: 'f1', name: 'spec.pdf', size: 1024 * 1024, type: 'application/pdf', url: '/files/f1', uploadedAt: '2026-05-20T10:00:00Z', uploadedBy: 'jane' },
	{ id: 'f2', name: 'photo.jpg', size: 512 * 1024, type: 'image/jpeg' },
	{ id: 'f3', name: 'data.zip', size: 5 * 1024 * 1024 },
]

describe('CnFileManager', () => {
	it('renders the dropzone in editable mode', () => {
		const wrapper = mount(CnFileManager)
		expect(wrapper.find('[data-testid="cn-file-manager-dropzone"]').exists()).toBe(true)
	})

	it('hides the dropzone in readOnly mode', () => {
		const wrapper = mount(CnFileManager, { propsData: { readOnly: true } })
		expect(wrapper.find('[data-testid="cn-file-manager-dropzone"]').exists()).toBe(false)
	})

	it('renders empty-state when files[] is empty', () => {
		const wrapper = mount(CnFileManager)
		expect(wrapper.find('.cn-file-manager__empty').exists()).toBe(true)
	})

	it('renders one row per file', () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		expect(wrapper.findAll('.cn-file-manager__item').length).toBe(3)
	})

	it('shows the file size + uploadedAt + uploadedBy', () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		expect(wrapper.text()).toContain('1.0 MB')
		expect(wrapper.text()).toContain('jane')
	})

	it('picks icons by extension / mime', () => {
		const wrapper = mount(CnFileManager, { propsData: { files: [] } })
		expect(wrapper.vm.iconFor({ name: 'foo.pdf' })).toBe('📕')
		expect(wrapper.vm.iconFor({ name: 'photo.png' })).toBe('🖼️')
		expect(wrapper.vm.iconFor({ name: 'song.mp3' })).toBe('🎵')
		expect(wrapper.vm.iconFor({ name: 'sheet.xlsx' })).toBe('📊')
		expect(wrapper.vm.iconFor({ name: 'archive.zip' })).toBe('🗜️')
		expect(wrapper.vm.iconFor({ name: 'doc.docx' })).toBe('📄')
		expect(wrapper.vm.iconFor({ name: 'unknown.xyz' })).toBe('📎')
	})

	it('humanSize formats bytes / KB / MB', () => {
		const wrapper = mount(CnFileManager)
		expect(wrapper.vm.humanSize(500)).toBe('500 B')
		expect(wrapper.vm.humanSize(1024)).toBe('1.0 KB')
		expect(wrapper.vm.humanSize(2 * 1024 * 1024)).toBe('2.0 MB')
	})

	it('emits download with the file', async () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		await wrapper.findAll('.cn-file-manager__action').at(0).trigger('click')
		expect(wrapper.emitted('download')).toBeTruthy()
	})

	it('emits delete with the file + marks deleting', async () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		const buttons = wrapper.findAll('.cn-file-manager__action--delete')
		await buttons.at(0).trigger('click')
		expect(wrapper.emitted('delete')[0][0]).toMatchObject({ id: 'f1' })
		expect(wrapper.vm.deletingIds.f1).toBe(true)
	})

	it('clearDeleting resets the flag', () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		wrapper.vm.deletingIds = { f1: true }
		wrapper.vm.clearDeleting('f1')
		expect(wrapper.vm.deletingIds.f1).toBeUndefined()
	})

	it('emits file-click on row click', async () => {
		const wrapper = mount(CnFileManager, { propsData: { files } })
		await wrapper.findAll('.cn-file-manager__item').at(0).trigger('click')
		expect(wrapper.emitted('file-click')[0][0]).toMatchObject({ id: 'f1' })
	})

	it('emits upload with the dropped file batch', () => {
		const wrapper = mount(CnFileManager)
		const f = new File(['x'], 'a.txt', { type: 'text/plain' })
		wrapper.vm.emitUpload([f])
		expect(wrapper.emitted('upload')[0][0]).toHaveLength(1)
	})

	it('rejects an oversized file via upload-rejected', () => {
		const wrapper = mount(CnFileManager, { propsData: { maxSizeMb: 1 } })
		const big = new File(['x'.repeat(2 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' })
		wrapper.vm.emitUpload([big])
		expect(wrapper.emitted('upload-rejected')[0][0]).toMatchObject({ reason: 'size', limitMb: 1 })
		expect(wrapper.emitted('upload')).toBeFalsy()
	})

	it('readOnly disables dropzone events', () => {
		const wrapper = mount(CnFileManager, { propsData: { files, readOnly: true } })
		wrapper.vm.onDrop({ dataTransfer: { files: [new File(['x'], 'a.txt')] } })
		expect(wrapper.emitted('upload')).toBeFalsy()
	})

	it('renders the title + description', () => {
		const wrapper = mount(CnFileManager, {
			propsData: { title: 'Attachments', description: 'Drop files here' },
		})
		expect(wrapper.text()).toContain('Attachments')
		expect(wrapper.text()).toContain('Drop files here')
	})
})
