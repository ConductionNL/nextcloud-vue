import { mount } from '@vue/test-utils'
import CnWizardDialog from '@/components/CnWizardDialog/CnWizardDialog.vue'

const stubs = {
	NcDialog: {
		template: '<div><slot /><slot name="actions" /></div>',
	},
	NcButton: {
		template: '<button :disabled="disabled" @click="$attrs.onClick && $attrs.onClick()"><slot /></button>',
		props: ['disabled', 'type'],
	},
	NcNoteCard: { template: '<div class="note-card" :data-type="type"><slot /></div>', props: ['type'] },
	NcLoadingIcon: true,
}

const steps = [
	{ id: 'audience', label: 'Audience' },
	{ id: 'course', label: 'Course' },
	{ id: 'confirm', label: 'Confirm' },
]

function buildSlots() {
	return {
		'step-audience': '<div data-test="step-audience">Pick a cohort</div>',
		'step-course': '<div data-test="step-course">Pick a course</div>',
		'step-confirm': '<div data-test="step-confirm">Are you sure?</div>',
	}
}

describe('CnWizardDialog', () => {
	it('renders the first step by default', () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		expect(wrapper.find('[data-test="step-audience"]').exists()).toBe(true)
		expect(wrapper.vm.currentIndex).toBe(0)
	})

	it('advances on next()', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next()
		expect(wrapper.vm.currentIndex).toBe(1)
		expect(wrapper.find('[data-test="step-course"]').exists()).toBe(true)
	})

	it('returns on back()', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next()
		wrapper.vm.back()
		expect(wrapper.vm.currentIndex).toBe(0)
	})

	it('starts on initialStep when provided', () => {
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, initialStep: 'course' },
			scopedSlots: buildSlots(),
			stubs,
		})
		expect(wrapper.vm.currentStep.id).toBe('course')
	})

	it('flips Next → Submit on the last step', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next() // audience → course
		await wrapper.vm.next() // course → confirm
		expect(wrapper.vm.isLast).toBe(true)
	})

	it('blocks advance when validate returns a string', async () => {
		const validate = jest.fn(() => Promise.resolve('Pick something first.'))
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, validate },
			scopedSlots: buildSlots(),
			stubs,
		})
		await wrapper.vm.next()
		expect(wrapper.vm.currentIndex).toBe(0)
		expect(wrapper.vm.validationError).toBe('Pick something first.')
	})

	it('allows advance when validate returns true', async () => {
		const validate = jest.fn(() => Promise.resolve(true))
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, validate },
			scopedSlots: buildSlots(),
			stubs,
		})
		await wrapper.vm.next()
		expect(wrapper.vm.currentIndex).toBe(1)
		expect(validate).toHaveBeenCalledWith('audience', expect.any(Object))
	})

	it('blocks silently when validate returns false', async () => {
		const validate = jest.fn(() => Promise.resolve(false))
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, validate },
			scopedSlots: buildSlots(),
			stubs,
		})
		await wrapper.vm.next()
		expect(wrapper.vm.currentIndex).toBe(0)
		expect(wrapper.vm.validationError).toBe('')
	})

	it('surfaces a thrown validation error as the banner text', async () => {
		const validate = jest.fn(() => { throw new Error('Network down') })
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, validate },
			scopedSlots: buildSlots(),
			stubs,
		})
		await wrapper.vm.next()
		expect(wrapper.vm.validationError).toBe('Network down')
	})

	it('emits @submit with accumulated stepData on the final step', async () => {
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps, defaults: { cohort: 'A1' } },
			scopedSlots: buildSlots(),
			stubs,
		})
		wrapper.vm.setStepData({ course: 'PHIL101' })
		await wrapper.vm.next()
		await wrapper.vm.next()
		await wrapper.vm.submit()
		expect(wrapper.emitted('submit')).toBeTruthy()
		expect(wrapper.emitted('submit')[0][0]).toMatchObject({ cohort: 'A1', course: 'PHIL101' })
	})

	it('emits step-change with the right direction', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next()
		const events = wrapper.emitted('step-change')
		expect(events).toBeTruthy()
		expect(events[events.length - 1][0]).toMatchObject({ stepId: 'course', direction: 'next' })
		wrapper.vm.back()
		expect(wrapper.emitted('step-change').pop()[0]).toMatchObject({ stepId: 'audience', direction: 'back' })
	})

	it('jumpTo navigates directly to the named step', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		wrapper.vm.jumpTo('confirm')
		expect(wrapper.vm.currentStep.id).toBe('confirm')
		expect(wrapper.emitted('step-change').pop()[0]).toMatchObject({ direction: 'jump' })
	})

	it('flips into the result phase on setResult', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.submit()
		wrapper.vm.setResult({ success: true, message: 'Enrolled 42 learners.' })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('Enrolled 42 learners.')
		expect(wrapper.vm.loading).toBe(false)
	})

	it('renders an error banner when setResult carries an error', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		wrapper.vm.setResult({ error: 'Backend down.' })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Backend down.')
	})

	it('resets to initial state on onClose', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next()
		wrapper.vm.setStepData({ foo: 'bar' })
		wrapper.vm.setResult({ success: true })
		wrapper.vm.onClose()
		expect(wrapper.vm.currentIndex).toBe(0)
		expect(wrapper.vm.stepData).toEqual({})
		expect(wrapper.vm.result).toBeNull()
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('setError surfaces a recoverable error without entering the result phase', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.submit()
		expect(wrapper.vm.loading).toBe(true)
		wrapper.vm.setError('Slug already taken.')
		await wrapper.vm.$nextTick()
		// Stays in the wizard phase (still editable), spinner cleared, error shown.
		expect(wrapper.vm.result).toBeNull()
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.text()).toContain('Slug already taken.')
		expect(wrapper.find('[data-testid-phase="form"]').exists()).toBe(true)
	})

	describe('controlled open + cancellable', () => {
		// NcDialog's real close path sets its internal showModal false, then ~300ms
		// later sets it back TRUE and emits update:open=false. Because `show` is
		// `props.open && showModal`, a dialog left with `open` hardcoded true
		// reopens itself after every close — so these tests assert `open` is
		// actually driven, and that nothing flips it back.
		const openStubs = {
			...stubs,
			NcDialog: {
				name: 'NcDialog',
				template: '<div v-if="open" class="nc-dialog-stub"><slot /><slot name="actions" /></div>',
				props: ['open', 'noClose', 'name', 'size'],
			},
		}

		const mountDialog = (propsData) => mount(CnWizardDialog, {
			propsData: { steps, ...propsData },
			scopedSlots: buildSlots(),
			stubs: openStubs,
		})

		const dialogOf = (wrapper) => wrapper.findComponent({ name: 'NcDialog' })

		it('binds NcDialog open and closes it on onClose', async () => {
			const wrapper = mountDialog()
			expect(dialogOf(wrapper).props('open')).toBe(true)
			expect(wrapper.find('.nc-dialog-stub').exists()).toBe(true)
			wrapper.vm.onClose()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.dialogOpen).toBe(false)
			expect(dialogOf(wrapper).props('open')).toBe(false)
			expect(wrapper.find('.nc-dialog-stub').exists()).toBe(false)
		})

		it('stays closed after NcDialog emits its delayed update:open (regression)', async () => {
			const wrapper = mountDialog()
			const dialog = dialogOf(wrapper)
			dialog.vm.$emit('closing')
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.dialogOpen).toBe(false)
			expect(wrapper.emitted('close')).toBeTruthy()
			// The ~300ms bookkeeping emit must not resurrect the dialog.
			dialog.vm.$emit('update:open', false)
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.dialogOpen).toBe(false)
			expect(dialogOf(wrapper).props('open')).toBe(false)
			expect(wrapper.find('.nc-dialog-stub').exists()).toBe(false)
		})

		it('cancellable=false hides Cancel and sets no-close', () => {
			const wrapper = mountDialog({ cancellable: false })
			expect(dialogOf(wrapper).props('noClose')).toBe(true)
			expect(wrapper.text()).not.toContain('Cancel')
			// First step: only the primary Next remains.
			expect(wrapper.findAll('button')).toHaveLength(1)
		})

		it('cancellable=true (default) offers Cancel and leaves no-close off', () => {
			const wrapper = mountDialog()
			expect(dialogOf(wrapper).props('noClose')).toBe(false)
			expect(wrapper.text()).toContain('Cancel')
			expect(wrapper.findAll('button')).toHaveLength(2)
		})

		it('still offers Close in the result phase when not cancellable', async () => {
			const wrapper = mountDialog({ cancellable: false })
			wrapper.vm.setResult({ success: true, message: 'All done.' })
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).toContain('Close')
			expect(wrapper.findAll('button')).toHaveLength(1)
		})
	})

	it('marks completed steps with a checkmark and renders connectors', async () => {
		const wrapper = mount(CnWizardDialog, { propsData: { steps }, scopedSlots: buildSlots(), stubs })
		await wrapper.vm.next()
		const done = wrapper.findAll('.cn-wizard-dialog__progress-item--done')
		expect(done.length).toBe(1)
		expect(done.at(0).find('.cn-wizard-dialog__progress-check').exists()).toBe(true)
		// One connector per gap between the three steps.
		expect(wrapper.findAll('.cn-wizard-dialog__progress-connector').length).toBe(2)
		expect(wrapper.findAll('.cn-wizard-dialog__progress-connector--done').length).toBe(1)
	})
})
