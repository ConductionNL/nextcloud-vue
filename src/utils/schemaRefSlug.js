/**
 * Slugify an OpenRegister `$ref` schema reference into the objects API's
 * schema path segment.
 *
 * OpenRegister resolves `GET /api/objects/{register}/{schema}/...` by schema
 * **slug**, case-insensitively for a single-word title (`Cohort` and `cohort`
 * both answer 200), but a slug is only single-word-safe by accident: a
 * multi-word schema title such as `ReportPeriod` or `LearnerProfile` is
 * registered under its kebab-case slug (`report-period`, `learner-profile`)
 * and the PascalCase title itself 404s. A schema's `$ref` is authored as
 * that PascalCase (or spaced) title, not the slug, so every consumer that
 * built an objects-API path straight from `$ref` shipped the same defect
 * (learniq round-1 defect 7 — verified 2026-09-25: `ReportPeriod` and
 * `LearnerProfile` 404, `report-period` and `learner-profile` 200; 128
 * properties across 52 schema titles were affected, which is why
 * `ReportCardDetail` rendered with every relation panel blank).
 *
 * This module is the one fleet-wide fix: every resolver that turns a
 * `$ref` into an objects-API path segment routes through {@link schemaRefSlug}
 * instead of using the raw title. It is distinct from (and does not
 * replace) `savedViewHelpers.js`'s `schemaSlug()`, which reads an
 * ALREADY-KNOWN slug off a page's `schema` prop (string or `{ slug }`
 * object) — this module derives a slug from a raw, possibly-PascalCase
 * `$ref` title instead, so the two are kept as separate named exports
 * rather than overloading one name for two different inputs.
 *
 * @module utils/schemaRefSlug
 */

/**
 * Kebab-case a schema `$ref` value into the OpenRegister objects-API schema
 * slug, matching the register convention (`SchemaMapper::generateSlug()`):
 * lowercase, every run of non `[a-z0-9]` characters (including a PascalCase
 * word boundary, which the PHP fallback never has to handle because these
 * registers author the slug by hand for multi-word titles) folds to one
 * `-`, leading/trailing dashes trimmed.
 *
 * Idempotent: a value that is already a slug (`report-period`, `cohort`)
 * passes through unchanged, so it is always safe to route an already-correct
 * value through this function defensively.
 *
 * A numeric schema id (OpenRegister accepts either the slug or the numeric
 * id in the objects-API path) is returned unchanged — slugifying a number
 * has no meaning and must never turn `85` into `'85'` and then reject it
 * downstream for being the "wrong" type.
 *
 * @param {unknown} ref A `$ref` value: a bare title/slug (`'ReportPeriod'`,
 *   `'report-period'`), a JSON-Pointer (`'#/components/schemas/ReportPeriod'`),
 *   or a numeric schema id.
 * @return {string|number} The kebab-case slug, the original number, or `''`
 *   for a `ref` that carries no usable identifier (null/undefined/empty).
 */
export function schemaRefSlug(ref) {
	if (typeof ref === 'number') {
		return Number.isNaN(ref) ? '' : ref
	}
	if (typeof ref !== 'string') {
		return ''
	}
	// JSON-Pointer form (`#/components/schemas/<title>`) — take the tail,
	// the same rule `normalizeRef()` in `schema.js` already applies.
	const tail = ref.includes('/') ? ref.substring(ref.lastIndexOf('/') + 1) : ref
	if (tail === '') {
		return ''
	}
	const kebab = tail
		// PascalCase / camelCase word boundaries: `ReportPeriod` -> `Report-Period`,
		// an acronym run followed by a new capitalised word: `HTTPServer` -> `HTTP-Server`.
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.toLowerCase()
		// Spaces, punctuation, parentheses (`Praktijkovereenkomst (POK)`) all
		// fold to a single dash, exactly as the register's own fallback slug
		// generator treats anything outside `[a-z0-9-]`.
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
	return kebab
}
