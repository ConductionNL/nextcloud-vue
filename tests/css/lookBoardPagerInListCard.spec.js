/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTeamwachtrij and DqZakenKaart draw the list or the map as one card with
 * the count line and the pager inside it, under a hairline, as a table card
 * does. Live put the pager under a bare list that scrolled inside a 368px
 * column (the rows cut off), and under the map card. In the board look the
 * list and map views' main column is the card; the list keeps the height of
 * its rows. jsdom draws no layout, so the rules are read from the stylesheet.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')

function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: the pager inside the list and map cards', () => {
	it('marks the list view on the main column', () => {
		expect(sfc).toMatch(/'cn-index-page__main--list':\s*currentViewMode === 'list'/)
	})

	it.each(['list', 'map'])('draws the %s view main column as the card', (mode) => {
		const body = bodiesOf(`.cn-look-board .cn-index-page__main.cn-index-page__main--${mode}`)
		expect(body).toContain('border: 1px solid var(--color-border);')
		expect(body).toContain('border-radius: var(--cn-board-card-radius, 12px);')
		expect(body).toContain('background: var(--color-main-background);')
	})

	it('keeps the list card at the height of its rows, so nothing is cut off', () => {
		const body = bodiesOf('.cn-look-board .cn-index-page__main.cn-index-page__main--list')
		expect(body).toContain('align-self: flex-start;')
		expect(body).toContain('overflow: hidden;')
	})

	it('takes the frame off the map card inside it', () => {
		const body = bodiesOf('.cn-look-board .cn-index-page__main--map > .cn-index-page__map-card')
		expect(body).toContain('border: 0;')
		expect(body).toContain('background: transparent;')
	})

	it('keeps the map list inside the card, so it does not run over the footer', () => {
		expect(bodiesOf('.cn-look-board .cn-index-page__main--map > .cn-index-page__map-card > .cn-index-page__map-side')).toContain('max-height: 100%;')
	})

	it('keeps the plain under-grid footer away from the list and map cards', () => {
		const grid = '.cn-look-board .cn-index-page__main:not(.cn-index-page__main--table):not(.cn-index-page__main--list):not(.cn-index-page__main--map) > .cn-pagination--board'
		expect(bodiesOf(grid)).toContain('border-top: 0;')
	})
})
