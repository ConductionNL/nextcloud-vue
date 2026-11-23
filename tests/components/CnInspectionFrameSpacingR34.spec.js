/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie (r34): inside a device frame the widgets stand 12px apart
 * without a rule (the day note and the outbox were 33px under the cards
 * above them), compact cards stand 12px apart (16 on live), and an outbox
 * card's pill spans the title and meta rows, so the card is 61px, not 64.
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

const CnDeviceFramesWidget = require('../../src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue').default
const list = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} css The source.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(css, selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('DqInspectie frame spacing', () => {
	it('stacks a frame\'s widgets as plain sections 12px apart', () => {
		const wrapper = mount(CnDeviceFramesWidget, {
			props: { content: { frames: [{ key: 'today', title: 'Today', widgetIds: ['a', 'b'] }] }, availableWidgets: [{ id: 'a', type: 'record-list' }, { id: 'b', type: 'banner' }] },
			global: { stubs: { CnSectionsWidget: { name: 'CnSectionsWidget', props: ['content'], template: '<div />' } } },
		})
		const content = wrapper.findComponent({ name: 'CnSectionsWidget' }).props('content')
		expect(content.dividers).toBe(false)
		expect(content.gap).toBe(12)
	})

	it('sets compact cards 12px apart', () => {
		expect(rule(list, '.cn-record-list--cards.cn-record-list--compact .cn-record-list__list')).toContain('gap: 12px')
	})

	it('lets an aside pill span the title and meta rows', () => {
		expect(rule(list, '.cn-record-list--pill-aside .cn-record-list__card-pills')).toContain('grid-row: 1 / span 2')
	})
})
