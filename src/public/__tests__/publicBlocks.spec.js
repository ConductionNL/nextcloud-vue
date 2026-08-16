/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The public site-block entry point: its vocabulary and its ONE promise.
 *
 * The promise is that these blocks render where there is no Nextcloud. The
 * transitive-import guard (`scripts/check-public-safe.js`) enforces that at
 * build time; these tests cover the parts a static import walk cannot see —
 * that the registry is populated, that every advertised key resolves to a real
 * component, and that an unknown key is reported rather than silently dropped.
 */

import { mount } from '@vue/test-utils'
import {
	CnSiteCard,
	CnSiteCardGrid,
	CnSiteEmptyState,
	CnSiteGlossary,
	CnSiteHero,
	CnSiteSearch,
	CnSiteSection,
	listSiteBlocks,
	siteBlockFor,
	siteBlockRegistry,
} from '../index.js'

describe('public site blocks — vocabulary', () => {
	it('advertises a non-empty vocabulary', () => {
		// A registry that emptied out would make every `siteBlockFor()` return
		// null, and a renderer would show a page of nothing while every test
		// below still passed on its own terms.
		expect(listSiteBlocks().length).toBeGreaterThan(0)
	})

	it('resolves every advertised key to a real component', () => {
		for (const key of listSiteBlocks()) {
			const block = siteBlockFor(key)
			expect(block).toBeTruthy()
			expect(typeof block).toBe('object')
			expect(block.name).toMatch(/^CnSite/)
		}
	})

	it('reports an unknown key as null rather than guessing', () => {
		// Null is the signal a renderer needs in order to show "unknown block".
		// Falling back to some default block would render the WRONG content and
		// look deliberate.
		expect(siteBlockFor('no-such-block')).toBeNull()
		expect(siteBlockFor('')).toBeNull()
	})

	it('exports each component directly as well as through the registry', () => {
		expect(siteBlockRegistry.hero).toBe(CnSiteHero)
		expect(siteBlockRegistry.search).toBe(CnSiteSearch)
		expect(siteBlockRegistry.section).toBe(CnSiteSection)
		expect(siteBlockRegistry.cardGrid).toBe(CnSiteCardGrid)
		expect(siteBlockRegistry.card).toBe(CnSiteCard)
		expect(siteBlockRegistry.emptyState).toBe(CnSiteEmptyState)
		expect(siteBlockRegistry.glossary).toBe(CnSiteGlossary)
	})
})

