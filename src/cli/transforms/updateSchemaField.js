/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The canonical v2 schema URL.
 */
const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Set the manifest's $schema field to the v2 canonical URL.
 *
 * Pure function — returns a new manifest object (shallow clone).
 *
 * @param {object} manifest Input manifest (v1 or partial v2)
 * @return {object} New manifest object with $schema set to v2 URL
 */
function updateSchemaField(manifest) {
	return { ...manifest, $schema: V2_SCHEMA_URL }
}

module.exports = { updateSchemaField, V2_SCHEMA_URL }
