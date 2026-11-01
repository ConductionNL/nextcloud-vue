/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqRoadmap: in the board look the compare line above the features page
 * stands 28px in and 24px down at 14px, level with the page title, as the
 * board draws it. pl6 drew it 16px in and 12px down at 15px, so the title
 * and every card under it stood off the board.
 *
 * @spec openspec/changes/roadmap-compare-board-inset/specs/features-roadmap/spec.md
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue'), 'utf8')

describe('the compare line in the board look', () => {
	it('stands at the board page padding, 14px on the normal line', () => {
		expect(source).toMatch(/\.cn-look-board \.cn-features-and-roadmap-page__compare \{[^}]*padding: 24px 28px 0;[^}]*font-size: 14px;[^}]*line-height: normal;/)
	})
})
