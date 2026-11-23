/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A choice step's `note` is a muted line under the options; with
 * `noteStyle: "card"` it is an info note card instead (board DqInstellen,
 * step 4: "Voorbeeldgegevens gebruiken alleen fictieve personen en
 * organisaties." in a blue info card).
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { version: 1, completed: true, steps: {} } })), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { shallowMount } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const schema = require('../../src/schemas/app-manifest-v2.schema.json')

const step = {
	id: 'kind',
	type: 'choice',
	display: 'cards',
	configKey: 'kind',
	title: 'Example data',
	note: 'Sample data uses only fictional people.',
	options: [{ value: 'none', label: 'None' }],
}

/**
 * @param {object} extra Step keys.
 * @return {object} The wrapper.
 */
function mountStep(extra = {}) {
	return shallowMount(CnSetupWizard, {
		props: { appId: 'dossiq', steps: [{ ...step, ...extra }] },
		global: {
			provide: { cnLook: 'board', cnTranslate: (s) => s },
			stubs: { CnWizardDialog: { template: '<div><slot name="step-kind" /></div>' }, NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note-card" :data-type="type"><slot /></div>' } },
		},
	})
}

describe('CnSetupWizard choice note as a card', () => {
	it('keeps the muted line by default', () => {
		const w = mountStep()
		expect(w.find('[data-testid="cn-setup-step-note"]').element.tagName).toBe('P')
		expect(w.findAll('.note-card[data-type="info"]').filter((c) => c.text() === step.note)).toHaveLength(0)
	})

	it('draws the note as an info card with noteStyle: card', () => {
		const w = mountStep({ noteStyle: 'card' })
		const card = w.find('[data-testid="cn-setup-step-note"]')
		expect(card.classes()).toContain('note-card')
		expect(card.attributes('data-type')).toBe('info')
		expect(card.text()).toBe(step.note)
	})

	it('accepts noteStyle in the manifest schema', () => {
		expect(schema.properties.setup.properties.steps.items.properties.noteStyle.enum).toEqual(['line', 'card'])
	})
})
