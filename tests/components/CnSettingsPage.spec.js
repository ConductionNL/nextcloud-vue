/**
 * Tests for CnSettingsPage.
 *
 * Covers Phase 4: empty state, populated state, header/actions slot
 * override, save endpoint dispatch.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { put: jest.fn() },
}))

import { mount } from '@vue/test-utils'
import CnSettingsPage from '@/components/CnSettingsPage/CnSettingsPage.vue'

const stubs = {
	CnSettingsCard: {
		template: '<div class="cn-settings-card-stub"><slot /></div>',
		props: ['title', 'icon', 'collapsible'],
	},
	CnSettingsSection: {
		template: '<div class="cn-settings-section-stub"><slot /></div>',
		props: ['name', 'description', 'docUrl'],
	},
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
}

describe('CnSettingsPage', () => {
	afterEach(() => {
		jest.clearAllMocks()
	})

	it('renders empty when no sections supplied', () => {
		const wrapper = mount(CnSettingsPage, { propsData: { sections: [] }, stubs })
		expect(wrapper.findAll('.cn-settings-card-stub').length).toBe(0)
	})

	it('renders one CnSettingsCard per section (populated state)', () => {
		const sections = [
			{ title: 'general', fields: [{ key: 'enabled', type: 'boolean', label: 'Enabled' }] },
			{ title: 'advanced', fields: [{ key: 'limit', type: 'number', label: 'Limit', default: 50 }] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		expect(wrapper.findAll('.cn-settings-card-stub').length).toBe(2)
	})

	it('honours the #header slot override (mirrors headerComponent dispatch)', () => {
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections: [] },
			stubs,
			scopedSlots: { header: '<div class="custom-header">Custom Settings Header</div>' },
		})
		expect(wrapper.find('.custom-header').exists()).toBe(true)
	})

	it('honours the #actions slot override (mirrors actionsComponent dispatch)', () => {
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections: [] },
			stubs,
			slots: { actions: '<button class="custom-action">Reload</button>' },
		})
		expect(wrapper.find('.cn-settings-page__actions').exists()).toBe(true)
		expect(wrapper.find('.custom-action').exists()).toBe(true)
	})

	it('save() PUTs to saveEndpoint when set', async () => {
		const axios = require('@nextcloud/axios').default
		axios.put.mockResolvedValueOnce({ data: {} })
		const wrapper = mount(CnSettingsPage, {
			propsData: {
				sections: [{ title: 't', fields: [{ key: 'x', type: 'string', label: 'X' }] }],
				saveEndpoint: '/api/custom-settings',
				initialValues: { x: 'hello' },
			},
			stubs,
		})
		await wrapper.vm.save()
		expect(axios.put).toHaveBeenCalledWith('/api/custom-settings', expect.objectContaining({ x: 'hello' }))
	})

	it('save() emits @save with the form data', async () => {
		const axios = require('@nextcloud/axios').default
		axios.put.mockResolvedValueOnce({ data: {} })
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections: [], saveEndpoint: '/api/x', initialValues: { foo: 'bar' } },
			stubs,
		})
		await wrapper.vm.save()
		expect(wrapper.emitted('save')).toBeTruthy()
		expect(wrapper.emitted('save')[0][0]).toEqual({ foo: 'bar' })
	})

	it('save() with no saveEndpoint emits @save without issuing PUT (consumer-managed persistence)', async () => {
		const axios = require('@nextcloud/axios').default
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections: [], saveEndpoint: '', initialValues: { foo: 'bar' } },
			stubs,
		})
		await wrapper.vm.save()
		expect(axios.put).not.toHaveBeenCalled()
		expect(wrapper.emitted('save')).toBeTruthy()
	})

	it('updateField() emits @input with key/value', () => {
		const wrapper = mount(CnSettingsPage, { propsData: { sections: [] }, stubs })
		wrapper.vm.updateField('foo', 'bar')
		expect(wrapper.emitted('input')).toBeTruthy()
		expect(wrapper.emitted('input')[0][0]).toEqual({ key: 'foo', value: 'bar' })
	})

	it('pre-populates field defaults from sections[].fields[].default', () => {
		const wrapper = mount(CnSettingsPage, {
			propsData: {
				sections: [{ title: 'g', fields: [{ key: 'limit', type: 'number', default: 99 }] }],
			},
			stubs,
		})
		expect(wrapper.vm.formData.limit).toBe(99)
	})
})
