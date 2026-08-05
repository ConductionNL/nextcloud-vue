import { mount } from '@vue/test-utils'
import CnRichSubmitDialog from '@/components/CnRichSubmitDialog/CnRichSubmitDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button :disabled="disabled" @click="$listeners.click"><slot /></button>', props: ['disabled', 'type'] },
	NcNoteCard: { template: '<div class="note-card" :data-type="type"><slot /></div>', props: ['type'] },
	NcLoadingIcon: true,
}

describe('CnRichSubmitDialog', () => {
	it('renders the form phase by default', () => {
		const wrapper = mount(CnRichSubmitDialog, { stubs })
		expect(wrapper.find('[data-testid-phase="form"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(false)
	})

	it('renders reason radios from the reasons prop', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { reasons: ['complete', { value: 'draft', label: 'Draft' }] },
			stubs,
		})
		const radios = wrapper.findAll('input[type="radio"]')
		expect(radios.length).toBe(2)
	})

	it('disables Submit when reasonRequired and no reason picked', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { reasons: ['complete'], reasonRequired: true },
			stubs,
		})
		expect(wrapper.vm.isValid).toBe(false)
	})

	it('enables Submit when required reason is picked', async () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { reasons: ['complete'], reasonRequired: true },
			stubs,
		})
		wrapper.vm.formData.reason = 'complete'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isValid).toBe(true)
	})

	it('shows notes textarea by default; can be disabled via showNotes=false', async () => {
		const wrapper = mount(CnRichSubmitDialog, { stubs })
		expect(wrapper.find('textarea').exists()).toBe(true)
		wrapper.setProps({ showNotes: false })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('textarea').exists()).toBe(false)
	})

	it('disables Submit when notesRequired and notes blank', () => {
		const wrapper = mount(CnRichSubmitDialog, { propsData: { notesRequired: true }, stubs })
		expect(wrapper.vm.isValid).toBe(false)
	})

	it('disables Submit when filesRequired and no files', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { showFiles: true, filesRequired: true },
			stubs,
		})
		expect(wrapper.vm.isValid).toBe(false)
	})

	it('emits @confirm with the current form payload', async () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { reasons: ['complete'] },
			stubs,
		})
		wrapper.vm.formData.reason = 'complete'
		wrapper.vm.formData.notes = 'See attachment.'
		wrapper.vm.onConfirm()
		expect(wrapper.emitted('confirm')).toBeTruthy()
		expect(wrapper.emitted('confirm')[0][0]).toMatchObject({
			reason: 'complete',
			notes: 'See attachment.',
			files: [],
		})
	})

	it('rejects a file batch exceeding maxFiles', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { showFiles: true, maxFiles: 2 },
			stubs,
		})
		const f = (name, size = 1024) => new File(['x'.repeat(size)], name, { type: 'text/plain' })
		wrapper.vm.onFilesChange({ target: { files: [f('a'), f('b'), f('c')], value: '' } })
		expect(wrapper.vm.validationError).toContain('At most 2')
		expect(wrapper.vm.formData.files.length).toBe(0)
	})

	it('rejects a file exceeding maxSizeMb', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { showFiles: true, maxSizeMb: 1 },
			stubs,
		})
		const big = new File(['x'.repeat(2 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' })
		wrapper.vm.onFilesChange({ target: { files: [big], value: '' } })
		expect(wrapper.vm.validationError).toContain('exceeds')
	})

	it('accepts a valid file batch', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { showFiles: true, maxFiles: 3, maxSizeMb: 10 },
			stubs,
		})
		const small = new File(['x'], 'small.pdf', { type: 'application/pdf' })
		wrapper.vm.onFilesChange({ target: { files: [small], value: '' } })
		expect(wrapper.vm.validationError).toBe('')
		expect(wrapper.vm.formData.files.length).toBe(1)
	})

	it('renders late-warning banner when lateWarning is set', () => {
		const wrapper = mount(CnRichSubmitDialog, {
			propsData: { lateWarning: 'This submission is 3 days late.' },
			stubs,
		})
		expect(wrapper.text()).toContain('This submission is 3 days late.')
	})

	it('switches to result phase on setResult', async () => {
		const wrapper = mount(CnRichSubmitDialog, { stubs })
		wrapper.vm.setResult({ success: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(true)
	})

	it('resets state and emits close on onClose', async () => {
		const wrapper = mount(CnRichSubmitDialog, { stubs })
		wrapper.vm.formData.reason = 'complete'
		wrapper.vm.formData.notes = 'foo'
		wrapper.vm.setResult({ success: true })
		wrapper.vm.onClose()
		expect(wrapper.vm.formData.reason).toBe('')
		expect(wrapper.vm.formData.notes).toBe('')
		expect(wrapper.vm.formData.files).toEqual([])
		expect(wrapper.vm.result).toBeNull()
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('formats byte sizes', () => {
		const wrapper = mount(CnRichSubmitDialog, { stubs })
		expect(wrapper.vm.humanSize(500)).toBe('500 B')
		expect(wrapper.vm.humanSize(1024)).toBe('1.0 KB')
		expect(wrapper.vm.humanSize(2 * 1024 * 1024)).toBe('2.0 MB')
	})
})
