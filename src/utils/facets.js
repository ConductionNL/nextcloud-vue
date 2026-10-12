/**
 * Facet helpers shared by the object store, the search plugin and the two
 * filter sidebars.
 *
 * The shape on the wire is not ours. OpenRegister emits a terms bucket as
 * `{ key, results, label }` from its object search, and `{ value, count,
 * label }` from its facetable-field discovery. Both are real, so both are
 * read here rather than one being declared correct.
 *
 * The rule these helpers exist to hold is narrower than the field names: a
 * number that was never sent must never reach the screen as a number. An
 * absent count normalises to an absent count and renders as nothing, because
 * `(0)` is a claim about the data that no response supports.
 */

/**
 * Normalise one facet bucket into the sidebar's option shape.
 *
 * `count` and `label` are omitted when the bucket carries neither name for
 * them, so a caller can distinguish "no count" from "a count of zero".
 *
 * @param {object} bucket A raw facet bucket from the API
 * @return {{value: unknown, count?: unknown, label?: unknown}} The normalised option
 */
export function normalizeFacetBucket(bucket) {
	const option = { value: bucket.key ?? bucket.value }

	const count = bucket.results ?? bucket.count
	if (count !== undefined && count !== null) {
		option.count = count
	}

	if (bucket.label !== undefined && bucket.label !== null) {
		option.label = bucket.label
	}

	return option
}

/**
 * The option id that stands for "this property holds no value".
 *
 * Chosen so no real bucket key can collide with it. Selecting it is sent to
 * OpenRegister as `<property>_isnull=true` by {@link facetFilterParams}.
 *
 * @type {string}
 */
export const MISSING_VALUE = '__cn_missing__'

/**
 * Normalise the `facets` block of a collection response into sidebar format.
 *
 * Fields whose facet carries no bucket list are skipped entirely, so a caller
 * can tell an unfaceted field from one that faceted to nothing.
 *
 * What OpenRegister puts beside the buckets is carried through rather than
 * dropped: `missing` (how many objects in scope hold no value, sent as
 * `{ results }` or `{ count }`), `type` and `title`. A missing count is only
 * set when the backend sent one, for the same reason a bucket count is.
 *
 * @param {object} facets The `facets` block of an API response
 * @return {object} `{ fieldName: { values: [{ value, count?, label? }], missing?, type?, title? } }`
 */
export function normalizeFacets(facets) {
	const transformed = {}

	for (const [key, facet] of Object.entries(facets || {})) {
		const buckets = facet?.buckets || facet?.data?.buckets
		if (!buckets) {
			continue
		}
		const normalized = { values: buckets.map(normalizeFacetBucket) }

		const missing = facet.missing?.results ?? facet.missing?.count
		if (typeof missing === 'number') {
			normalized.missing = missing
		}
		for (const name of ['type', 'title']) {
			if (facet[name] !== undefined && facet[name] !== null) {
				normalized[name] = facet[name]
			}
		}

		transformed[key] = normalized
	}

	return transformed
}

/**
 * The sidebar options for one normalised facet, with the missing-value option
 * appended when some objects hold no value.
 *
 * @param {object|undefined} facet        A normalised facet from {@link normalizeFacets}
 * @param {function(number): string} missingLabel Renders the missing option's label from its count
 * @return {Array<{id: unknown, label: string}>|null} The options, or null when the
 *   facet offers nothing, so the caller can fall back to its static options
 */
export function facetOptions(facet, missingLabel) {
	const options = (facet?.values || []).map((v) => ({
		id: v.value,
		label: facetOptionLabel(v),
	}))

	if (typeof facet?.missing === 'number' && facet.missing > 0) {
		options.push({ id: MISSING_VALUE, label: missingLabel(facet.missing) })
	}

	return options.length > 0 ? options : null
}

/**
 * The query parameters one facet selection sends.
 *
 * An ordinary selection is the property itself, one value unwrapped and
 * several as a list. The missing-value option is exclusive: no object both
 * holds one of the chosen values and holds none, so combining them would
 * always answer an empty list. It is sent as `<property>_isnull=true`.
 *
 * @param {string} key      The filtered property
 * @param {Array} values    The selected option ids
 * @return {object} The parameters to merge into the request
 */
export function facetFilterParams(key, values) {
	if (!Array.isArray(values) || values.length === 0) {
		return {}
	}
	if (values.includes(MISSING_VALUE)) {
		return { [`${key}_isnull`]: 'true' }
	}

	return { [key]: values.length === 1 ? values[0] : values }
}

/**
 * Build the visible label for one faceted filter option.
 *
 * A bucket that carries a label renders the label: a facet over a `$ref` keys
 * its buckets by identifier, so without this the filter shows the user a
 * column of uuids. A bucket with no count renders no count at all.
 *
 * @param {object} bucket A normalised facet value: `{ value, count?, label? }`
 * @return {string} The label to render for this option
 */
export function facetOptionLabel(bucket) {
	const text = (bucket.label !== undefined && bucket.label !== null)
		? String(bucket.label)
		: String(bucket.value)

	if (bucket.count === undefined || bucket.count === null) {
		return text
	}

	return `${text} (${bucket.count})`
}
