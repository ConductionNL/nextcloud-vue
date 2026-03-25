/**
 * Extract the ID from a given value.
 *
 * primarily supports objects with a id or \@self.id property
 * @param {string|object} value - object value
 * @return {string} id
 */
export const extractId = (value) => {
	if (typeof value === 'string') return value
	if (typeof value === 'object' && value?.id) return value.id
	if (typeof value === 'object' && value?.['@self']?.id) { return value['@self'].id }
	return value
}
