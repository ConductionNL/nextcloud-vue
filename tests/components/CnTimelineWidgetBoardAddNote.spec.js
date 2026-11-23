/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqOrganisatie / PqKlant "Activiteit": in the board look the add-note button
 * is the outlined 40px control, as the DqZaakHistorie composer draws it.
 * pl6 drew a 34px primary button.
 *
 * @spec openspec/changes/board-timeline-add-note-outlined/specs/timeline-widget/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: { items: [], page: 1, pages: 1 } })), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const { mount, flushPromises } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const CONTENT = {
	layout: 'feed',
	endpointSource: { url: '/apps/pipelinq/api/timeline', params: { entityType: 'client', entityId: '@objectId' } },
	composer: { placeholder: 'Add an internal note.', label: 'Add note', submitLabel: 'Add note' },
}

async function addNoteVariant(look) {
	const w = mount(CnTimelineWidget, {
		props: { objectId: 'k-1', register: 'pipelinq', schema: 'client', content: CONTENT },
		global: {
			provide: { cnLook: look },
			stubs: {
				CnNoteComposer: { template: '<textarea />' },
				NcButton: { props: ['variant', 'disabled'], template: '<button :data-variant="variant"><slot /></button>' },
			},
		},
	})
	await flushPromises()
	return w.find('[data-testid="cn-timeline-widget-add-note"]').attributes('data-variant')
}

describe('CnTimelineWidget add-note button', () => {
	it('is outlined in the board look', async () => {
		expect(await addNoteVariant('board')).toBe('secondary')
	})

	it('stays primary in the Nextcloud look', async () => {
		expect(await addNoteVariant('nextcloud')).toBe('primary')
	})

	it('is the 40px board control in the board look', () => {
		const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnTimelineWidget/CnTimelineWidget.vue'), 'utf8')
		expect(source).toMatch(/\.cn-look-board \.cn-timeline-widget__composer :deep\(\.button-vue\) \{\s*--button-size: var\(--cn-board-control-height, 40px\);/)
	})
})
