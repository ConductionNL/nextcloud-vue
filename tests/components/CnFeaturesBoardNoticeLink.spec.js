/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `board.noticeLink` turns a word in the board notice into a link (board
 * DqFunctionaliteiten: "conduction.nl" opens dossiq's comparison page).
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { mount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default
const CnFeaturesAndRoadmapView = require('../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue').default

const NOTICE = 'Hoe dossiq zich verhoudt staat in de vergelijking op conduction.nl. Deze pagina zegt wat dossiq kan.'
const stubs = {
	CnBuildiqEditButton: true,
	CnRoadmapTab: true,
	NcActions: true,
	NcActionLink: true,
	NcActionButton: true,
	NcButton: true,
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
}

function mountBoard(noticeLink, translate = (s) => s) {
	return mount(CnFeaturesBoard, {
		propsData: { features: [{ slug: 'a', title: 'A' }], tabs: false, next: 0, notice: NOTICE, noticeLink },
		provide: { cnTranslate: translate },
		stubs,
	})
}

const notice = (wrapper) => wrapper.find('[data-testid="cn-features-board-notice"]')
const link = (wrapper) => wrapper.find('[data-testid="cn-features-board-notice-link"]')

describe('CnFeaturesBoard noticeLink', () => {
	it('turns the first occurrence of the text into a link that opens in a new tab', () => {
		const wrapper = mountBoard({ text: 'conduction.nl', href: 'https://dossiq.conduction.nl/compare' })
		expect(link(wrapper).text()).toBe('conduction.nl')
		expect(link(wrapper).attributes('href')).toBe('https://dossiq.conduction.nl/compare')
		expect(link(wrapper).attributes('target')).toBe('_blank')
		expect(link(wrapper).attributes('rel')).toBe('noopener noreferrer')
		expect(notice(wrapper).text().replace(/\s+/g, ' ')).toBe(NOTICE)
	})

	it('matches the translated link text and accepts a site-relative href', () => {
		const wrapper = mountBoard({ text: 'the comparison', href: '/apps/dossiq/compare' }, (s) => (s === 'the comparison' ? 'de vergelijking' : s))
		expect(link(wrapper).text()).toBe('de vergelijking')
		expect(link(wrapper).attributes('href')).toBe('/apps/dossiq/compare')
	})

	it('leaves the notice plain without a match or with an unsafe href', () => {
		for (const noticeLink of [
			{ text: 'example.org', href: 'https://example.org' },
			{ text: 'conduction.nl', href: 'javascript:alert(1)' },
			{ text: 'conduction.nl', href: '//evil.example' },
			{ text: 'conduction.nl', href: 'mailto:a@b.nl' },
			null,
		]) {
			const wrapper = mountBoard(noticeLink)
			expect(link(wrapper).exists()).toBe(false)
			expect(notice(wrapper).text()).toBe(NOTICE)
		}
	})

	it('reaches the board through the view board options', () => {
		const board = { name: 'CnFeaturesBoard', props: ['noticeLink', 'notice'], template: '<div />' }
		const wrapper = mount(CnFeaturesAndRoadmapView, {
			propsData: { repo: 'ConductionNL/dossiq', features: [], board: { notice: NOTICE, noticeLink: { text: 'conduction.nl', href: 'https://dossiq.conduction.nl/compare' } } },
			provide: { cnLook: 'board' },
			stubs: { CnFeaturesBoard: board, CnSupportDialog: true },
		})
		expect(wrapper.findComponent(board).props('noticeLink')).toEqual({ text: 'conduction.nl', href: 'https://dossiq.conduction.nl/compare' })
	})
})
