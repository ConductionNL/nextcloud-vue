/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The note-card banner: a bold lead before the text, a named icon, its text
 * and lead through the app's translate, and (board look) the first action as a
 * link at the end of the line.
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

const NcNoteCardStub = {
	props: ['type'],
	template: '<div class="note" :data-type="type"><span class="note-icon"><slot name="icon" /></span><slot /></div>',
}

function mountBanner(props = {}, { look = 'nextcloud', translate } = {}) {
	return mount(CnBannerWidget, {
		props: { variant: 'warning', ...props },
		global: {
			provide: { cnLook: look, ...(translate ? { cnTranslate: translate } : {}) },
			stubs: { NcNoteCard: NcNoteCardStub, CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } },
		},
	})
}

describe('CnBannerWidget lead and icon', () => {
	it('draws the lead in bold before the text', () => {
		const w = mountBanner({ lead: '2 aanmeldingen wachten op goedkeuring.', text: 'Aanmelden kan alleen met goedkeuring.' })
		expect(w.find('[data-testid="cn-banner-widget-lead"]').text()).toBe('2 aanmeldingen wachten op goedkeuring.')
		expect(w.find('[data-testid="cn-banner-widget-text"]').text()).toBe('2 aanmeldingen wachten op goedkeuring. Aanmelden kan alleen met goedkeuring.')
	})

	it('shows a banner that has only a lead', () => {
		const w = mountBanner({ lead: 'Heads up' })
		expect(w.find('[data-testid="cn-banner-widget-text"]').text()).toBe('Heads up')
	})

	it('draws a named icon in the note card icon slot, and none without one', () => {
		expect(mountBanner({ text: 'x', icon: 'AccountPlus' }).find('.note-icon .icon').attributes('data-name')).toBe('AccountPlus')
		expect(mountBanner({ text: 'x' }).find('.note-icon .icon').exists()).toBe(false)
	})

	it('puts the text and the lead through the app translate before filling {value}', () => {
		const dictionary = { '{value} sign-ups wait.': '{value} aanmeldingen wachten.', Approval: 'Goedkeuring' }
		const w = mountBanner({ lead: 'Approval', text: '{value} sign-ups wait.', conditionOutcome: { met: true, value: 2 }, visibleWhen: { endpoint: '/x', op: 'gt', value: 0 } }, { translate: (k) => dictionary[k] ?? k })
		expect(w.find('[data-testid="cn-banner-widget-text"]').text()).toBe('Goedkeuring 2 aanmeldingen wachten.')
	})

	it('draws the first action as a link under the board look only', () => {
		const props = { text: 'x', actions: [{ label: 'Beleid wijzigen', href: '/policy' }, { label: 'Second', href: '/second' }] }
		const board = mountBanner(props, { look: 'board' })
		const links = board.findAll('[data-testid="cn-banner-widget-link"]')
		expect(links.map((l) => l.text())).toEqual(['Beleid wijzigen'])
		expect(links[0].attributes('href')).toBe('/policy')
		expect(mountBanner(props).findAll('[data-testid="cn-banner-widget-link"]')).toHaveLength(0)
	})
})
