<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnGroupNameCell: one Nextcloud group id shown as the group's display name.
  The name is looked up once per page (utils/groupAutocomplete.js); until it
  arrives, and when it cannot be found, the cell shows the id.
-->
<template>
	<span class="cn-group-name-cell" :title="gid">{{ label }}</span>
</template>

<script>
import { groupDisplayName, loadGroupDisplayName } from '../../utils/groupAutocomplete.js'

/**
 * CnGroupNameCell renders a Nextcloud group id as its display name.
 *
 * ```vue
 * <CnGroupNameCell gid="toezicht" />
 * ```
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-a-group-cell-shows-the-groups-display-name
 */
export default {
	name: 'CnGroupNameCell',

	props: {
		/** The group id to show. */
		gid: {
			type: String,
			required: true,
		},
	},

	computed: {
		/**
		 * The cached display name, or the id while it loads or when unknown.
		 *
		 * @return {string}
		 */
		label() {
			return groupDisplayName(this.gid) || this.gid
		},
	},

	watch: {
		gid: {
			immediate: true,
			/**
			 * Ask for the name of a new id (cached, so once per id per page).
			 *
			 * @param {string} gid The group id.
			 */
			handler(gid) {
				loadGroupDisplayName(gid)
			},
		},
	},
}
</script>
