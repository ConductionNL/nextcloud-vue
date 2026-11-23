/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { normaliseLinkActionType } from '../../src/utils/linkButtonActionType.js'

describe('normaliseLinkActionType', () => {
	it.each([
		['external', 'external'],
		['internal', 'internal'],
		['createFile', 'createFile'],
		['url', 'external'],
		['action_id', 'internal'],
		[undefined, 'external'],
		['toString', 'external'],
		['something-else', 'external'],
	])('resolves %p to %p', (declared, expected) => {
		expect(normaliseLinkActionType(declared)).toBe(expected)
	})
})
