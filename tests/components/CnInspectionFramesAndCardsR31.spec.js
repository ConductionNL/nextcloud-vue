/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie (r31 verdicts): the device frames are phones of one height
 * (700) whose screen scrolls, a compact card's meta sits on the normal line
 * (68px a day card), and the outbox cards draw their pill beside the title
 * and meta (`cardPillAside`, 61px).
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

const CnDeviceFramesWidget = require('../../src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue').default
const list = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const frames = fs.readFileSync(path.join(__dirname, '../../src/components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('DqInspectie frames and cards', () => {
	it('sets the frames\' height from content.height, and none without it', () => {
		const sized = mount(CnDeviceFramesWidget, { props: { content: { width: 350, height: 700, frames: [{ key: 'today', title: 'Today', widgetIds: [] }] } } })
		expect(sized.find('[data-testid="cn-device-frame-today"]').attributes('style')).toContain('--cn-device-frame-height: 700px')
		const free = mount(CnDeviceFramesWidget, { props: { content: { frames: [{ key: 'today', title: 'Today', widgetIds: [] }] } } })
		expect(free.find('[data-testid="cn-device-frame-today"]').attributes('style') || '').not.toContain('--cn-device-frame-height')
		expect(rule(frames, '.cn-device-frames-widget__frame')).toContain('height: var(--cn-device-frame-height, auto)')
		expect(rule(frames, ".cn-device-frames-widget__frame[style*='--cn-device-frame-height'] .cn-device-frames-widget__body")).toContain('overflow-y: auto')
	})

	it('sets a compact card\'s meta on the normal line', () => {
		expect(rule(list, '.cn-record-list--compact .cn-record-list__card .cn-record-list__meta')).toContain('line-height: normal')
	})

	it('draws the pill beside the title and meta with cardPillAside', () => {
		expect(list).toContain("'cn-record-list--pill-aside': presentation === 'cards' && content.cardPillAside === true")
		expect(rule(list, '.cn-record-list--pill-aside .cn-record-list__card')).toContain('grid-template-columns: minmax(0, 1fr) auto')
		expect(rule(list, '.cn-record-list--pill-aside .cn-record-list__card-pills')).toContain('align-self: start')
	})
})
