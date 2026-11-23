/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The roadmap page links to the app's comparison on its public site
 * (`compareUrl`, `compareLabel`), so an app needs no wrapper page for one link.
 *
 * @spec openspec/changes/pl4-roadmap-flow/specs/pl4-roadmap-flow/spec.md#requirement-the-roadmap-page-links-to-the-app-comparison
 */

import { mount } from '@vue/test-utils'
import CnFeaturesAndRoadmapPage from '../../src/components/CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue'

jest.mock('@nextcloud/initial-state', () => ({ loadState: (app, key, fallback) => fallback }))

let mockLanguage = 'en'
jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getLanguage: () => mockLanguage,
}))

const stubs = { CnFeaturesAndRoadmapView: { name: 'CnFeaturesAndRoadmapView', template: '<div class="view" />' } }

/**
 * Mount the page.
 *
 * @param {object} props The props.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountPage(props) {
	return mount(CnFeaturesAndRoadmapPage, {
		props: { appId: 'pipelinq', ...props },
		global: { stubs, provide: { cnTranslate: (text) => (text === 'How pipelinq compares' ? 'Hoe pipelinq zich verhoudt' : text) } },
	})
}

describe('CnFeaturesAndRoadmapPage compare link', () => {
	afterEach(() => {
		mockLanguage = 'en'
	})

	it('renders the view alone without a compareUrl', () => {
		const w = mountPage({})
		expect(w.find('[data-testid="cn-roadmap-compare"]').exists()).toBe(false)
		expect(w.find('.view').exists()).toBe(true)
	})

	it('links to the comparison in a new tab, with the label translated and the host named', () => {
		const w = mountPage({ compareUrl: 'https://pipelinq.conduction.nl/compare', compareLabel: 'How pipelinq compares' })
		const link = w.find('[data-testid="cn-roadmap-compare"] a')
		expect(link.attributes('href')).toBe('https://pipelinq.conduction.nl/compare')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
		expect(link.text()).toBe('Hoe pipelinq zich verhoudt')
		expect(w.find(`#${link.attributes('aria-describedby')}`).text()).toBe('Opens pipelinq.conduction.nl in a new tab.')
		expect(w.find('.view').exists()).toBe(true)
	})

	it('takes the address for the reader\'s language from a map', () => {
		mockLanguage = 'nl'
		const w = mountPage({ compareUrl: { default: 'https://pipelinq.conduction.nl/compare', nl: 'https://pipelinq.conduction.nl/nl/compare' } })
		expect(w.find('[data-testid="cn-roadmap-compare"] a').attributes('href')).toBe('https://pipelinq.conduction.nl/nl/compare')
		mockLanguage = 'de'
		const de = mountPage({ compareUrl: { default: 'https://pipelinq.conduction.nl/compare', nl: 'https://pipelinq.conduction.nl/nl/compare' } })
		expect(de.find('[data-testid="cn-roadmap-compare"] a').attributes('href')).toBe('https://pipelinq.conduction.nl/compare')
	})

	it('refuses an address that is not http(s)', () => {
		const w = mountPage({ compareUrl: 'javascript:alert(1)' })
		expect(w.find('[data-testid="cn-roadmap-compare"]').exists()).toBe(false)
	})
})
