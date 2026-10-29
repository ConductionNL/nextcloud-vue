/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A caption token with the `tile` format (`{path|tile}`) is written the way
 * the tile writes its own number, so a comparison tile can say what the period
 * before was: "was 21,5% in de periode ervoor" (board PqOperationeel), not
 * "was 21.5".
 *
 * @spec openspec/changes/stat-caption-tile-format/specs/stat-widget/spec.md#requirement-a-caption-token-can-take-the-tiles-own-number-format
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getCanonicalLocale: () => 'nl-NL',
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }

/**
 * @param {object} content The tile's content.
 * @return {Promise<string>} The caption's text.
 */
async function caption(content) {
	const w = mount(CnStatWidget, {
		propsData: { content: { layout: 'stacked', endpointSource: { url: '/apps/x/api/overview' }, ...content } },
		stubs,
		provide: { cnWorkspaceContext: {} },
	})
	await flush()
	await flush()
	return w.find('[data-testid="cn-stat-widget-caption"]').text()
}

describe('CnStatWidget: a caption token in the tile\'s own format', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { rate: 11.1, previousPeriod: { rate: 21.5, count: 5400 } } })
	})

	it('writes a percentage the way the tile does', async () => {
		expect(await caption({
			label: 'Lead conversion',
			format: { style: 'percent', decimals: 1 },
			valueField: 'rate',
			caption: 'was {previousPeriod.rate|tile} in the period before',
		})).toBe('was 21,5% in the period before')
	})

	it('writes a count with the tile\'s grouping', async () => {
		expect(await caption({
			label: 'Contacts',
			format: { style: 'number', decimals: 0 },
			valueField: 'previousPeriod.count',
			caption: 'contact moments, was {previousPeriod.count|tile}',
		})).toBe('contact moments, was 5.400')
	})

	it('leaves the token empty when the payload has no value there', async () => {
		expect(await caption({
			label: 'Contacts',
			format: { style: 'number', decimals: 0 },
			valueField: 'rate',
			caption: 'was {previousPeriod.missing|tile}',
		})).toBe('was')
	})
})
