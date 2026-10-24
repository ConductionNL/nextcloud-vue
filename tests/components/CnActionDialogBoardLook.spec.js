import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionDialog as board DqArchiveren draws it: the record's icon on a 36px
 * tinted tile, facts without the server's 12px dt/dd padding, a note with an
 * icon of its own (LockOutline), and a board note's text and heading at the
 * note's size even under a theme that sizes every paragraph with !important.
 */
import fs from 'fs'
import path from 'path'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => `/nc${u}` }))

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnActionDialog/CnActionDialog.vue'), 'utf8')
const lookBoard = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const CONFIG = {
	title: 'Archive this case',
	summary: { source: { url: '/apps/dossiq/api/case/@objectId/summary' }, title: '{title}', meta: '{identifier}' },
	facts: [{ title: 'Retention', items: [{ label: 'Archive nomination', value: '{archiveNomination}' }] }],
	note: { variant: 'info', title: 'Read only afterwards', text: 'No more changes.', icon: 'LockOutline' },
	confirm: { label: 'Archive it' },
}

describe('CnActionDialog in the board look', () => {
	beforeEach(() => {
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: { title: 'Verlichting fietspad Lindelaan', identifier: '2026-0082', archiveNomination: 'Vernietigen' } })
	})

	it('sets the record icon on a tile and the note icon the config names', async () => {
		const w = mount(CnActionDialog, {
			props: { config: CONFIG, objectId: 'z-82' },
			global: { stubs: { CnDialog: { template: '<div><slot /><slot name="actions" /></div>' }, CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } } },
		})
		await flushPromises()
		expect(w.find('.cn-action-dialog__summary-icon .icon').attributes('data-name')).toBe('FolderOutline')
		expect(w.find('[data-testid="cn-action-dialog-note"] .icon').attributes('data-name')).toBe('LockOutline')
	})

	it('draws the tile and resets the facts\' cell padding', () => {
		const tile = rule(sfc, '.cn-action-dialog__summary-icon')
		expect(tile).toContain('width: 36px')
		expect(tile).toContain('background: var(--color-primary-element-light)')
		expect(rule(sfc, '.cn-action-dialog__facts dt')).toContain('padding: 0')
		expect(rule(sfc, '.cn-action-dialog__facts dd')).toContain('padding: 0')
	})

	it('keeps a board note\'s text and heading at the note\'s size against a theme', () => {
		const note = '.cn-look-board .notecard.notecard--info:not(.cn-look-nextcloud *)'
		expect(rule(lookBoard, `${note} p`)).toContain('font-size: inherit !important')
		expect(rule(lookBoard, `${note} .notecard__heading`)).toContain('font-size: inherit !important')
	})
})
