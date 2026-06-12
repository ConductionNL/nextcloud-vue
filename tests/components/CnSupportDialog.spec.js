import { mount } from '@vue/test-utils'
import CnSupportDialog from '@/components/CnSupportDialog/CnSupportDialog.vue'

const stubs = {
	NcDialog: {
		template: '<div class="nc-dialog-stub" :data-name="name"><slot /><slot name="actions" /></div>',
		props: ['name', 'size', 'canClose'],
	},
	NcButton: {
		template: '<button :data-button-type="variant" @click="$emit(\'click\', $event)"><slot /></button>',
		props: ['variant', 'wide'],
	},
	HandHeart: true,
	HeartOutline: true,
	Star: true,
	BriefcaseOutline: true,
}

const baseProps = {
	appName: 'Decidesk',
	appSlug: 'decidesk',
	appStoreUrl: 'https://apps.nextcloud.com/apps/decidesk',
	featureRequestUrl: 'https://github.com/ConductionNL/decidesk/issues/new',
}

describe('CnSupportDialog', () => {
	let openSpy

	beforeEach(() => {
		openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
	})

	afterEach(() => {
		openSpy.mockRestore()
	})

	it('renders donate + support (tertiary) above the primary + secondary row', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		const buttons = wrapper.findAll('button')
		expect(buttons.length).toBe(4)
		// Top row: Donate + Business support (tertiary).
		expect(buttons.at(0).attributes('data-testid')).toBe('cn-support-dialog-donate')
		expect(buttons.at(0).attributes('data-button-type')).toBe('tertiary')
		expect(buttons.at(1).attributes('data-testid')).toBe('cn-support-dialog-support')
		expect(buttons.at(1).attributes('data-button-type')).toBe('tertiary')
		// Bottom row: Suggest a feature (primary) + Review on App Store (secondary).
		expect(buttons.at(2).attributes('data-testid')).toBe('cn-support-dialog-feature-request')
		expect(buttons.at(2).attributes('data-button-type')).toBe('primary')
		expect(buttons.at(3).attributes('data-testid')).toBe('cn-support-dialog-app-store')
		expect(buttons.at(3).attributes('data-button-type')).toBe('secondary')
	})

	it('renders the Conduction and apps inline links with default targets', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		const links = wrapper.findAll('a.cn-support-dialog__link')
		expect(links.length).toBe(2)
		expect(links.at(0).attributes('href')).toBe('https://www.conduction.nl')
		expect(links.at(1).attributes('href')).toBe('https://www.conduction.nl/apps')
	})

	it('renders the founder avatar linking to the profile URL', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		const avatarLink = wrapper.find('a.cn-support-dialog__avatar-link')
		expect(avatarLink.exists()).toBe(true)
		expect(avatarLink.attributes('href')).toBe('https://www.linkedin.com/in/rubenlinde/')
		const img = avatarLink.find('img.cn-support-dialog__avatar')
		expect(img.exists()).toBe(true)
		expect(img.attributes('src')).toMatch(/^data:image\/png;base64,/)
	})

	it('renders avatar without a link when founderProfileUrl is empty', () => {
		const wrapper = mount(CnSupportDialog, {
			propsData: { ...baseProps, founderProfileUrl: '' },
			stubs,
		})
		expect(wrapper.find('a.cn-support-dialog__avatar-link').exists()).toBe(false)
		expect(wrapper.find('img.cn-support-dialog__avatar').exists()).toBe(true)
	})

	it('does not use em-dashes in the default body copy', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		expect(wrapper.text()).not.toContain('—')
	})

	it('opens the feature-request URL in a new tab and emits @action', async () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		await wrapper.find('[data-testid="cn-support-dialog-feature-request"]').trigger('click')
		expect(openSpy).toHaveBeenCalledWith(baseProps.featureRequestUrl, '_blank', 'noopener,noreferrer')
		expect(wrapper.emitted('action')[0][0]).toEqual({
			action: 'feature-request',
			url: baseProps.featureRequestUrl,
		})
	})

	it('opens the app-store URL on second button click', async () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		await wrapper.find('[data-testid="cn-support-dialog-app-store"]').trigger('click')
		expect(openSpy).toHaveBeenCalledWith(baseProps.appStoreUrl, '_blank', 'noopener,noreferrer')
	})

	it('uses the default donate URL when none is provided', async () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		await wrapper.find('[data-testid="cn-support-dialog-donate"]').trigger('click')
		expect(openSpy).toHaveBeenCalledWith('https://github.com/sponsors/ConductionNL', '_blank', 'noopener,noreferrer')
	})

	it('uses the default support URL when none is provided', async () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		await wrapper.find('[data-testid="cn-support-dialog-support"]').trigger('click')
		expect(openSpy).toHaveBeenCalledWith('https://www.conduction.nl/support', '_blank', 'noopener,noreferrer')
	})

	it('renders the founder name and title in the signature block', () => {
		const wrapper = mount(CnSupportDialog, {
			propsData: { ...baseProps, founderName: 'Test Person', founderTitle: 'Maintainer' },
			stubs,
		})
		expect(wrapper.text()).toContain('Test Person')
		expect(wrapper.text()).toContain('Maintainer')
	})

	it('uses bodyParagraphs override when provided', () => {
		const custom = ['First custom paragraph.', 'Second.']
		const wrapper = mount(CnSupportDialog, {
			propsData: { ...baseProps, bodyParagraphs: custom },
			stubs,
		})
		expect(wrapper.text()).toContain('First custom paragraph.')
		expect(wrapper.text()).toContain('Second.')
		expect(wrapper.text()).not.toContain("I'm Ruben")
	})
})
