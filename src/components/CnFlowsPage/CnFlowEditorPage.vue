<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- Copyright (C) 2026 Conduction B.V. -->
<template>
	<CnFlowBoard v-if="isBoard"
		:id="flowId"
		:app="app"
		:run="runUuid"
		:detailRoute="detailRoute"
		:listLabel="listLabel ? cnTranslate(listLabel) : ''"
		:palette="palette"
		:paletteFootnote="paletteFootnote ? cnTranslate(paletteFootnote) : ''"
		:notice="notice ? cnTranslate(notice) : ''"
		:pill="pill ? cnTranslate(pill) : ''"
		@save="onSave"
		@run="onRun" />
	<CnFlowDetail v-else
		:id="flowId"
		:app="app"
		:run="runUuid"
		@save="onSave"
		@run="onRun" />
</template>

<script>
import CnFlowDetail from '../CnFlowDetail/CnFlowDetail.vue'
import CnFlowBoard from './CnFlowBoard.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'
import { useLook } from '../../composables/useLook.js'

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

	components: { CnFlowBoard, CnFlowDetail },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

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

		/**
		 * A run to open on arrival. Defaults to the `run` query parameter,
		 * which is where a run's own address lands: `/flow-runs/{uuid}` reads
		 * the run, finds its flow and redirects to `/flows/{id}?run={uuid}`.
		 * Pass it explicitly only when mounting outside a route.
		 */
		run: {
			type: String,
			default: '',
		},

		/**
		 * Draw this page in the `board` look (or `nextcloud`) whatever the app
		 * does. Empty follows the app's look. Manifest key `config.look`.
		 */
		look: {
			type: String,
			default: '',
		},

		/**
		 * Board look: where steps come from. `picker` (default) keeps "Add a
		 * step" in the canvas toolbar; `column` draws the palette as a card
		 * beside the canvas, grouped by the app that provides each step.
		 * Manifest key `config.palette`.
		 */
		palette: {
			type: String,
			default: 'picker',
		},

		/**
		 * Board look: a line under the palette card. Manifest key
		 * `config.paletteFootnote`, translated with the app's catalogue.
		 */
		paletteFootnote: {
			type: String,
			default: '',
		},

		/**
		 * Board look: an info notice under the path. Manifest key
		 * `config.notice`, translated with the app's catalogue.
		 */
		notice: {
			type: String,
			default: '',
		},

		/**
		 * Board look: the pill beside the flow's name ("Case type flow").
		 * Empty shows the lifecycle for a draft or retired flow. Manifest key
		 * `config.pill`.
		 */
		pill: {
			type: String,
			default: '',
		},

		/**
		 * Board look: the list's name at the start of the path ("Settings /
		 * Flows"). Empty reads "Flows". Manifest key `config.listLabel`.
		 */
		listLabel: {
			type: String,
			default: '',
		},
	},

	/**
	 * Share the one flow store with the toolbar's save/run handlers, and
	 * resolve the look (`look` is read here, through `useLook`).
	 *
	 * @param {object} props The component props.
	 * @return {object} The setup bindings.
	 */
	setup(props) {
		const { isBoard } = useLook(props)
		return { store: useFlowStore(), isBoard }
	},

	computed: {
		/**
		 * @return {string} The flow id being edited.
		 */
		flowId() {
			return this.id || this.$route?.params?.id || ''
		},

		/**
		 * @return {string} The run to open on arrival, or an empty string.
		 */
		runUuid() {
			return this.run || this.$route?.query?.run || ''
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
