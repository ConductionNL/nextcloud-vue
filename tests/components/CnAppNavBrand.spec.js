/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The brand block at the top of CnAppNav: `brand` prop, `nav.brand` in the
 * manifest, and the `brand` slot.
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const menu = [{ id: 'cases', label: 'Cases', route: 'cases' }]
const brand = { logo: '/apps/thematiq/img/logo.svg', name: 'dossiq', caption: 'Gemeente Zuiddrecht' }

/**
 * @param {object} [options] `manifest`, `propsData`, `slots`, `translate`.
 * @return {object} The mounted wrapper.
 */
function mountNav({ manifest = { version: '1.0.0', pages: [], menu }, propsData = {}, slots = {}, translate = (k) => k } = {}) {
	return mount(CnAppNav, {
		propsData,
		slots,
		global: {
			provide: { cnManifest: manifest, cnTranslate: translate },
			mocks: { $route: { name: 'cases', path: '/cases' }, $router: { resolve: () => ({ href: '#' }) } },
		},
	})
}

describe('CnAppNav brand', () => {
	it('renders no brand block when none is declared, so an existing navigation is unchanged', () => {
		const wrapper = mountNav()
		expect(wrapper.find('[data-testid="cn-nav-brand"]').exists()).toBe(false)
		expect(wrapper.html()).not.toContain('cn-app-nav__brand')
	})

	it('renders logo, name and caption from the manifest\'s nav.brand', () => {
		const wrapper = mountNav({ manifest: { version: '1.0.0', pages: [], menu, nav: { brand } } })
		const block = wrapper.find('[data-testid="cn-nav-brand"]')
		expect(block.find('img').attributes('src')).toBe('/apps/thematiq/img/logo.svg')
		expect(block.find('.cn-app-nav__brand-name').text()).toBe('dossiq')
		expect(block.find('.cn-app-nav__brand-caption').text()).toBe('Gemeente Zuiddrecht')
	})

	it('lets the brand prop win over the manifest', () => {
		const wrapper = mountNav({
			manifest: { version: '1.0.0', pages: [], menu, nav: { brand } },
			propsData: { brand: { name: 'pipelinq' } },
		})
		expect(wrapper.find('.cn-app-nav__brand-name').text()).toBe('pipelinq')
		expect(wrapper.find('[data-testid="cn-nav-brand"] img').exists()).toBe(false)
		expect(wrapper.find('.cn-app-nav__brand-caption').exists()).toBe(false)
	})

	it('treats the logo as decorative beside a name, and names it when it stands alone', () => {
		const withName = mountNav({ propsData: { brand } })
		expect(withName.find('[data-testid="cn-nav-brand"] img').attributes('alt')).toBe('')

		const alone = mountNav({ propsData: { brand: { logo: '/logo.svg', alt: 'Gemeente Zuiddrecht' } } })
		expect(alone.find('[data-testid="cn-nav-brand"] img').attributes('alt')).toBe('Gemeente Zuiddrecht')
		expect(alone.find('.cn-app-nav__brand-text').exists()).toBe(false)
	})

	it('runs name and caption through the translate function', () => {
		const wrapper = mountNav({
			propsData: { brand: { name: 'app.name', caption: 'app.org' } },
			translate: (key) => ({ 'app.name': 'dossiq', 'app.org': 'Gemeente Zuiddrecht' })[key] ?? key,
		})
		expect(wrapper.find('.cn-app-nav__brand-name').text()).toBe('dossiq')
		expect(wrapper.find('.cn-app-nav__brand-caption').text()).toBe('Gemeente Zuiddrecht')
	})

	it('renders nothing for an empty brand object', () => {
		expect(mountNav({ propsData: { brand: {} } }).find('[data-testid="cn-nav-brand"]').exists()).toBe(false)
	})

	it('lets a host replace the block through the brand slot, with the resolved brand in scope', () => {
		const wrapper = mountNav({
			propsData: { brand },
			slots: { brand: ({ brand: resolved }) => `own:${resolved.name}` },
		})
		expect(wrapper.text()).toContain('own:dossiq')
		expect(wrapper.find('[data-testid="cn-nav-brand"]').exists()).toBe(false)
	})
})

describe('manifest nav.brand', () => {
	const manifest = (nav) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [],
		nav,
	})

	it('accepts logo, name, caption and alt', () => {
		const result = validateManifestV2(manifest({ brand: { ...brand, alt: 'Zuiddrecht' } }))
		expect(result.errors).toEqual([])
	})

	it('refuses an unknown brand key', () => {
		expect(validateManifestV2(manifest({ brand: { title: 'dossiq' } })).valid).toBe(false)
	})
})
