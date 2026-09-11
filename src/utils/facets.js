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
 * Normalise the `facets` block of a collection response into sidebar format.
 *
 * Fields whose facet carries no bucket list are skipped entirely, so a caller
 * can tell an unfaceted field from one that faceted to nothing.
 *
 * @param {object} facets The `facets` block of an API response
 * @return {object} `{ fieldName: { values: [{ value, count?, label? }] } }`
 */
export function normalizeFacets(facets) {
	const transformed = {}

	for (const [key, facet] of Object.entries(facets || {})) {
		const buckets = facet?.buckets || facet?.data?.buckets
		if (!buckets) {
			continue
		}
		transformed[key] = { values: buckets.map(normalizeFacetBucket) }
	}

	return transformed
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
