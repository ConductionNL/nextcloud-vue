/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sort and filter buttons in an expandable row's sub-table head are plain
 * (board PqPipelines). Nextcloud's server rule
 * `button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)`
 * (specificity 0,2,1) beat the scoped single-class rules (0,2,0) and drew
 * each one as a 22.5px grey button with a 3px margin. The rules carry their
 * wrapper class to win.
 *
 * @spec openspec/changes/expandable-row-head-buttons-plain/specs/expandable-row-head-buttons-plain/spec.md#requirement-the-sub-table-head-buttons-stay-plain
 */
const fs = require('fs')
const path = require('path')

const style = fs.readFileSync(path.join(__dirname, '../../src/components/CnExpandableRow/CnExpandableRow.vue'), 'utf8')
	.split('<style')[1]
	.replace(/\/\*[\s\S]*?\*\//g, '')

describe('expandable row sub-table head buttons', () => {
	it('keeps the sort button plain with a rule that outranks the server button rule', () => {
		expect(style).toMatch(/\.cn-expandable-row__th \.cn-expandable-row__sort\s*\{[^}]*background: transparent;[^}]*\}/)
		expect(style).toMatch(/\.cn-expandable-row__th \.cn-expandable-row__sort\s*\{[^}]*border-radius: 0;/)
		expect(style).toMatch(/\.cn-expandable-row__th \.cn-expandable-row__sort\s*\{[^}]*margin: 0;/)
	})

	it('keeps the filter button transparent until hovered or active', () => {
		expect(style).toMatch(/\.cn-expandable-row__filter-anchor \.cn-expandable-row__filter\s*\{[^}]*background: transparent;/)
	})

	it('still tints an active filter', () => {
		expect(style).toMatch(/\.cn-expandable-row__filter-anchor \.cn-expandable-row__filter--active\s*\{[^}]*background: var\(--color-primary-element-light\);/)
	})
})
