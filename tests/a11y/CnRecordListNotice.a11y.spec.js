/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for a record list drawn as a notice
 * (record-list-string-rows): string rows from an endpoint, as sentences in
 * one toned box. The tone is a colour, so the box is a labelled note with an
 * icon and the words carry the meaning.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { warnings: ['Field Welstandsgebied has no English name.'] } })) },
}))

const CnRecordListWidget = require('../../src/components/CnRecordListWidget/CnRecordListWidget.vue').default
const { invalidateEndpointSourceCache } = require('../../src/composables/useEndpointSource.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

/** Let the endpoint read settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnRecordListWidget notice: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
		invalidateEndpointSourceCache()
	})

	it('has no WCAG 2.1 AA violations as a warning notice', async () => {
		wrapper = mountAttached(CnRecordListWidget, {
			propsData: { content: { endpointSource: { url: '/apps/dossiq/api/case-types/1/publish/validate', responsePath: 'warnings' }, presentation: 'notice', variant: 'warning', lead: '{total} warning:' } },
		})
		await flush()
		expect(wrapper.find('[data-testid="cn-record-list-notice"]').attributes('role')).toBe('note')
		await expectAccessible(wrapper)
	})
})
