/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list over an app endpoint shows a refusal in the server's words
 * (DqSociaalDomein "Andere zaken van dit huishouden"), and a failure as the
 * error line.
 *
 * @spec openspec/changes/record-list-endpoint-refusal/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const REFUSAL = 'Only someone who works with the social domain\'s sensitive data on this case can see its household.'

function answer(status, message) {
	const error = new Error(`Request failed with status code ${status}`)
	error.response = { status, data: message ? { message } : {} }
	return error
}

function mountList(content) {
	return mount(CnRecordListWidget, {
		props: { content: { endpointSource: { url: '/apps/dossiq/api/cases/c1/household-cases', responsePath: 'results' }, title: '{title}', ...content } },
		global: { provide: { cnTranslate: (key) => (key === REFUSAL ? 'Alleen wie met de bijzondere gegevens werkt, ziet het huishouden.' : key) } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget endpoint refusal', () => {
	it('shows a 403 in the server\'s words, translated', async () => {
		axios.get.mockRejectedValueOnce(answer(403, REFUSAL))
		const w = mountList({ errorText: 'Could not read' })
		await flush()
		expect(w.find('[data-testid="cn-record-list-error"]').text()).toBe('Alleen wie met de bijzondere gegevens werkt, ziet het huishouden.')
	})

	it('keeps the error text for a failure that is not a refusal', async () => {
		axios.get.mockRejectedValueOnce(answer(500, 'Internal error'))
		const w = mountList({ errorText: 'Could not read' })
		await flush()
		expect(w.find('[data-testid="cn-record-list-error"]').text()).toBe('Could not read')
	})

	it('falls back to the default line for a refusal without a sentence', async () => {
		axios.get.mockRejectedValueOnce(answer(403))
		const w = mountList({})
		await flush()
		expect(w.find('[data-testid="cn-record-list-error"]').text()).not.toBe('')
		expect(w.find('[data-testid="cn-record-list-error"]').text()).not.toContain('status code')
	})
})
