/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The navigation under the board look: attention counts, Help before
 * Advanced whatever the manifest declares, no "More" group. Without the look
 * the counter is Nextcloud's bubble and the declared order is kept.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-a-navigation-count-can-ask-for-attention
 * @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-navigation-footer-reads-help-then-advanced
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

const pages = [{ id: 'Cases', route: '/cases' }]
const menu = [
	{ id: 'work', label: 'My work', route: 'Cases', order: 1, count: 6, counterVariant: 'attention' },
	{ id: 'cases', label: 'All cases', route: 'Cases', order: 2, count: 48 },
	{ id: 'forms', label: 'Forms', href: '#forms', section: 'settings', order: 95 },
]

function mountNav(props = {}, nav = {}) {
	return mount(CnAppNav, {
		props,
		global: {
			provide: { cnManifest: { version: '1.0.0', pages, menu, nav: { help: { label: 'Help', href: '#help' }, ...nav } }, cnTranslate: (k) => k },
			mocks: { $route: { name: 'Cases', path: '/cases' }, $router: { resolve: () => ({ href: '#' }), push: jest.fn() } },
		},
	})
}

describe('CnAppNav: counts', () => {
	it('draws a count as a pill under the board look, red when it asks for attention', () => {
		const w = mountNav({ look: 'board' })
		const work = w.find('[data-testid="cn-nav-count-work"]')
		const cases = w.find('[data-testid="cn-nav-count-cases"]')
		expect(work.text()).toBe('6')
		expect(work.classes()).toContain('cn-app-nav__count--attention')
		expect(cases.text()).toBe('48')
		expect(cases.classes()).not.toContain('cn-app-nav__count--attention')
	})

	it('keeps Nextcloud\'s counter bubble without the look, highlighted for attention', () => {
		const w = mountNav()
		expect(w.find('.cn-app-nav__count').exists()).toBe(false)
		const bubbles = w.findAllComponents({ name: 'NcCounterBubble' })
		const byCount = Object.fromEntries(bubbles.map((b) => [b.attributes('count'), b.attributes('type')]))
		expect(byCount['6']).toBe('highlighted')
		expect(byCount['48']).toBeFalsy()
	})

	it('follows the cnLook that CnAppRoot provides', () => {
		const w = mount(CnAppNav, {
			global: {
				provide: { cnLook: 'board', cnManifest: { version: '1.0.0', pages, menu }, cnTranslate: (k) => k },
				mocks: { $route: { name: 'Cases', path: '/cases' }, $router: { resolve: () => ({ href: '#' }), push: jest.fn() } },
			},
		})
		expect(w.find('[data-testid="cn-nav-count-work"]').exists()).toBe(true)
	})
})

describe('CnAppNav: the footer under the board look', () => {
	const order = (w) => {
		const html = w.html()
		return [html.indexOf('data-testid="cn-nav-help"'), html.indexOf('data-testid="cn-nav-settings"')]
	}

	it('puts Help before Advanced when the manifest declares Advanced first', () => {
		const w = mountNav({ look: 'board' }, { footer: ['settings', 'help'] })
		const [help, advanced] = order(w)
		expect(help).toBeGreaterThan(-1)
		expect(help).toBeLessThan(advanced)
		expect(w.find('[data-testid="cn-nav-settings"]').classes()).not.toContain('cn-app-nav__settings--first')
	})

	it('keeps the declared order without the look', () => {
		const w = mountNav({}, { footer: ['settings', 'help'] })
		expect(w.find('[data-testid="cn-nav-settings"]').classes()).toContain('cn-app-nav__settings--first')
	})

	it('renders no "More" group', () => {
		const w = mountNav({ look: 'board' })
		expect(w.text()).not.toMatch(/\bMore\b/)
	})
})
