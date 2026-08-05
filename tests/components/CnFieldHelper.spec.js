import { mount } from '@vue/test-utils'
import CnFieldHelper from '@/components/CnFieldHelper/CnFieldHelper.vue'

const stubs = {
	NcPopover: {
		template: '<div class="stub-popover"><slot name="trigger" /><slot /></div>',
	},
	InformationOutline: true,
}

const mountHelper = (props) => mount(CnFieldHelper, { props, global: { stubs } })

describe('CnFieldHelper', () => {
	it('renders nothing when there is neither text nor an error', () => {
		expect(mountHelper({}).find('span').exists()).toBe(false)
	})

	it('renders the description with no info button when nothing was split off', () => {
		const wrapper = mountHelper({ text: 'Human-readable name' })
		expect(wrapper.text()).toContain('Human-readable name')
		expect(wrapper.find('.cn-field-helper__trigger').exists()).toBe(false)
	})

	it('keeps the legacy helper class so existing stylesheets still apply', () => {
		const wrapper = mountHelper({ text: 'Human-readable name' })
		expect(wrapper.find('span').classes()).toEqual(
			expect.arrayContaining(['cn-field-helper', 'cn-form-dialog__helper']),
		)
	})

	it('offers an info button carrying the full text when one was split off', () => {
		const wrapper = mountHelper({ text: 'Short lead-in.', more: 'Short lead-in. And a great deal more besides.' })
		expect(wrapper.find('.cn-field-helper__trigger').exists()).toBe(true)
		expect(wrapper.find('.cn-field-helper__full').text()).toBe('Short lead-in. And a great deal more besides.')
	})

	it('toggles the popover from the info button', async () => {
		const wrapper = mountHelper({ text: 'Short lead-in.', more: 'The full text.' })
		const trigger = wrapper.find('.cn-field-helper__trigger')
		expect(trigger.attributes('aria-expanded')).toBe('false')
		await trigger.trigger('click')
		expect(trigger.attributes('aria-expanded')).toBe('true')
	})

	it('shows the error instead of the description and suppresses the popover', () => {
		const wrapper = mountHelper({ text: 'Short lead-in.', more: 'The full text.', error: 'This field is required' })
		expect(wrapper.text()).toContain('This field is required')
		expect(wrapper.text()).not.toContain('Short lead-in.')
		expect(wrapper.find('.cn-field-helper__trigger').exists()).toBe(false)
		expect(wrapper.find('span').classes()).toContain('cn-field-helper--error')
	})

	it('renders the error even when there is no description', () => {
		expect(mountHelper({ error: 'Required' }).text()).toContain('Required')
	})
})
