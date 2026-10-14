/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnReportsPage under the board look (board DcRapportages): one section per
 * category headed by its label instead of the category filter, uncategorised
 * cards first under no heading, and each card's icon in a tile. Without the
 * look the page is unchanged.
 *
 * @spec openspec/changes/screens-reports-page-board-look/specs/reports-page/spec.md#requirement-the-reports-page-takes-the-board-look
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CONFIG = {
	description: 'Choose a report.',
	categories: { decisions: 'Decisions and votes', meetings: 'Meetings and people', empty: 'Nothing here' },
	cards: [
		{ id: 'v', label: 'Votes', category: 'decisions', route: 'Votes', icon: 'VoteOutline', description: 'How rounds ended.' },
		{ id: 'm', label: 'Attendance', category: 'meetings', route: 'Attendance', icon: 'CalendarCheck' },
		{ id: 'd', label: 'Decisions', category: 'decisions', route: 'Decisions' },
		{ id: 'x', label: 'Overview', route: 'Overview' },
	],
}

function mountPage(look, config = CONFIG) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config } },
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: () => Promise.resolve(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } },
		},
	})
}

describe('CnReportsPage: the board look', () => {
	it('draws one section per category in the declared order, uncategorised first, with no filter', () => {
		const w = mountPage('board')
		expect(w.classes()).toContain('cn-reports-page--board')
		expect(w.find('[data-testid="cn-reports-category"]').exists()).toBe(false)
		const sections = w.findAll('[data-testid="cn-reports-section"]')
		expect(sections).toHaveLength(3)
		expect(sections.map((s) => (s.find('h3').exists() ? s.find('h3').text() : ''))).toEqual(['', 'Decisions and votes', 'Meetings and people'])
		expect(sections[1].findAll('.cn-reports-page__card-title').map((t) => t.text())).toEqual(['Votes', 'Decisions'])
	})

	it('draws a card\'s icon in a tile, and none for a card without an icon or a category line', () => {
		const w = mountPage('board')
		const votes = w.findAll('[data-testid="cn-report-card"]').find((c) => c.text().includes('Votes'))
		expect(votes.find('.cn-reports-page__card-icon .icon-stub').attributes('data-name')).toBe('VoteOutline')
		expect(votes.attributes('href')).toBe('/r/Votes')
		expect(votes.find('.cn-reports-page__card-category').exists()).toBe(false)
		const decisions = w.findAll('[data-testid="cn-report-card"]').find((c) => c.text().includes('Decisions'))
		expect(decisions.find('.cn-reports-page__card-icon').exists()).toBe(false)
	})

	it('keeps the Nextcloud look as it was: the filter, one grid, the category line', () => {
		const w = mountPage('nextcloud')
		expect(w.classes()).not.toContain('cn-reports-page--board')
		expect(w.find('[data-testid="cn-reports-category"]').exists()).toBe(true)
		expect(w.findAll('[data-testid="cn-reports-section"]')).toHaveLength(0)
		expect(w.findAll('[data-testid="cn-report-card"]')).toHaveLength(4)
		expect(w.find('.cn-reports-page__card-icon').exists()).toBe(false)
	})

	it('shows the empty label under the board look when no card is usable', () => {
		const w = mountPage('board', { cards: [{ id: 'z', label: 'No route' }] })
		expect(w.find('[data-testid="cn-reports-empty"]').exists()).toBe(true)
	})

	it('scopes the board rules under the look class with the page guard', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-reports.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		expect(css).toMatch(/\.cn-look-board \.cn-reports-page:not\(\.cn-look-nextcloud \*\) \.cn-reports-page__title \{[^}]*font-size: 28px/)
		expect(css).toMatch(/__section-title \{[^}]*font-size: 18px/)
		expect(css).toMatch(/__card-icon \{[^}]*width: 44px/)
		const index = fs.readFileSync(path.join(__dirname, '../../src/css/index.css'), 'utf8')
		expect(index).toContain("@import './look-board-reports.css';")
	})
})
