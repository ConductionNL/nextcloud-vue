/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a facts card's action buttons stand at the 34px control
 * height in a main-column card too, not only in the side column: the header's
 * 40px secondary rule reached them through CnActionButtons (PqKassabon
 * "Terugboeken" 40 vs 34). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-facts-card-actions-34/specs/board-facts-card-actions-34/spec.md#requirement-a-facts-cards-action-buttons-are-34px-in-every-card
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: a facts card\'s action buttons', () => {
	const selector = '.cn-look-board .cn-facts-widget__actions.cn-action-buttons:not(.cn-look-nextcloud *) > .button-vue {'

	it('are 34px in every card', () => {
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('--button-size: 34px;')
		expect(body).toContain('--default-clickable-area: 34px;')
		expect(body).toContain('height: 34px;')
		expect(body).toContain('min-height: 34px;')
	})
})
