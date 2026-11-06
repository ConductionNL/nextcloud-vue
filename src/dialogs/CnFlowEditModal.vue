<!--
  CnFlowEditModal — edit a flow without leaving the page.

  What Buildiq's "Edit flows…" opens for an app without a flow page in list mode.
  It is no editor of its own: it hosts the SAME components as the flow detail
  page, CnFlowDetail in its list view with the Canvas / List switch and
  CnFlowSidebar for the controls, so a flow behaves the same wherever it opens.
  New callers link to the flow page with `?view=list` instead (decision 379).

  `size="full"` because a graph needs the room: the canvas and the controls have
  to be on screen together, and at any smaller size the sidebar either wraps
  under the canvas or squeezes it to a strip.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog size="full"
		:name="dialogName"
		@closing="onClosing">
		<div class="cn-flow-modal">
			<div class="cn-flow-modal__canvas">
				<CnFlowDetail :id="flowId"
					:app="app"
					:view="activeView"
					@save="onSave"
					@run="onRun">
					<template #toolbar-start>
						<CnFlowViewSwitch v-model="activeView" />
					</template>
				</CnFlowDetail>
			</div>
			<aside class="cn-flow-modal__side">
				<!-- `embedded`: NcAppSidebar's app-layout positioning has no
				     meaning inside a dialog. -->
				<CnFlowSidebar embedded />
			</aside>
		</div>

		<!--
		  A dirty flow closing without saving is the one destructive thing this
		  dialog can do, so it asks. The canvas holds unsaved node positions and
		  configuration that exist nowhere else.
		-->
		<NcDialog v-if="confirmDiscard"
			:name="t('nextcloud-vue', 'Discard changes?')"
			@closing="confirmDiscard = false">
			<p>{{ t('nextcloud-vue', 'This flow has unsaved changes. Closing now discards them.') }}</p>
			<template #actions>
				<NcButton @click="confirmDiscard = false">
					{{ t('nextcloud-vue', 'Keep editing') }}
				</NcButton>
				<NcButton variant="error" @click="discard">
					{{ t('nextcloud-vue', 'Discard') }}
				</NcButton>
			</template>
		</NcDialog>
	</NcDialog>
</template>

<script>
import { NcButton, NcDialog } from '@nextcloud/vue'
import CnFlowDetail from '../components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowSidebar from '../components/CnFlowDetail/CnFlowSidebar.vue'
import CnFlowViewSwitch from '../components/CnFlowDetail/CnFlowViewSwitch.vue'
import { useFlowStore } from '../composables/useFlowStore.js'

/**
 * @deprecated Link to the flow page in list mode (`/flows/{id}?view=list`).
 * Kept while callers move; it renders that same list view in a dialog.
 */
export default {
	name: 'CnFlowEditModal',

	components: {
		NcButton,
		NcDialog,
		CnFlowDetail,
		CnFlowSidebar,
		CnFlowViewSwitch,
	},

	props: {
		/**
		 * The flow to edit. `new` starts a blank one.
		 */
		flowId: {
			type: String,
			default: 'new',
		},

		/**
		 * The owning app id, stamped on a new flow and used to scope the list.
		 */
		app: {
			type: String,
			default: null,
		},

		/**
		 * The view on arrival: `list` or `canvas`.
		 */
		view: {
			type: String,
			default: 'list',
		},
	},

	emits: ['close', 'saved'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return {
			activeView: this.view,
			confirmDiscard: false,
		}
	},

	computed: {
		/**
		 * @return {string} The dialog title.
		 */
		dialogName() {
			return this.store.flow?.name || this.t('nextcloud-vue', 'Edit flow')
		},
	},

	methods: {
		/**
		 * @return {Promise<void>}
		 */
		async onSave() {
			const saved = await this.store.save()
			if (saved) {
				this.$emit('saved', saved)
			}
		},

		/**
		 * @return {Promise<void>}
		 */
		async onRun() {
			await this.store.run({})
		},

		/**
		 * @return {void}
		 */
		onClosing() {
			if (this.store.dirty) {
				this.confirmDiscard = true
				return
			}

			this.$emit('close')
		},

		/**
		 * @return {void}
		 */
		discard() {
			this.confirmDiscard = false
			this.store.dirty = false
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-flow-modal {
	display: flex;
	gap: 0;
	block-size: 100%;
	min-block-size: 60vh;
}

.cn-flow-modal__canvas {
	flex: 1 1 auto;
	min-inline-size: 0;
}

.cn-flow-modal__side {
	flex: 0 0 340px;
	max-inline-size: 340px;
	overflow-y: auto;
	border-inline-start: 1px solid var(--color-border);
}

@media (max-width: 900px) {
	.cn-flow-modal {
		flex-direction: column;
	}

	.cn-flow-modal__side {
		flex: 1 1 auto;
		max-inline-size: none;
		border-inline-start: none;
		border-block-start: 1px solid var(--color-border);
	}
}
</style>
