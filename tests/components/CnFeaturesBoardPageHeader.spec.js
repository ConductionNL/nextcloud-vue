const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Features and roadmap page in the board look has the board page header
 * (DqFunctionaliteiten): no extra padding around the board, the board's header
 * buttons, a 14px muted meta line and segmented options 2px apart.
 *
 * @spec openspec/changes/board-features-page-header/specs/board-features-page-header/spec.md#requirement-the-board-features-page-has-the-board-page-header
 */
const fs = require('fs')
const path = require('path')
const CnFeaturesAndRoadmapView = require('../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue').default

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8')

/**
 * @param {string} look The look to provide.
 * @return {object} The mounted view.
 */
function mountView(look) {
	return mount(CnFeaturesAndRoadmapView, {
		stubs: { CnFeaturesBoard: { template: '<div class="board" />' }, CnFeaturesTab: true, CnRoadmapTab: true, CnCapabilityTable: true, CnSupportDialog: true, NcButton: true, NcNoteCard: true, NcEmptyContent: true },
		propsData: { repo: 'ConductionNL/dossiq', features: [{ slug: 'a', title: 'A' }] },
		provide: { cnLook: look, cnHostsIndexSidebar: true, cnIndexSidebarConfig: { value: null } },
	})
}

describe('the board features page header', () => {
	it('marks the view in the board look, and only there', () => {
		expect(mountView('board').classes()).toContain('cn-features-and-roadmap-view--board')
		expect(mountView('nextcloud').classes()).not.toContain('cn-features-and-roadmap-view--board')
	})

	it('adds no padding around the board', () => {
		expect(read('components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue')).toMatch(/\.cn-features-and-roadmap-view--board \{[^}]*padding: 0;/)
	})

	it('gives the board\'s header buttons the board header button rules', () => {
		const css = read('css/look-board.css')
		expect(css).toContain('.cn-look-board .cn-features-board__header-actions:not(.cn-look-nextcloud *) .button-vue {')
		expect(css).toContain('.cn-look-board .cn-features-board__header-actions:not(.cn-look-nextcloud *) .button-vue--primary {')
	})

	it('draws the meta line 14px and the segmented options without margin in the soft ink', () => {
		const sfc = read('components/CnFeaturesBoard/CnFeaturesBoard.vue')
		expect(sfc).toMatch(/\.cn-features-board__subtitle \{[^}]*font-size: 14px;/)
		expect(sfc).toMatch(/\.cn-features-board__filter--segmented \.cn-features-board__filter-option \{[^}]*margin: 0;[^}]*color: var\(--cn-board-text-soft, var\(--color-main-text\)\);/)
	})
})