describe('public site blocks — markup contract', () => {
	it('the section emits a full-bleed band with a constrained container', () => {
		const wrapper = mount(CnSiteSection, { props: { variant: 'spacing' } })
		expect(wrapper.find('section.ac-section.ac-section--spacing').exists()).toBe(true)
		// The container is what holds the reading column. A band without one
		// renders body copy against the viewport edge.
		expect(wrapper.find('section > .container').exists()).toBe(true)
	})

	it('the hero band is a hero, not a spacing section', () => {
		const wrapper = mount(CnSiteHero, { props: { title: 'Waar bent u naar op zoek?' } })
		expect(wrapper.find('section.ac-section.ac-hero').exists()).toBe(true)
		expect(wrapper.find('.ac-section--spacing').exists()).toBe(false)
		expect(wrapper.text()).toContain('Waar bent u naar op zoek?')
	})

	it('the hero renders NO search box unless asked', () => {
		// An inert search field invites the one interaction it cannot honour,
		// so it is opt-in rather than default.
		const off = mount(CnSiteHero, { props: { title: 'x' } })
		expect(off.find('form').exists()).toBe(false)

		const on = mount(CnSiteHero, { props: { title: 'x', search: true } })
		expect(on.find('form.ac-search-box').exists()).toBe(true)
	})

	it('keeps the heading in the DOM but unpainted when the search carries the prompt', () => {
		// The reference implementation's hero has NO heading element at all, so
		// its page has no h1 — an outline defect not worth copying. The heading
		// stays for structure; it is not PAINTED, because the band defines no
		// colour for text on it and a visible duplicate of the search label
		// would say the same thing twice.
		const wrapper = mount(CnSiteHero, {
			props: { title: 'Waar bent u naar op zoek?', headingLevel: 1, search: true },
		})

		const heading = wrapper.find('h1')
		expect(heading.exists()).toBe(true)
		expect(heading.classes()).toContain('sr-only')

		// And the same words are the visible search label.
		const label = wrapper.find('.ac-search-box__label')
		expect(label.classes()).not.toContain('sr-only')
		expect(label.text()).toBe('Waar bent u naar op zoek?')
	})

	it('paints the heading when there is no search box to carry the prompt', () => {
		const wrapper = mount(CnSiteHero, { props: { title: 'Onderwerpen' } })
		const heading = wrapper.find('h1')
		expect(heading.exists()).toBe(true)
		expect(heading.classes()).not.toContain('sr-only')
	})

	it('lets a host override whether the heading is painted', () => {
		const forced = mount(CnSiteHero, {
			props: { title: 'x', search: true, headingVisible: true },
		})
		expect(forced.find('h1').classes()).not.toContain('sr-only')
	})

	it('the search box is a real form with a named input', () => {
		const wrapper = mount(CnSiteSearch, {
			props: { label: 'Zoeken', inputId: 'q1' },
		})
		const form = wrapper.find('form')
		expect(form.attributes('role')).toBe('search')
		// A label, not a placeholder: a placeholder vanishes on input and is
		// not reliably announced, leaving an unnamed field.
		const label = wrapper.find('label')
		expect(label.attributes('for')).toBe('q1')
		expect(wrapper.find('input#q1').exists()).toBe(true)
		expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
	})

	it('hides the label by CLIPPING, never by removing it from the DOM', () => {
		// `display: none` would hide it from assistive tech too, which is the
		// entire reason the label exists.
		const wrapper = mount(CnSiteSearch, { props: { labelVisible: false } })
		const label = wrapper.find('label')
		expect(label.exists()).toBe(true)
		expect(label.classes()).toContain('sr-only')
	})

	it('the search box emits the term instead of fetching anything', async () => {
		const wrapper = mount(CnSiteSearch)
		await wrapper.find('input').setValue('zaaksysteem')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.emitted('search')).toBeTruthy()
		expect(wrapper.emitted('search')[0]).toEqual(['zaaksysteem'])
	})

	it('a card takes its heading level from the host', () => {
		// Hard-coding <h3> produces a document outline that skips levels
		// wherever the card is placed under a different heading.
		const wrapper = mount(CnSiteCard, {
			props: { title: 'Voor 342 gemeenten', headingLevel: 2 },
		})
		// The CLASS tracks the level too — the design system styles
		// `.utrecht-heading-2`, not `h2`, so a host changing the level to keep
		// a page outline intact must not silently lose the styling with it.
		expect(wrapper.find('h2.utrecht-heading-2').exists()).toBe(true)
		expect(wrapper.find('h3').exists()).toBe(false)
	})

	it('a card link carries the card text, never bare "lees meer"', () => {
		const wrapper = mount(CnSiteCard, {
			props: { title: 'Voor 336 leveranciers', link: '/leveranciers' },
		})
		// `utrecht-link` is what carries the colour; without it the anchor
		// falls back to the browser default rgb(0, 0, 238).
		const link = wrapper.find('a.utrecht-link')
		expect(link.attributes('href')).toBe('/leveranciers')
		// Defaults to the title so a link list read out of context still names
		// its destination.
		expect(link.text()).toBe('Voor 336 leveranciers')
	})

	it('the empty state announces each variant differently', () => {
		// The three variants differ in what they ANNOUNCE, not in how they look,
		// and that is the whole reason this is a component instead of a
		// paragraph. Asserted per variant because picking the wrong
		// announcement for the right visual is the mistake it prevents.

		// loading: the region is working, and will say so again when it settles
		const loading = mount(CnSiteEmptyState, {
			props: { variant: 'loading', title: 'Bezig met laden…' },
		})
		expect(loading.attributes('aria-busy')).toBe('true')
		expect(loading.attributes('aria-live')).toBe('polite')
		expect(loading.attributes('role')).toBeUndefined()

		// error: announced immediately — a visitor who cannot see the page must
		// not wait for content that will never arrive
		const error = mount(CnSiteEmptyState, {
			props: { variant: 'error', title: 'Er ging iets mis' },
		})
		expect(error.attributes('role')).toBe('alert')
		expect(error.attributes('aria-busy')).toBeUndefined()

		// empty: ordinary content. Announcing "there is nothing here" as an
		// alert cries wolf.
		const empty = mount(CnSiteEmptyState, { props: { title: 'Niets gevonden' } })
		expect(empty.attributes('role')).toBeUndefined()
		expect(empty.attributes('aria-busy')).toBeUndefined()
		expect(empty.attributes('aria-live')).toBeUndefined()
	})

	it('the empty state heading class tracks its level', () => {
		// The design system styles `.utrecht-heading-3`, not `h3`; a bare tag
		// renders unstyled, which is how a heading silently loses its type.
		const wrapper = mount(CnSiteEmptyState, {
			props: { title: 'Niets gevonden', headingLevel: 3 },
		})
		expect(wrapper.find('h3.utrecht-heading-3').exists()).toBe(true)
	})

	it('the glossary is a description list, not a stack of divs', () => {
		// `<dl>`/`<dt>`/`<dd>` is what makes a screen reader announce "term,
		// definition" pairs instead of an undifferentiated run of text. The
		// two render identically, which is why this is easy to get wrong and
		// impossible to notice by looking.
		const wrapper = mount(CnSiteGlossary, {
			props: {
				terms: [
					{ term: 'Publicatie', definition: 'Een document dat de gemeente openbaar maakt.' },
					{ term: 'Woo-verzoek', definition: 'Een verzoek om openbaarmaking.' },
				],
			},
		})

		expect(wrapper.find('dl').exists()).toBe(true)
		expect(wrapper.findAll('dt')).toHaveLength(2)
		expect(wrapper.findAll('dd')).toHaveLength(2)
		expect(wrapper.text()).toContain('Publicatie')
		expect(wrapper.text()).toContain('Een verzoek om openbaarmaking.')
	})

	it('renders synonyms, because the old name is often the only one a visitor has', () => {
		// Someone searching for "Wob-verzoek" finds nothing if only the current
		// term is rendered, and concludes the concept is gone rather than
		// renamed.
		const wrapper = mount(CnSiteGlossary, {
			props: {
				synonymsLabel: 'Ook bekend als:',
				terms: [
					{
						term: 'Woo-verzoek',
						definition: 'Een verzoek om openbaarmaking.',
						synonyms: ['Wob-verzoek'],
					},
				],
			},
		})

		expect(wrapper.text()).toContain('Wob-verzoek')
		expect(wrapper.text()).toContain('Ook bekend als:')
	})

	it('treats a bare string synonym as ONE synonym, not one per character', () => {
		// `synonyms` arrives as a string or an array depending on the store
		// that produced it. Spreading the string renders `W, o, b, …` — which
		// is a real list, correctly styled, and complete nonsense.
		const wrapper = mount(CnSiteGlossary, {
			props: { terms: [{ term: 'Woo-verzoek', definition: 'x', synonyms: 'Wob-verzoek' }] },
		})

		expect(wrapper.text()).toContain('Wob-verzoek')
		expect(wrapper.text()).not.toContain('W, o, b')
	})

	it('says something when there are no terms', () => {
		// A bare heading over nothing reads as a page that failed to load.
		const wrapper = mount(CnSiteGlossary, {
			props: { title: 'Begrippenlijst', emptyLabel: 'Nog geen begrippen.' },
		})

		expect(wrapper.find('dl').exists()).toBe(false)
		expect(wrapper.text()).toContain('Nog geen begrippen.')
	})

	it('the glossary heading class tracks its level', () => {
		const wrapper = mount(CnSiteGlossary, {
			props: { title: 'Begrippenlijst', headingLevel: 3, terms: [] },
		})

		expect(wrapper.find('h3.utrecht-heading-3').exists()).toBe(true)
	})

	it('the card grid renders one card per entry and reflows by width', () => {
		const wrapper = mount(CnSiteCardGrid, {
			props: {
				cards: [
					{ title: 'Voor 342 gemeenten' },
					{ title: 'Voor 336 leveranciers' },
					{ title: "Voor 15 community's" },
				],
			},
		})
		expect(wrapper.findAllComponents(CnSiteCard)).toHaveLength(3)
		// auto-fit, not a fixed column count: a fixed three-column grid is the
		// usual reason a card row forces a phone to scroll sideways.
		expect(wrapper.find('.ac-grid').attributes('style')).toContain('auto-fit')
	})
})
