/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */

import { humaniseRuleKey, notificationRuleLabel, resolveLocalised } from '../../src/utils/notificationRuleLabel.js'

describe('humaniseRuleKey', () => {
	it.each([
		['caseAssigned', 'Case assigned'],
		['clientUpdated', 'Client updated'],
		['object_created', 'Object created'],
		['work-digest-ready', 'Work digest ready'],
		['newBRPRecord', 'New BRP record'],
		['onStatusChange', 'On status change'],
		['', ''],
	])('%s → %s', (key, expected) => {
		expect(humaniseRuleKey(key)).toBe(expected)
	})
})

describe('resolveLocalised', () => {
	it('falls back from a regional language to its base, then to English', () => {
		expect(resolveLocalised({ nl: 'Hallo', en: 'Hello' }, 'nl_NL')).toBe('Hallo')
		expect(resolveLocalised({ nl: 'Hallo', en: 'Hello' }, 'de')).toBe('Hello')
		expect(resolveLocalised({ fr: 'Bonjour' }, 'de')).toBe('Bonjour')
		expect(resolveLocalised(null)).toBe('')
	})
})

describe('notificationRuleLabel', () => {
	it('prefers the library wording for the generic keys over the readable key', () => {
		expect(notificationRuleLabel({ notification: 'object_created' }, { known: { object_created: 'When an item is created' } }))
			.toBe('When an item is created')
	})

	it('uses a subject without placeholders', () => {
		expect(notificationRuleLabel({ notification: 'digest', subject: { en: 'Your daily digest' } })).toBe('Your daily digest')
	})
})
