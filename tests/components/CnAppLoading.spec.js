import { mount } from '@vue/test-utils'
import CnAppLoading from '../../src/components/CnAppLoading/CnAppLoading.vue'

describe('CnAppLoading', () => {
	it('renders the default message', () => {
		const wrapper = mount(CnAppLoading)
		expect(wrapper.text()).toContain('Loading...')
	})

	it('renders a custom message via prop', () => {
		const wrapper = mount(CnAppLoading, { propsData: { message: 'Booting…' } })
		expect(wrapper.text()).toContain('Booting…')
	})

	it('renders a logo image when logoUrl is set', () => {
		const wrapper = mount(CnAppLoading, { propsData: { logoUrl: '/img/logo.svg' } })
		expect(wrapper.find('img.cn-app-loading__logo').attributes('src')).toBe('/img/logo.svg')
	})

	it('does not render a logo when logoUrl is empty', () => {
		const wrapper = mount(CnAppLoading)
		expect(wrapper.find('img.cn-app-loading__logo').exists()).toBe(false)
	})

	it('renders #logo slot content overriding the default img', () => {
		const wrapper = mount(CnAppLoading, {
			slots: { logo: '<div class="custom-logo">CUSTOM</div>' },
		})
		expect(wrapper.find('.custom-logo').exists()).toBe(true)
		expect(wrapper.find('img.cn-app-loading__logo').exists()).toBe(false)
	})

	it('uses Nextcloud CSS variables only', () => {
		const wrapper = mount(CnAppLoading)
		const html = wrapper.html()
		expect(html).not.toContain('--nldesign-')
	})
})
