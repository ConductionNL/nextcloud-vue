/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the shared object-token-context resolver (#91 Wave 3):
 * the audit-trail dual-inject order (cnObjectContext wins, the
 * CnPageRenderer cnDetailObjectContext holder backfills), the
 * `objectData` → `object` mapping, and the null cases.
 */

import { ref } from 'vue'
import { resolveObjectTokenContext } from '../../src/utils/detailObjectContext.js'

describe('resolveObjectTokenContext (Wave 3, #91)', () => {
	it('returns null when neither surface provides a context (dashboards)', () => {
		expect(resolveObjectTokenContext(null, null)).toBeNull()
		expect(resolveObjectTokenContext(undefined, { value: null })).toBeNull()
	})

	it('unwraps the CnDetailPage ref shape and passes its fields through', () => {
		const ctx = ref({ objectId: 'z-1', object: { title: 'Zaak' }, register: 'zgw', schema: 'zaak' })
		expect(resolveObjectTokenContext(ctx, null)).toEqual({
			objectId: 'z-1',
			object: { title: 'Zaak' },
			register: 'zgw',
			schema: 'zaak',
		})
	})

	it('maps the CnPageRenderer holder shape — objectData becomes object', () => {
		const holder = {
			value: {
				objectData: { title: 'Zaak 42', url: 'https://zgw/zaken/42' },
				objectId: '42',
				register: 'zgw',
				schema: { slug: 'zaak' },
				store: {},
			},
		}
		expect(resolveObjectTokenContext(null, holder)).toEqual({
			objectId: '42',
			object: { title: 'Zaak 42', url: 'https://zgw/zaken/42' },
			register: 'zgw',
			schema: { slug: 'zaak' },
		})
	})

	it('the primary context wins per field, but its empty fields backfill from the holder', () => {
		// CnDetailPage provides the context ref BEFORE the object loads:
		// objectId set, object still null. The v2 holder already has the
		// loaded object — @object.<field> must not be lost.
		const primary = ref({ objectId: 'z-1', object: null, register: '', schema: 'zaak' })
		const holder = {
			value: { objectData: { url: 'https://zgw/zaken/42' }, objectId: '42', register: 'zgw', schema: 'zaak' },
		}
		expect(resolveObjectTokenContext(primary, holder)).toEqual({
			objectId: 'z-1',
			object: { url: 'https://zgw/zaken/42' },
			register: 'zgw',
			schema: 'zaak',
		})
	})
})
