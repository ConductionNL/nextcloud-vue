/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The navigation pieces the Zuiddrecht sidebar board asks for, every one
 * opt-in: a primary action that runs a page action or is drawn solid, a
 * filtered count per entry, a card above the footer, a help entry, and an
 * emblem in the brand block. The first test of each group pins today's
 * rendering for a manifest that declares none of them.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-navigation-primary-action-runs-a-page-action
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-menu-entry-counts-a-filtered-list
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-navigation-carries-a-card-and-a-help-entry
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-brand-block-takes-an-emblem
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

const pages = [{ id: 'Cases', route: '/cases', type: 'index', config: { register: 'dossiq', schema: 'case' } }, { id: 'DayClose', route: '/day' }]
const menu = [{ id: 'cases', label: 'All cases', route: 'Cases' }]

const CnActionButtonsStub = {
	name: 'CnActionButtons',
	props: ['actions'],
	template: '<div class="action-buttons-stub" :data-actions="JSON.stringify(actions)" />',
}
const RouterLinkStub = { name: 'RouterLink', props: ['to'], template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>' }

function mountNav(nav = {}, { provide = {}, menuItems = menu, withRouter = true } = {}) {
	return mount(CnAppNav, {
		global: {
			provide: { cnManifest: { version: '1.0.0', pages, menu: menuItems, nav }, cnTranslate: (k) => k, ...provide },
			mocks: { $route: { name: 'Cases', path: '/cases' }, ...(withRouter ? { $router: { resolve: () => ({ href: '#' }), push: jest.fn() } } : {}) },
			stubs: { CnActionButtons: CnActionButtonsStub, RouterLink: RouterLinkStub },
		},
	})
}

describe('CnAppNav — primary action with an action or solid', () => {
	it('renders a plain primary action as before: no dispatcher, no solid class', () => {
		const w = mountNav({ primaryAction: { label: 'New', route: 'Cases' } })
		expect(w.find('.action-buttons-stub').exists()).toBe(false)
		const btn = w.find('[data-testid="cn-nav-primary-action"]')
		expect(btn.classes()).not.toContain('cn-app-nav__primary-action--solid')
		expect(btn.find('.stub.NcButton').exists()).toBe(true)
	})

	it('runs an open-form action through CnActionButtons as a solid primary entry', () => {
		const w = mountNav({ primaryAction: { id: 'new-case', label: 'New case', icon: 'Plus', action: { type: 'open-form', register: 'dossiq', schema: 'case' } } })
		const stub = w.find('.action-buttons-stub')
		expect(stub.exists()).toBe(true)
		expect(JSON.parse(stub.attributes('data-actions'))).toEqual([
			{ icon: 'Plus', type: 'open-form', register: 'dossiq', schema: 'case', id: 'new-case', label: 'New case', variant: 'primary' },
		])
		expect(w.find('[data-testid="cn-nav-primary-action"]').classes()).toContain('cn-app-nav__primary-action--solid')
	})

	it('re-emits what an open-form action created', () => {
		const w = mountNav({ primaryAction: { label: 'New case', action: { type: 'open-form', register: 'dossiq', schema: 'case' } } })
		w.findComponent(CnActionButtonsStub).vm.$emit('created', { id: 'c-9' })
		expect(w.emitted('primary-action-created')).toEqual([[{ id: 'c-9' }]])
	})

	it('draws a solid full-width button for solid: true without a route', () => {
		const w = mountNav({ primaryAction: { label: 'New case', solid: true } })
		const btn = w.find('[data-testid="cn-nav-primary-action"]')
		expect(btn.classes()).toContain('cn-app-nav__primary-action--solid')
		expect(btn.find('.action-buttons-stub').exists()).toBe(false)
		expect(btn.text()).toContain('New case')
	})
})

describe('CnAppNav — filtered count', () => {
	const filtered = [
		{ id: 'mine', label: 'My work', route: 'Cases', count: { register: 'dossiq', schema: 'case', filter: { assignee: '@me' } } },
		{ id: 'all', label: 'All', route: 'Cases', count: 'auto' },
		{ id: 'lit', label: 'Lit', route: 'Cases', count: 3 },
	]

	it('renders no badge for an object count outside a CnAppRoot, and leaves literal and auto counts alone', () => {
		const w = mountNav({}, { menuItems: filtered, provide: { cnMenuCounts: { dossiq: { case: 48 } } } })
		const bubble = (id) => w.find(`[data-testid="cn-nav-entry-${id}"] .stub.NcCounterBubble`)
		expect(bubble('mine').exists()).toBe(false)
		expect(bubble('all').attributes('count')).toBe('48')
		expect(bubble('lit').attributes('count')).toBe('3')
	})

	it('renders the filtered total CnAppRoot provides per entry id', () => {
		const w = mountNav({}, { menuItems: filtered, provide: { cnMenuItemCounts: { mine: 6 }, cnMenuCounts: { dossiq: { case: 48 } } } })
		expect(w.find('[data-testid="cn-nav-entry-mine"] .stub.NcCounterBubble').attributes('count')).toBe('6')
		expect(w.vm.resolveCount(filtered[0])).toBe(6)
		expect(w.vm.resolveCount(filtered[1])).toBe(48)
	})
})

describe('CnAppNav — card and help', () => {
	it('renders neither by default', () => {
		const w = mountNav({})
		expect(w.find('[data-testid="cn-nav-card"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-nav-help"]').exists()).toBe(false)
	})

	it('renders the card with a router link', () => {
		const w = mountNav({ card: { title: 'Close out your day', text: 'See what is left.', link: { label: 'To the day close', route: 'DayClose' } } })
		const card = w.find('[data-testid="cn-nav-card"]')
		expect(card.find('.cn-app-nav__card-title').text()).toBe('Close out your day')
		expect(card.find('.cn-app-nav__card-text').text()).toBe('See what is left.')
		const link = card.find('[data-testid="cn-nav-card-link"]')
		expect(link.text()).toBe('To the day close')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'DayClose' })
	})

	it('emits card-action for an action link, and takes an href', async () => {
		const w = mountNav({ card: { title: 'Close out', link: { label: 'Go', action: 'day-close' } } })
		const btn = w.find('[data-testid="cn-nav-card-link"]')
		expect(btn.element.tagName).toBe('BUTTON')
		await btn.trigger('click')
		expect(w.emitted('card-action')).toEqual([['day-close']])
		const href = mountNav({ card: { title: 'Close out', link: { label: 'Go', href: '/apps/dossiq/day' } } })
		expect(href.find('[data-testid="cn-nav-card-link"]').attributes('href')).toBe('/apps/dossiq/day')
	})

	it('renders the help entry in the footer with its target', () => {
		const w = mountNav({ help: { label: 'Help and explanation', href: 'https://docs.example.org/dossiq' } })
		const help = w.find('[data-testid="cn-nav-help"]')
		expect(help.exists()).toBe(true)
		expect(help.attributes('name')).toBe('Help and explanation')
		expect(help.attributes('href')).toBe('https://docs.example.org/dossiq')
		expect(help.find('.stub.HelpCircleOutline, svg').exists() || help.html().includes('help-circle')).toBe(true)
	})
})

