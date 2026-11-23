/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A standalone page header (a custom view: PqWeekoverzicht, PqZoekinzicht,
 * PqForecast, PqNieuwsbriefPrestaties, PqPipeline) keeps the rhythm the Dq
 * page headers have: the line under the title 13px below it (not 9.6) and
 * its labelled buttons at the 40px control height (not 34). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-standalone-header-rhythm/specs/board-standalone-page-header/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const STANDALONE = '.cn-look-board .cn-page-header:not(.cn-look-nextcloud *):not(.cn-index-page *):not(.cn-settings-page *):not(.cn-chat-page *):not(.cn-files-page *):not(.cn-form-page *):not(.cn-logs-page *):not(.cn-map-page *):not(.cn-store-page--board *)'

/**
 * The declarations of the rule whose selector list holds every given selector.
 *
 * @param {string[]} selectors Selectors that must share one rule.
 * @return {string} The rule body, or '' when no rule lists them all.
 */
function ruleFor(selectors) {
	const rules = css.split('}')
	const hit = rules.find((r) => {
		const head = r.split('{')[0].split(',').map((s) => s.trim())
		return selectors.every((s) => head.includes(s))
	})
	return hit ? hit.split('{')[1] : ''
}

describe('look-board.css: the standalone page header rhythm', () => {
	it('puts the line under the title 13px below it', () => {
		expect(ruleFor([STANDALONE + ' .cn-page-header__description'])).toContain('margin-top: 12.4px')
	})

	it('draws the labelled header buttons at the control height, not a menu toggle', () => {
		const body = ruleFor([STANDALONE + ' .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty))'])
		expect(body).toContain('--button-size: var(--cn-board-control-height)')
	})
})
