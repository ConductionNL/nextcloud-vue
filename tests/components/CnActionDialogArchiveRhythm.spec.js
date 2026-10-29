/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqArchiveren (r34 "Daarna alleen lezen" y +122.5): the action dialog draws
 * its facts, section titles and the reason's help line on the font's normal
 * line, leaves no gap under the text area, and with `fieldsAfterNote` puts
 * the fields after the note, where the board draws the "let the requester
 * know" checkbox.
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnActionDialog/CnActionDialog.vue'), 'utf8')

/**
 * @param {string} selector The selector as written.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = sfc.indexOf(selector + ' {')
	return at === -1 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

const CONFIG = {
	title: 'Archive this case',
	reason: { label: 'Reason', hint: 'Goes into the history of the case.' },
	note: { variant: 'info', title: 'Read only afterwards', text: 'Once archived, the case can no longer be changed.' },
	fields: [{ field: 'notifyRequester', type: 'checkbox', label: 'Let them know', default: true }],
	confirm: { label: 'Archive it', request: { method: 'POST', url: '/x' } },
}

/**
 * @param {object} config The config.
 * @return {Promise<object>} The dialog.
 */
async function mountDialog(config) {
	const w = mount(CnActionDialog, {
		props: { config, objectId: 'z-82', object: { title: 'x' } },
		global: { stubs: { CnDialog: { name: 'CnDialog', template: '<div class="dialog"><slot /><slot name="actions" /></div>' }, NcTextArea: { template: '<textarea data-testid="cn-action-dialog-reason" />' }, CnIcon: true } },
	})
	await flushPromises()
	return w
}

/**
 * @param {object} w The dialog.
 * @return {Array<string>} The test ids of the body's parts, in document order.
 */
function order(w) {
	return w.findAll('[data-testid="cn-action-dialog-reason"], [data-testid="cn-action-dialog-note"], [data-testid^="cn-action-dialog-field-"]')
		.map((el) => el.attributes('data-testid'))
}

describe('CnActionDialog archive rhythm', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('puts the fields before the reason by default', async () => {
		expect(order(await mountDialog(CONFIG))).toEqual(['cn-action-dialog-field-notifyRequester', 'cn-action-dialog-reason', 'cn-action-dialog-note'])
	})

	it('puts the fields after the note with fieldsAfterNote', async () => {
		expect(order(await mountDialog({ ...CONFIG, fieldsAfterNote: true }))).toEqual(['cn-action-dialog-reason', 'cn-action-dialog-note', 'cn-action-dialog-field-notifyRequester'])
	})

	it('sets facts and section titles on the normal line', () => {
		expect(rule('\n\n.cn-action-dialog__facts dt')).toContain('line-height: normal')
		expect(rule('\n\n.cn-action-dialog__facts dd')).toContain('line-height: normal')
		expect(rule('.cn-action-dialog__title')).toContain('line-height: normal')
	})

	it('sets the reason\'s help line at 13px on the normal line, flush under the text area', () => {
		expect(sfc).toContain('class="cn-action-dialog__muted cn-action-dialog__hint"')
		const hint = rule('.cn-action-dialog__hint')
		expect(hint).toContain('font-size: 13px')
		expect(hint).toContain('line-height: normal')
		expect(rule('.cn-action-dialog__reason :deep(.textarea__input)')).toContain('vertical-align: top')
	})
})
