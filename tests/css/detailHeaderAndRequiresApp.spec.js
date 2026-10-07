/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Stylesheet contracts jsdom cannot measure (pipelinq review E4, F4).
 *
 * E4: the lifecycle bar's `margin: 0 0 8px` made the header row taller than
 * the Edit button beside it. The header resets it, outranking the scoped rule.
 *
 * F4: the "Install <app>" placeholder used plain `justify-content: center`,
 * which overflows a short tile on both sides, so its top ran out of the widget.
 */
const fs = require('fs')
const path = require('path')

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'src', f), 'utf8')

describe('detail page header actions', () => {
	const css = read('css/detail-page.css')

	it('resets the lifecycle bar margin inside the header, with three classes', () => {
		expect(css).toMatch(/\.cn-detail-page \.cn-detail-page__header-actions \.cn-lifecycle-actions \{[^}]*margin: 0;/)
	})

	it('gives every header button the same height', () => {
		expect(css).toMatch(/\.cn-detail-page__header-actions \.button-vue \{[^}]*block-size: var\(--default-clickable-area\)/)
	})
})

describe('requires-app placeholder', () => {
	const css = read('css/dashboard.css')

	it('centres safely, so it never overflows the top of a tile', () => {
		expect(css).toMatch(/\.cn-requires-app\.cn-requires-app\.empty-content,[\s\S]*?justify-content: safe center;/)
		expect(css).toMatch(/overflow: auto;/)
	})

	it('is used by the dashboard tile and the detail widget host', () => {
		expect(read('components/CnDashboardPage/CnDashboardPage.vue')).toContain('cn-dashboard-page__requires-app cn-requires-app')
		expect(read('components/CnDetailWidgetHost/CnDetailWidgetHost.vue')).toContain('class="cn-requires-app"')
	})
})
