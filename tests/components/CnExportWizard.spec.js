import { mount } from '@vue/test-utils'
import CnExportWizard from '@/components/CnExportWizard/CnExportWizard.vue'

const stubs = {
	NcDialog: {
		template: '<div><slot /><slot name="actions" /></div>',
	},
	NcButton: {
		template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>',
	},
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcSelect: {
		props: ['value', 'options'],
		template: '<div class="stub-select" :data-value="value" :data-options="options.join(\',\')" />',
	},
	ExportIcon: true,
}

describe('CnExportWizard', () => {
	it('renders the form phase with no scopes when scopes is empty', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { dialogTitle: 'Export', scopes: [] },
			stubs,
		})
		expect(wrapper.find('[data-testid-phase="form"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(false)
	})

	it('renders date-range inputs when scopes includes "date-range"', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { scopes: ['date-range'] },
			stubs,
		})
		expect(wrapper.find('#cn-export-wizard-dateFrom').exists()).toBe(true)
		expect(wrapper.find('#cn-export-wizard-dateTo').exists()).toBe(true)
	})

	it('renders regulation as a select when regulations[] is non-empty', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: {
				scopes: ['regulation'],
				regulations: ['GDPR', 'AVG'],
			},
			stubs,
		})
		const inputs = wrapper.findAll('input#cn-export-wizard-regulation')
		// Free-form input not present; select stub present
		expect(inputs.exists()).toBe(false)
	})

	it('renders regulation as a free-form input when regulations[] is empty', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { scopes: ['regulation'], regulations: [] },
			stubs,
		})
		expect(wrapper.find('input#cn-export-wizard-regulation').exists()).toBe(true)
	})

	it('renders schema field when scopes includes "schema"', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { scopes: ['schema'] },
			stubs,
		})
		expect(wrapper.find('input#cn-export-wizard-schema').exists()).toBe(true)
	})

	it('renders format select when formats[] is non-empty', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { formats: ['json', 'xml'] },
			stubs,
		})
		expect(wrapper.find('.stub-select').exists()).toBe(true)
	})

	it('reveals email recipient input when delivery=email is selected', async () => {
		const wrapper = mount(CnExportWizard, {
			propsData: { deliveries: ['download', 'email'] },
			stubs,
		})
		wrapper.vm.formData.delivery = 'email'
		await wrapper.vm.$nextTick()
		expect(wrapper.find('input#cn-export-wizard-emailRecipient').exists()).toBe(true)
	})

	it('emits @confirm with the current form data on confirm', async () => {
		const wrapper = mount(CnExportWizard, {
			propsData: {
				scopes: ['date-range'],
				formats: ['json'],
				defaults: { dateFrom: '2025-01-01', dateTo: '2025-12-31' },
			},
			stubs,
		})
		wrapper.vm.onConfirm()
		expect(wrapper.emitted('confirm')).toBeTruthy()
		expect(wrapper.emitted('confirm')[0][0]).toMatchObject({
			dateFrom: '2025-01-01',
			dateTo: '2025-12-31',
		})
	})

	it('marks loading on confirm until setResult is called', async () => {
		const wrapper = mount(CnExportWizard, { stubs })
		wrapper.vm.onConfirm()
		expect(wrapper.vm.loading).toBe(true)
		wrapper.vm.setResult({ success: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.vm.result).toEqual({ success: true })
	})

	it('switches to the result phase after setResult', async () => {
		const wrapper = mount(CnExportWizard, { stubs })
		wrapper.vm.setResult({ success: true, message: 'Queued.' })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid-phase="form"]').exists()).toBe(false)
	})

	it('renders the jobId in the success banner when provided', async () => {
		const wrapper = mount(CnExportWizard, { stubs })
		wrapper.vm.setResult({ success: true, jobId: 'job-123' })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('job-123')
	})

	it('renders the error in the result phase when result.error is set', async () => {
		const wrapper = mount(CnExportWizard, { stubs })
		wrapper.vm.setResult({ error: 'Boom.' })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Boom.')
	})

	it('resets state on @close and emits close', async () => {
		const wrapper = mount(CnExportWizard, { stubs })
		wrapper.vm.setResult({ success: true })
		wrapper.vm.onClose()
		expect(wrapper.vm.result).toBeNull()
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('uses field-label overrides when provided', () => {
		const wrapper = mount(CnExportWizard, {
			propsData: {
				scopes: ['date-range'],
				fieldLabels: { dateFrom: 'Vanaf', dateTo: 'Tot' },
			},
			stubs,
		})
		const fromLabel = wrapper.find('label[for="cn-export-wizard-dateFrom"]')
		expect(fromLabel.text()).toBe('Vanaf')
		const toLabel = wrapper.find('label[for="cn-export-wizard-dateTo"]')
		expect(toLabel.text()).toBe('Tot')
	})
})
