/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The notification pane shows words, never a rule key.
 *
 * THE BUG: the user-settings pane printed each rule's KEY next to its switch,
 * so a person read "clientUpdated", "caseAssigned" and
 * "substitutionRegisteredForSubstitute" (cloud check, 8 October 2026, pipelinq
 * and dossiq). The key is an identifier for a developer.
 *
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => String(text),
	getLanguage: () => 'nl',
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnNotificationPreferences = require('../../src/components/CnNotificationPreferences/CnNotificationPreferences.vue').default

const STUBS = {
	NcAppSettingsSection: { template: '<section><slot /></section>' },
	NcButton: { template: '<button><slot /></button>' },
	NcCheckboxRadioSwitch: { props: ['modelValue'], template: '<label class="switch"><slot /></label>' },
	NcEmptyContent: { props: ['name'], template: '<div class="empty">{{ name }}</div>' },
	NcLoadingIcon: true,
}

/**
 * Mount the pane with the given entries and context.
 *
 * @param {Array<object>} results What OpenRegister answers.
 * @param {object} [options] `{ provide, props }`.
 * @return {Promise<Array<string>>} The switch labels, in order.
 */
async function labelsFor(results, { provide = {}, props = {} } = {}) {
	axios.get.mockResolvedValue({ data: { results } })
	const wrapper = mount(CnNotificationPreferences, { props, global: { provide, stubs: STUBS } })
	await flushPromises()
	return wrapper.findAll('.switch').map((node) => node.text())
}

function entry(notification, extra = {}) {
	return {
		schema: 'case',
		schemaTitle: 'Case',
		application: 'dossiq',
		notification,
		enabled: true,
		...extra,
	}
}

beforeEach(() => jest.clearAllMocks())

describe('a rule with no label anywhere', () => {
	it('reads as words, not as its key', async () => {
		const labels = await labelsFor([entry('caseAssigned'), entry('substitutionRegisteredForSubstitute'), entry('onCreate')])

		expect(labels).toEqual(['Case assigned', 'Substitution registered for substitute', 'On create'])
	})

	it('never prints the raw camelCase key, which is the control', async () => {
		const labels = await labelsFor([entry('clientUpdated'), entry('leadWon')])

		expect(labels).not.toContain('clientUpdated')
		expect(labels).not.toContain('leadWon')
	})
})

describe('the app supplies labels', () => {
	it('uses the label CnAppRoot provides, keyed by schema and rule', async () => {
		const labels = await labelsFor([entry('caseAssigned'), entry('caseHandoffIntake')], {
			provide: { cnAppId: 'dossiq', cnNotificationLabels: { 'case.caseAssigned': 'Een zaak is aan mij toegewezen' } },
		})

		expect(labels).toEqual(['Een zaak is aan mij toegewezen', 'Case handoff intake'])
	})

	it('accepts a bare rule key and a per-locale map, in the current language', async () => {
		const labels = await labelsFor([entry('onCreate', { schema: 'consultation' })], {
			props: { labels: { onCreate: { en: 'A consultation is requested', nl: 'Er is een adviesvraag' } } },
		})

		expect(labels).toEqual(['Er is een adviesvraag'])
	})
})

describe('the rule carries its own label', () => {
	it('wins over the app map and the readable key', async () => {
		const labels = await labelsFor([entry('caseAssigned', { label: { en: 'Assigned', nl: 'Toegewezen' } })], {
			provide: { cnNotificationLabels: { caseAssigned: 'From the app' } },
		})

		expect(labels).toEqual(['Toegewezen'])
	})

	it('does not use a subject template with placeholders as a label', async () => {
		const labels = await labelsFor([entry('caseAssigned', { subject: { nl: 'Zaak "{{title}}" aan je toegewezen' } })])

		expect(labels).toEqual(['Case assigned'])
	})
})
