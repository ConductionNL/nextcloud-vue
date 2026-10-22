/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget can be titled as a side card (`titleTone: "side"`): in the board
 * look a 15px muted heading, as the boards title the cards in a page's right
 * column (DqDagAfsluiten "Uw dag" and "Hoe dit werkt", DqZaaktypeOverzicht
 * "Gegevens"). The Nextcloud look keeps its title.
 *
 * @spec openspec/changes/widget-side-title-tone/specs/widget-side-title-tone/spec.md#requirement-a-widget-can-be-titled-as-a-side-card
 */
import { mount } from '@vue/test-utils'
const fs = require('fs')
const path = require('path')
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnWidgetWrapper titleTone', () => {
	it('marks a side-toned card, and no other', () => {
		expect(mount(CnWidgetWrapper, { props: { title: 'Uw dag', titleTone: 'side', showActions: false } }).classes()).toContain('cn-widget-wrapper--side-title')
		expect(mount(CnWidgetWrapper, { props: { title: 'Uw dag', showActions: false } }).classes()).not.toContain('cn-widget-wrapper--side-title')
	})

	it('sets the side heading in the board look only', () => {
		const selector = '.cn-look-board .cn-widget-wrapper--side-title:not(.cn-look-nextcloud *) .cn-widget-wrapper__title'
		const at = css.indexOf(`${selector} {`)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('font-size: var(--cn-board-side-heading-size, 15px) !important')
		expect(body).toContain('font-weight: 600 !important')
		expect(body).toContain('color: var(--color-text-maxcontrast) !important')
	})
})

describe('CnDashboardPage titleTone', () => {
	it('passes a widget definition\'s titleTone to its card', () => {
		const w = mount(CnDashboardPage, {
			props: {
				widgets: [{ id: 'day', type: 'text', title: 'Uw dag', titleTone: 'side', content: { text: 'x' } }, { id: 'plain', type: 'text', title: 'Plain', content: { text: 'y' } }],
				layout: [{ id: 1, widgetId: 'day', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }, { id: 2, widgetId: 'plain', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 2 }],
			},
		})
		expect(w.vm.getWidgetTitleTone({ widgetId: 'day' })).toBe('side')
		expect(w.vm.getWidgetTitleTone({ widgetId: 'plain' })).toBe('')
		expect(w.vm.kpiWrapperProps({ widgetId: 'day' }).titleTone).toBe('side')
		expect(w.findAll('.cn-widget-wrapper--side-title')).toHaveLength(1)
	})
})

describe('CnDetailWidgetHost titleTone', () => {
	it('passes a widget definition\'s titleTone to the card it draws', () => {
		const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default
		const { h } = require('vue')
		const w = mount(CnDetailWidgetHost, {
			props: { widget: { id: 'g', type: 'custom-g', title: 'Gegevens', titleTone: 'side' }, chrome: 'card', surface: 'detail-page', objectId: 'c1', object: {}, register: 'r', schema: 's', cnRegistry: { 'custom-g': { component: { render: () => h('div') }, chrome: 'card' } } },
			global: { stubs: { CnIcon: true } },
		})
		expect(w.find('.cn-widget-wrapper--side-title').exists()).toBe(true)
	})
})
