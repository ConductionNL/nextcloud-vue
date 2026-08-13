/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for THE PAGE HEADING of every index-shaped page
 * primitive — `CnIndexPage`, `CnSettingsPage`, `CnChatPage`, `CnFilesPage`,
 * `CnLogsPage`.
 *
 * WHAT THIS PROTECTS. Each of these components renders inside Nextcloud's
 * `NcAppContent`, which is the `<main>` landmark (`<main id="app-content-vue">`).
 * All of them used to gate their `<h1>` behind `v-if="showTitle"`, and
 * `showTitle` defaults to `false` — the title being "shown in the sidebar
 * header instead". The sidebar is OUTSIDE `<main>`, so the effect was that the
 * main content region carried no heading at all:
 *
 *   - a screen-reader user gets no announcement of which list they are on;
 *   - "skip to main content" lands on an unlabelled region;
 *   - WCAG 2.4.6 (Headings and Labels) and 1.3.1 (Info and Relationships).
 *
 * Measured blast radius when this was written: 608 of 625 index-page surfaces
 * across 19 consuming apps, because essentially no manifest sets `showTitle`
 * at all — they all inherit the `false` default.
 *
 * WHY THE ASSERTIONS LOOK LIKE THIS. It would be trivial (and worthless) to
 * assert `wrapper.props('showTitle')` or that some component "was rendered".
 * The user-facing property is: *a real heading element, naming the page, sits
 * inside `<main>` and reaches the accessibility tree*. So these tests
 *
 *   1. mount into a genuine `<main>` element,
 *   2. query it for a heading by DOM role,
 *   3. check no ancestor removes it from the accessibility tree, and
 *   4. check the CSS that hides it is a CLIPPING recipe, not `display: none`
 *      — jsdom never loads the stylesheet, so a DOM-only assertion cannot
 *      tell "visually hidden" from "hidden from everyone", which is exactly
 *      the mistake this whole fix is about.
 *
 * Every positive assertion here is paired with a POSITIVE CONTROL that drives
 * the same query to the failing answer, so a green result is evidence about
 * the page and not about the query.
 *
 * @spec openspec/specs/wcag-a11y-anchor/spec.md
 */

const fs = require('fs')
const path = require('path')

// `mock`-prefixed so jest.mock()'s hoisted factory can reference it. Mirrors
// tests/a11y/CnIndexPage.a11y.spec.js.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { expectAccessible } = require('../../src/testing/a11y.js')

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnPageHeader = require('../../src/components/CnPageHeader/CnPageHeader.vue').default

/** Heading tags plus the ARIA equivalent — what "a heading" means to a user agent. */
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]'

/**
 * Whether an element reaches the accessibility tree, walking its ancestors.
 *
 * Deliberately checks the three mechanisms that REMOVE a node from the
 * accessibility tree — `aria-hidden="true"`, the `hidden` attribute, and
 * `display: none` / `visibility: hidden` — and nothing else. The whole point
 * of the visually-hidden recipe is that clipping does NOT appear in this list.
 *
 * @param {Element} element The element to check.
 * @return {boolean} True when neither the element nor any ancestor hides it from AT.
 */
function isExposedToAssistiveTech(element) {
	let node = element
	while (node && node.nodeType === 1) {
		if (node.getAttribute('aria-hidden') === 'true') return false
		if (node.hasAttribute('hidden')) return false
		const style = window.getComputedStyle(node)
		if (style.display === 'none' || style.visibility === 'hidden') return false
		node = node.parentElement
	}
	return true
}

