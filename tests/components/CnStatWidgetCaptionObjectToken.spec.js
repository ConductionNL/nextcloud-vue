/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqEvenement "Aangemeld 64 / van 80 plaatsen": a stat tile counted from a
 * register on a detail page names a field of the page's record in its
 * caption with `@object.<field>`. Live drew "van plaatsen": `{capacity}` read
 * the count's payload, which a register count does not have.
 *
 * @spec openspec/changes/stat-caption-object-token/specs/stat-caption-object-token/spec.md#requirement-a-stat-caption-can-name-a-field-of-the-pages-record
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const CAPTION = '[data-testid="cn-stat-widget-caption"]'

/**
 * @param {string} caption The caption.
 * @param {object} object The page record.
 * @return {object} The wrapper.
 */
function mountTile(caption, object) {
	return mount(CnStatWidget, {
		props: { content: { label: 'Registered', caption } },
		global: {
			stubs: { NcLoadingIcon: true },
			provide: { cnObjectContext: ref({ objectId: 'e-1', object, register: 'pipelinq', schema: 'campaignEvent' }) },
		},
	})
}

describe('CnStatWidget caption @object tokens', () => {
	it('fills a field of the page record', () => {
		expect(mountTile('of @object.capacity places', { capacity: 80 }).find(CAPTION).text()).toBe('of 80 places')
	})

	it('drops an unknown field rather than showing the token', () => {
		expect(mountTile('of @object.capacity places', {}).find(CAPTION).text()).toBe('of places')
	})
})
