/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The timeline's "All" chip asks the host app first, as the app's own
 * filter chips do, so it reads the app's word: dossiq says "Alles", as
 * DqZaakHistorie draws it, where the library catalog says "Alle". Without a
 * host translation it falls back to the library's own.
 *
 * @spec openspec/changes/timeline-all-chip-host-label/specs/timeline/spec.md#requirement-the-timelines-all-chip-reads-the-hosts-word
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const stubs = {
	NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcNoteCard: true,
	NcCheckboxRadioSwitch: true,
}

async function chipLabel(translate) {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/timeline/kinds')) {
			return Promise.resolve({ data: { results: [] } })
		}
		if (url.endsWith('/timeline/text-blocks')) {
			return Promise.resolve({ data: { results: [] } })
		}
		if (url === TIMELINE) {
			return Promise.resolve({ data: { canManage: false, results: [{ id: 'e1', message: 'x', kind: '', created: '2026-10-01T09:00:00Z' }] } })
		}
		return Promise.reject(new Error(url))
	})
	const wrapper = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true } },
		global: { stubs, provide: translate ? { cnTranslate: translate } : {} },
	})
	await flushPromises()
	return wrapper.find('[data-testid="cn-timeline-chip-all"]').text().replace(/\s+/g, ' ')
}

describe('timeline All chip', () => {
	it('reads the host app\'s word for All', async () => {
		expect(await chipLabel((key) => ({ All: 'Alles' }[key] || key))).toMatch(/^Alles /)
	})

	it('falls back to the library catalog without a host translation', async () => {
		expect(await chipLabel()).toMatch(/^All /)
	})
})
