/**
 * Event key constants for OpenRegister notify_push events.
 *
 * Mirrors the PHP constants from OCA\OpenRegister\Push\PushEvents so that
 * event strings are defined in exactly one place on the frontend. All other
 * modules MUST import from this file — no hardcoded strings elsewhere.
 *
 * Backend reference: lib/Push/PushEvents.php
 *   PushEvents::OR_OBJECT     = 'or-object'
 *   PushEvents::OR_COLLECTION = 'or-collection'
 */

/** Base prefix for single-object update events. Append `-{uuid}` to target one object. */
export const OR_OBJECT_PREFIX = 'or-object'

/** Base prefix for collection-level invalidation events. Append `-{registerSlug}-{schemaSlug}`. */
export const OR_COLLECTION_PREFIX = 'or-collection'

/**
 * Build the event key for a single-object subscription.
 *
 * @param {string} uuid The object UUID
 * @return {string} Event key, e.g. `'or-object-uuid-abc'`
 */
export function buildObjectKey(uuid) {
	return `${OR_OBJECT_PREFIX}-${uuid}`
}

/**
 * Build the event key for a collection-level subscription.
 *
 * @param {string} registerSlug The OR register slug
 * @param {string} schemaSlug   The OR schema slug
 * @return {string} Event key, e.g. `'or-collection-zaken-meldingen'`
 */
export function buildCollectionKey(registerSlug, schemaSlug) {
	return `${OR_COLLECTION_PREFIX}-${registerSlug}-${schemaSlug}`
}
