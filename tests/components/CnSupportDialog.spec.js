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
	appName: 'Decidiq',
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
		expect(links.at(1).attributes('href')).toBe('https://www.conduction.nl/connext')
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

	it('links the feature-request CTA in a new tab and emits @action on click', async () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		const cta = wrapper.find('[data-testid="cn-support-dialog-feature-request"]')
		expect(cta.attributes('href')).toBe(baseProps.featureRequestUrl)
		expect(cta.attributes('target')).toBe('_blank')
		await cta.trigger('click')
		// The browser follows the link; nothing is opened by hand.
		expect(openSpy).not.toHaveBeenCalled()
		expect(wrapper.emitted('action')[0][0]).toMatchObject({
			action: 'feature-request',
			url: baseProps.featureRequestUrl,
		})
		expect(wrapper.emitted('action')[0][0].event).toBeInstanceOf(Event)
	})

	it('links the app-store CTA to its URL', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		expect(wrapper.find('[data-testid="cn-support-dialog-app-store"]').attributes('href')).toBe(baseProps.appStoreUrl)
	})

	it('uses the default donate URL when none is provided', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		expect(wrapper.find('[data-testid="cn-support-dialog-donate"]').attributes('href')).toBe('https://github.com/sponsors/ConductionNL')
	})

	it('uses the default support URL when none is provided', () => {
		const wrapper = mount(CnSupportDialog, { propsData: baseProps, stubs })
		expect(wrapper.find('[data-testid="cn-support-dialog-support"]').attributes('href')).toBe('https://www.conduction.nl/support')
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
