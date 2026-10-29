/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab's stack can be one sheet of sections (`sections: true`, PqLead
 * "Overzicht"): the stage strip, the deal, its products, its contacts and its
 * flow runs in one panel with a rule between titled sections, not five cards.
 * A widget whose definition says `showTitle: false` draws no title in a stack.
 *
 * @spec openspec/changes/tab-stack-sections/specs/tab-stack-sections/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-stages', type: 'stages', title: 'Stages', showTitle: false },
	{ id: 'w-deal', type: 'data', title: 'Deal' },
	{ id: 'w-lines', type: 'object-list', title: 'Products on this lead' },
]

function mountTabs(tabs) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectId: 'l-1', objectData: { id: 'l-1' }, register: 'r', schema: 'lead' },
		global: {
			stubs: {
				CnDetailWidgetHost: {
					name: 'CnDetailWidgetHost',
					props: ['widget', 'chrome', 'showCardTitle'],
					template: '<div class="host">{{ widget.id }}|{{ chrome }}|{{ showCardTitle }}</div>',
				},
			},
		},
	})
}

describe('CnTabsWidget stack as sections', () => {
	it('marks a stack with `sections: true` as one sheet of sections', async () => {
		const w = mountTabs([{ widgetIds: ['w-stages', 'w-deal', 'w-lines'], label: 'Overview', sections: true }])
		await nextTick()
		const stack = w.find('[data-testid="cn-tabs-widget-stack"]')
		expect(stack.classes()).toContain('cn-tabs-widget__stack--sections')
	})

	it('leaves a plain stack as cards', async () => {
		const w = mountTabs([{ widgetIds: ['w-stages', 'w-deal', 'w-lines'], label: 'Overview' }])
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-stack"]').classes()).not.toContain('cn-tabs-widget__stack--sections')
	})

	it('draws no title for a widget whose definition says showTitle false', async () => {
		const w = mountTabs([{ widgetIds: ['w-stages', 'w-deal', 'w-lines'], label: 'Overview', sections: true }])
		await nextTick()
		expect(w.findAll('.host').map((h) => h.text())).toEqual(['w-stages|card|false', 'w-deal|card|true', 'w-lines|card|true'])
	})
})

describe('look-board-detail.css: a stack of sections', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	/**
	 * The declarations of the rule that starts with `selector`, or '' without one.
	 *
	 * @param {string} selector The rule's selector and opening brace.
	 * @return {string} The rule body.
	 */
	function ruleBody(selector) {
		const at = css.indexOf(selector)
		return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
	}

	it('frames the panel as one card again', () => {
		const body = ruleBody('.cn-look-board .cn-tabs--board.cn-tabs-widget__tabs .cn-tabs__content:has(> .cn-tab:not([hidden]) > .cn-tabs-widget__stack--sections) {')
		expect(body).toContain('border: 1px solid var(--color-border);')
		expect(body).toContain('border-radius: 0 var(--cn-board-card-radius) var(--cn-board-card-radius) var(--cn-board-card-radius);')
		expect(body).toContain('background: var(--color-main-background);')
	})

	it('draws the sections without a card of their own', () => {
		const body = ruleBody('.cn-look-board .cn-tabs--board .cn-tabs__content .cn-tab .cn-tabs-widget__stack--sections.cn-tabs-widget__stack > * > .cn-detail-widget-host > :is(.cn-widget-wrapper, .cn-detail-card) {')
		expect(body).toContain('border: 0;')
		expect(body).toContain('background: transparent;')
	})

	it('rules off a section that follows a titled one', () => {
		const body = ruleBody('.cn-look-board .cn-tabs--board .cn-tabs__content .cn-tab .cn-tabs-widget__stack--sections.cn-tabs-widget__stack > :has(.cn-widget-wrapper__title, .cn-detail-card__title) + .cn-tabs-widget__stack-item::before {')
		expect(body).toContain('height: 1px;')
		expect(body).toContain('background: var(--cn-board-hairline);')
	})
})