describe('page primitives — accessible heading inside the <main> landmark', () => {
	let main
	let wrapper

	beforeEach(() => {
		mockStore.getCollection = jest.fn(() => [])
		mockStore.getPagination = jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 }))
		// A real <main>: NcAppContent renders `<main id="app-content-vue">`, and
		// the defect is defined relative to that landmark, not to the component.
		main = document.createElement('main')
		document.body.appendChild(main)
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = undefined
		main.remove()
	})

	/**
	 * Mount CnIndexPage into the `<main>` element under test.
	 *
	 * @param {object} [propsData] Extra component props (merged over `title`).
	 * @param {object} [options] Extra mount options, e.g. `slots`.
	 * @return {object} The Vue Test Utils wrapper.
	 */
	function mountInMain(propsData = {}, options = {}) {
		return mount(CnIndexPage, {
			attachTo: main,
			propsData: { title: 'Products', ...propsData },
			mocks: {
				$route: { params: {}, query: {}, name: 'products' },
				$router: { push: jest.fn(), replace: jest.fn() },
			},
			...options,
		})
	}

	describe('CnIndexPage', () => {
		it('renders a heading naming the page inside <main> with showTitle left at its default', () => {
			wrapper = mountInMain()

			const heading = main.querySelector(HEADING_SELECTOR)

			// Guard the guard: `showTitle` really is unset here, so this is the
			// default path 608 of 625 fleet index pages take — not a path only
			// reached by opting in.
			expect(wrapper.props('showTitle')).toBe(false)
			expect(heading).not.toBeNull()
			expect(heading.tagName).toBe('H1')
			expect(heading.textContent.trim()).toBe('Products')
		})

		it('exposes that heading to assistive technology', () => {
			wrapper = mountInMain()

			const heading = main.querySelector(HEADING_SELECTOR)

			// Without this line the test is VACUOUS: `isExposedToAssistiveTech`
			// walks ancestors, so a null heading walks nothing and returns true.
			// Verified — before the fix this spec passed with no heading at all.
			expect(heading).not.toBeNull()
			expect(isExposedToAssistiveTech(heading)).toBe(true)
		})

		it('POSITIVE CONTROL: the same query returns null when the header is genuinely absent', () => {
			// Overriding `#header` with empty content is the one supported way to
			// end up with no heading. If this test ever goes green *and* the two
			// above do too, the query has stopped discriminating and every
			// assertion in this file is worthless.
			wrapper = mountInMain({}, { slots: { header: '<span data-testid="custom-header" />' } })

			expect(main.querySelector('[data-testid="custom-header"]')).not.toBeNull()
			expect(main.querySelector(HEADING_SELECTOR)).toBeNull()
		})

		it('POSITIVE CONTROL: isExposedToAssistiveTech() rejects an aria-hidden ancestor', () => {
			wrapper = mountInMain()
			const heading = main.querySelector(HEADING_SELECTOR)

			heading.parentElement.setAttribute('aria-hidden', 'true')
			expect(isExposedToAssistiveTech(heading)).toBe(false)

			heading.parentElement.removeAttribute('aria-hidden')
			expect(isExposedToAssistiveTech(heading)).toBe(true)
		})

		it('renders exactly one heading — showTitle only changes whether it is visible', () => {
			wrapper = mountInMain()
			const hidden = main.querySelectorAll(HEADING_SELECTOR)
			wrapper.unmount()

			wrapper = mountInMain({ showTitle: true })
			const shown = main.querySelectorAll(HEADING_SELECTOR)

			expect(hidden).toHaveLength(1)
			expect(shown).toHaveLength(1)
			// The visible variant is the same `<h1>` with the clipping class off.
			expect(shown[0].closest('.cn-page-header').classList)
				.not.toContain('cn-page-header--visually-hidden')
		})

		it('has no WCAG 2.1 AA violations with the visually-hidden heading present', async () => {
			wrapper = mountInMain()
			await wrapper.vm.$nextTick()

			await expectAccessible(main)
		})
	})

	describe('CnPageHeader visuallyHidden mode', () => {
		it('keeps the h1 and drops the icon, description and extra slot', () => {
			wrapper = mount(CnPageHeader, {
				attachTo: main,
				propsData: {
					title: 'Products',
					description: 'All products',
					icon: 'HelpCircleOutline',
					visuallyHidden: true,
				},
				slots: { extra: '<button type="button">Add</button>' },
			})

			expect(main.querySelector('h1').textContent.trim()).toBe('Products')
			expect(main.querySelector('[data-testid="cn-page-description"]')).toBeNull()
			// A clipped element that is still focusable is its own WCAG failure
			// (a keyboard user tabs into something they cannot see), so the
			// `extra` slot must not render in this mode.
			expect(main.querySelector('button')).toBeNull()
			expect(main.querySelector('.cn-page-header__icon')).toBeNull()
		})

		it('POSITIVE CONTROL: all three render when visuallyHidden is off', () => {
			wrapper = mount(CnPageHeader, {
				attachTo: main,
				propsData: {
					title: 'Products',
					description: 'All products',
					icon: 'HelpCircleOutline',
					visuallyHidden: false,
				},
				slots: { extra: '<button type="button">Add</button>' },
			})

			expect(main.querySelector('[data-testid="cn-page-description"]')).not.toBeNull()
			expect(main.querySelector('button')).not.toBeNull()
			expect(main.querySelector('.cn-page-header__icon')).not.toBeNull()
		})
	})

	describe('the hiding CSS is a clipping recipe, not a removal', () => {
		// jsdom does not load `src/css/page-header.css`, so no DOM assertion in
		// this file can distinguish "clipped but announced" from "display: none".
		// Assert the stylesheet directly — this is the half of the invariant the
		// rendered DOM cannot carry.
		const css = fs.readFileSync(
			path.join(__dirname, '../../src/css/page-header.css'),
			'utf8',
		)
		const rule = css.slice(css.indexOf('.cn-page-header--visually-hidden'))
			.slice(0, css.slice(css.indexOf('.cn-page-header--visually-hidden')).indexOf('}') + 1)

		it('defines .cn-page-header--visually-hidden', () => {
			expect(css).toContain('.cn-page-header--visually-hidden')
			expect(rule).toContain('clip')
		})

		it('never uses display:none or visibility:hidden, which would un-announce the heading', () => {
			// Same vacuity trap as above: a MISSING rule is the empty string,
			// which matches no forbidden pattern and would report "clean".
			expect(rule).not.toBe('')
			expect(rule).not.toMatch(/display\s*:\s*none/)
			expect(rule).not.toMatch(/visibility\s*:\s*hidden/)
		})

		it('takes the heading out of layout flow so there is no visual regression', () => {
			expect(rule).toMatch(/position\s*:\s*absolute/)
		})
	})
})
