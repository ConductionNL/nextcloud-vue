/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detailObjectContext — resolve the object token context (`{ objectId,
 * object, register, schema }`) for `@objectId` / `@object.<field>` token
 * resolution from EITHER detail-surface provider, in the same order the
 * Wave-1 audit-trail widget established:
 *
 *  1. `cnObjectContext` — provided by CnDetailPage's config grid (a
 *     reactive `{ objectId, object, register, schema }` ref, kept current
 *     as the object loads) and by CnAddWidgetModal's data sub-form.
 *  2. `cnDetailObjectContext` — provided by CnPageRenderer for the v2
 *     slot grid (a `{ value: { objectData, schema, objectType, objectId,
 *     register, store } | null }` holder; note the object lives under
 *     `objectData` there).
 *
 * The holder's fields BACKFILL whatever the primary inject leaves null,
 * so a widget mounted where both providers exist never loses `@object.*`
 * resolution to a not-yet-loaded primary context. Returns `null` when
 * neither surface provides anything (dashboards without object scope).
 *
 * Internal helper (not a public export) — used by the endpoint-bound
 * widgets (chart / stat / delta / object-table) so ZGW-style sidebar tabs
 * can interpolate the parent object into endpoint params + source filters
 * (#91 Wave 3).
 *
 * @module utils/detailObjectContext
 */

/**
 * Unwrap a value that may be a plain object, a Vue ref, or a `{ value }`
 * holder.
 *
 * @param {*} v The injected value.
 * @return {object|null} The unwrapped bag, or null.
 */
function unwrap(v) {
	if (!v || typeof v !== 'object') return null
	return ('value' in v) ? (v.value || null) : v
}

/**
 * Build the object token context from the two detail-surface injects.
 *
 * @param {object|null} objectCtx The `cnObjectContext` inject (ref or plain object).
 * @param {object|null} detailCtx The `cnDetailObjectContext` inject (`{ value }` holder).
 * @return {{objectId: (string|number|null), object: (object|null), register: string, schema: (string|object)}|null}
 *   The merged context, or null when neither inject resolves.
 */
export function resolveObjectTokenContext(objectCtx, detailCtx) {
	const primary = unwrap(objectCtx)
	const holder = unwrap(detailCtx)
	if (!primary && !holder) return null
	const fromHolder = holder
		? {
			objectId: holder.objectId ?? null,
			// CnPageRenderer's holder carries the loaded object as `objectData`.
			object: holder.object || holder.objectData || null,
			register: holder.register || '',
			schema: holder.schema || '',
		}
		: {}
	const out = { objectId: null, object: null, register: '', schema: '', ...fromHolder }
	if (primary) {
		// The primary (CnDetailPage) context wins per field, but its null /
		// empty fields fall back to the holder's values.
		if (primary.objectId !== undefined && primary.objectId !== null) out.objectId = primary.objectId
		if (primary.object) out.object = primary.object
		if (primary.register) out.register = primary.register
		if (primary.schema) out.schema = primary.schema
	}
	return out
}
