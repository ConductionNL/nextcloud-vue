<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- Copyright (C) 2026 Conduction B.V. -->
<template>
	<CnFlowDetail :id="flowId"
		:app="app"
		@save="onSave"
		@run="onRun" />
</template>

<script>
import CnFlowDetail from '../CnFlowDetail/CnFlowDetail.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

/**
 * The flow canvas — manifest page type `flow-detail`.
 *
 * Mounts the shared `CnFlowDetail` node/edge canvas over OpenRegister's one
 * native flow store (ADR-065, ADR-098), scoped to the owning app. Pair it with
 * a `type: "flows"` page at `/flows`; this one takes `/flows/:id`.
 *
 * Controls belong in Nextcloud's app sidebar so the canvas keeps the full
 * width — declare `"sidebarComponent"` on the manifest page, or mount
 * `CnFlowSidebar` yourself. Canvas and sidebar share `useFlowStore`, which is
 * why neither needs props from the other.
 *
 * Manifest declaration:
 *
 *   { "id": "FlowDetail", "route": "/flows/:id", "type": "flow-detail",
 *     "title": "Flow", "config": { "app": "dossiq" } }
 */
export default {
	name: 'CnFlowEditorPage',

	components: { CnFlowDetail },

	props: {
		/**
		 * The owning app id, stamped on a flow created here so the app-scoped
		 * list finds it again. Omit only on the fleet-wide surface.
		 */
		app: {
			type: String,
			default: null,
		},

		/**
		 * The flow id to open. Defaults to the `id` route param, which is the
		 * normal case; pass it explicitly only when mounting outside a route.
		 * The literal `new` opens an unsaved flow.
		 */
		id: {
			type: String,
			default: '',
		},

		/**
		 * Route path the editor lives under, used to swap the URL once a new
		 * flow gets its server-assigned id.
		 */
		detailRoute: {
			type: String,
			default: '/flows',
		},
	},

	/**
	 * Share the one flow store with the toolbar's save/run handlers.
	 *
	 * @return {object} The setup bindings.
	 */
	setup() {
		return { store: useFlowStore() }
	},

	computed: {
		/**
		 * @return {string} The flow id being edited.
		 */
		flowId() {
			return this.id || this.$route?.params?.id || ''
		},
	},

	methods: {
		/**
		 * @return {Promise<void>}
		 */
		async onSave() {
			const saved = await this.store.save()
			// A newly created flow gets its id from the server, so the route has
			// to catch up or a reload would land back on `new` and lose it.
			if (saved?.id && this.flowId === 'new') {
				this.$router.replace(`${this.detailRoute}/${saved.id}`)
			}
		},

		/**
		 * @return {Promise<void>}
		 */
		async onRun() {
			await this.store.run({})
		},
	},
}
</script>
