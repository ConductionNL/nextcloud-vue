/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqRoadmap: the Actions menu beside the tabs is a 34px control, the
 * "Hierna" side card sits on the board's near-white ground, and its title
 * runs at line height 1.2.
 *
 * @spec openspec/changes/features-board-board-details/specs/features-board-board-details/spec.md#requirement-the-features-board-draws-the-boards-side-card-and-actions-control
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the scoped rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnFeaturesBoard board details', () => {
	it('draws the Actions menu beside the tabs at 34px', () => {
		const body = rule('.cn-features-board__tab-actions :deep(.action-item__menutoggle)')
		expect(body).toMatch(/\bheight:\s*34px/)
		expect(body).toMatch(/min-height:\s*34px/)
	})

	it('puts the side card on the near-white ground, not the hover grey', () => {
		const body = rule('.cn-features-board__next-card')
		expect(body).toMatch(/background:\s*color-mix\(in srgb, var\(--color-background-hover\) 40%, var\(--color-main-background\)\)/)
	})

	it('sets the side card title at line height 1.2', () => {
		expect(rule('.cn-features-board__next-title')).toMatch(/line-height:\s*1\.2/)
	})
})
