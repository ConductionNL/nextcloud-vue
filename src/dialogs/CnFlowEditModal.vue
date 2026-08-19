<!--
  CnFlowEditModal — edit a flow without leaving the page.

  This is what OpenBuild's "Edit flows…" opens. It hosts the SAME components as
  the flow detail page — CnFlowDetail for the canvas, CnFlowSidebar for the
  controls — rather than a second, simpler editor. A modal that could only edit
  a flow's name would quietly become a different product surface from the page,
  and the two would drift.

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
					@save="onSave"
					@run="onRun" />
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
				<NcButton type="error" @click="discard">
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
import { useFlowStore } from '../composables/useFlowStore.js'

export default {
	name: 'CnFlowEditModal',

	components: {
		NcButton,
		NcDialog,
		CnFlowDetail,
		CnFlowSidebar,
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
	},

	emits: ['close', 'saved'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return {
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
