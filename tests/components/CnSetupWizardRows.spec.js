/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A choice step with `display: "rows"` draws its options as CnChoiceCards
 * radio rows, one per line (board DqInstellen, step 4 "Voorbeeldgegevens").
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default
const { __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')
const schema = require('../../src/schemas/app-manifest-v2.schema.json')

const options = [
	{ value: 'none', label: 'None, I will start empty' },
	{ value: 'demo', label: 'Example data' },
]

/**
 * @param {object} step The choice step.
 * @return {Promise<object>} The wrapper.
 */
async function mountWizard(step) {
	const wrapper = mount(CnSetupWizard, { propsData: { appId: 'dossiq', steps: [step] } })
	await flushPromises()
	return wrapper
}

describe('CnSetupWizard choice rows', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: {} } })
	})

	it('draws a rows step as CnChoiceCards in the rows layout', async () => {
		const wrapper = await mountWizard({ id: 'examples', type: 'choice', display: 'rows', configKey: 'examples', title: 'Example data', options })
		const cards = wrapper.findComponent(CnChoiceCards)
		expect(cards.exists()).toBe(true)
		expect(cards.props('layout')).toBe('rows')
		expect(wrapper.find('[data-testid="cn-choice-cards-rows"]').exists()).toBe(true)
	})

	it('keeps the card grid for a cards step', async () => {
		const wrapper = await mountWizard({ id: 'examples', type: 'choice', display: 'cards', configKey: 'examples', title: 'Example data', options })
		expect(wrapper.findComponent(CnChoiceCards).props('layout')).toBe('cards')
	})

	it('accepts rows in the manifest schema', () => {
		const display = schema.properties.setup.properties.steps.items.properties.display
		expect(display.enum).toContain('rows')
	})
})
