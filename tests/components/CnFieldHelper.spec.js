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
		expect(wrapper.find('span').classes()).toEqual(expect.arrayContaining(['cn-field-helper', 'cn-form-dialog__helper']))
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

	it('shows the error instead of the description and keeps the info button', () => {
		const wrapper = mountHelper({ text: 'Short lead-in.', more: 'The full text.', error: 'This field is required' })
		expect(wrapper.text()).toContain('This field is required')
		expect(wrapper.text()).not.toContain('Short lead-in.')
		expect(wrapper.find('.cn-field-helper__trigger').exists()).toBe(true)
		expect(wrapper.find('span').classes()).toContain('cn-field-helper--error')
	})

	it('renders the error even when there is no description', () => {
		expect(mountHelper({ error: 'Required' }).text()).toContain('Required')
	})

	describe('help (x-help) toggletip', () => {
		it('offers the button for help alone, with no description', () => {
			const wrapper = mountHelper({ help: 'Pick the category from art. 3.3.' })
			expect(wrapper.find('.cn-field-helper__trigger').exists()).toBe(true)
			expect(wrapper.find('.cn-field-helper__full').text()).toBe('Pick the category from art. 3.3.')
		})

		it('names the button "About {label}" and falls back to the old name without a label', () => {
			expect(mountHelper({ help: 'x', label: 'Woo category' }).find('.cn-field-helper__trigger').attributes('aria-label')).toBe('About Woo category')
			expect(mountHelper({ help: 'x' }).find('.cn-field-helper__trigger').attributes('aria-label')).toBe('Show the full description')
		})

		it('shows help then more, and the same text only once', () => {
			expect(mountHelper({ help: 'Help.', more: 'More.' }).find('.cn-field-helper__full').text()).toBe('Help.\n\nMore.')
			expect(mountHelper({ help: 'Same.', more: 'Same.' }).find('.cn-field-helper__full').text()).toBe('Same.')
		})

		it('keeps the button next to an error', () => {
			const wrapper = mountHelper({ help: 'Help.', label: 'Title', error: 'Required' })
			expect(wrapper.text()).toContain('Required')
			expect(wrapper.find('.cn-field-helper__trigger').attributes('aria-label')).toBe('About Title')
		})

		it('announces the opened text in a polite live region', async () => {
			const wrapper = mountHelper({ help: 'The explanation.', label: 'Title' })
			const live = wrapper.find('[role="status"]')
			expect(live.attributes('aria-live')).toBe('polite')
			expect(live.text()).toBe('')
			await wrapper.find('.cn-field-helper__trigger').trigger('click')
			expect(live.text()).toBe('The explanation.')
		})

		it('closes on Escape and returns focus to the button', async () => {
			const wrapper = mount(CnFieldHelper, { props: { help: 'Help.', label: 'Title' }, global: { stubs }, attachTo: document.body })
			const trigger = wrapper.find('.cn-field-helper__trigger')
			await trigger.trigger('click')
			expect(trigger.attributes('aria-expanded')).toBe('true')
			await wrapper.find('.cn-field-helper__full').trigger('keydown', { key: 'Escape' })
			await wrapper.vm.$nextTick()
			expect(trigger.attributes('aria-expanded')).toBe('false')
			expect(document.activeElement).toBe(trigger.element)
			wrapper.unmount()
		})

		it('renders help as text, never HTML', () => {
			const wrapper = mountHelper({ help: '<b>bold</b>' })
			expect(wrapper.find('.cn-field-helper__full b').exists()).toBe(false)
			expect(wrapper.find('.cn-field-helper__full').text()).toBe('<b>bold</b>')
		})
	})

	describe('without help or more', () => {
		// Markup captured from the component before `help` existed.
		const legacy = '<span class="cn-field-helper cn-form-dialog__helper">Human-readable name <!--v-if--></span>'
		const legacyError = '<span class="cn-field-helper cn-form-dialog__helper cn-field-helper--error cn-form-dialog__helper--error">Required <!--v-if--></span>'
		const strip = (html) => html.replace(/<!--[^>]*?(?<!v-if)-->/gs, '').trim()

		it('renders the same markup as before', () => {
			expect(strip(mountHelper({ text: 'Human-readable name' }).html())).toBe(legacy)
			expect(strip(mountHelper({ text: 'Human-readable name', error: 'Required' }).html())).toBe(legacyError)
			expect(strip(mountHelper({ error: 'Required' }).html())).toBe(legacyError)
		})
	})
})
