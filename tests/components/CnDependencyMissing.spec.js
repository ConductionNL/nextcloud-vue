import { mount } from '@vue/test-utils'
import CnDependencyMissing from '../../src/components/CnDependencyMissing/CnDependencyMissing.vue'

describe('CnDependencyMissing', () => {
	it('renders an item per dependency', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: {
				dependencies: [
					{ id: 'openregister', name: 'OpenRegister' },
					{ id: 'opencatalogi', name: 'OpenCatalogi' },
				],
			},
		})
		const items = wrapper.findAll('.cn-dependency-missing__item')
		expect(items).toHaveLength(2)
		expect(items.at(0).text()).toContain('OpenRegister')
		expect(items.at(1).text()).toContain('OpenCatalogi')
	})

	it('falls back to id when no name provided', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: { dependencies: [{ id: 'openregister' }] },
		})
		expect(wrapper.text()).toContain('openregister')
	})

	it('uses dep.installUrl when provided', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: {
				dependencies: [
					{
						id: 'openregister',
						name: 'OpenRegister',
						installUrl: '/index.php/settings/apps/app-details/openregister',
					},
				],
			},
		})
		const link = wrapper.find('.cn-dependency-missing__item-link')
		expect(link.attributes('href')).toBe('/index.php/settings/apps/app-details/openregister')
	})

	it('falls back to /index.php/settings/apps when no installUrl provided', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: { dependencies: [{ id: 'openregister', name: 'OpenRegister' }] },
		})
		expect(wrapper.find('.cn-dependency-missing__item-link').attributes('href')).toBe(
			'/index.php/settings/apps',
		)
	})

	it('uses the enable label when dep.enabled is false', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: {
				dependencies: [{ id: 'openregister', name: 'OpenRegister', enabled: false }],
				enableLabel: 'Enable now',
				installLabel: 'Install now',
			},
		})
		expect(wrapper.find('.cn-dependency-missing__item-link').text()).toBe('Enable now')
	})

	it('uses the install label otherwise', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: {
				dependencies: [{ id: 'openregister', name: 'OpenRegister' }],
				enableLabel: 'Enable now',
				installLabel: 'Install now',
			},
		})
		expect(wrapper.find('.cn-dependency-missing__item-link').text()).toBe('Install now')
	})

	it('uses Nextcloud CSS variables only', () => {
		const wrapper = mount(CnDependencyMissing, {
			propsData: { dependencies: [{ id: 'x', name: 'X' }] },
		})
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})
