<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactmomentTab — the sidebar face of the `contactmoment` leaf.
  -
  - The sidebar is for reading alongside the object, so this is the same list
  - with no card of its own: the sidebar tab strip already names the panel.
  - Rendering the card here is what would nest a card inside the sidebar.
-->
<template>
	<CnContactmomentCard
		class="cn-contactmoment-tab"
		chromeless
		:object-id="objectId"
		:entity-type="entityType"
		:schema="schema"
		:limit="limit"
		surface="detail-page" />
</template>

<script>
import CnContactmomentCard from './CnContactmomentCard.vue'

export default {
	name: 'CnContactmomentTab',

	components: { CnContactmomentCard },

	props: {
		/** The object whose contact moments are shown. */
		objectId: { type: String, required: true },
		/** The entity type pipelinq keys its link field on. */
		entityType: { type: String, default: '' },
		/** OpenRegister register slug, accepted for registry parity. */
		register: { type: String, default: '' },
		/** OpenRegister schema slug of the surrounding object. */
		schema: { type: String, default: '' },
		/** How many interactions to show. The sidebar has room for more. */
		limit: { type: Number, default: 20 },
	},
}
</script>