describe('CnAppNav — brand emblem', () => {
	it('draws the logo as before without an emblem', () => {
		const w = mountNav({ brand: { logo: '/logo.svg', name: 'dossiq' } })
		expect(w.find('.cn-app-nav__brand-logo').attributes('src')).toBe('/logo.svg')
		expect(w.find('[data-testid="cn-nav-brand-emblem"]').exists()).toBe(false)
	})

	it('draws an emblem URL in place of the logo, decorative beside the name', () => {
		const w = mountNav({ brand: { emblem: '/emblem.svg', logo: '/logo.svg', name: 'dossiq', caption: 'Gemeente Zuiddrecht' } })
		const emblem = w.find('[data-testid="cn-nav-brand-emblem"]')
		expect(emblem.attributes('src')).toBe('/emblem.svg')
		expect(emblem.attributes('alt')).toBe('')
		expect(w.find('.cn-app-nav__brand-logo').exists()).toBe(false)
	})

	it('draws the theme emblem for emblem: true', () => {
		const w = mountNav({ brand: { emblem: true, name: 'dossiq' } })
		const emblem = w.find('[data-testid="cn-nav-brand-emblem"]')
		expect(emblem.classes()).toContain('cn-app-nav__brand-emblem--theme')
		expect(emblem.attributes('aria-hidden')).toBe('true')
	})
})
