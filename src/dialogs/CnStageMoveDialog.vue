<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:no-close="busy"
		@closing="onClose">
		<div
			class="cn-stage-move"
			data-testid="cn-modal"
			data-testid-modal="cn-stage-move-dialog">
			<p v-if="asksResult" class="cn-stage-move__note">
				{{ t('nextcloud-vue', 'This stage closes the record. Pick the result it closes with.') }}
			</p>

			<NcSelect
				v-if="asksResult"
				v-model="result"
				data-testid="cn-stage-move-result"
				:options="resultOptions"
				:input-label="t('nextcloud-vue', 'Result')"
				:placeholder="t('nextcloud-vue', 'Pick the result')"
				label="label"
				track-by="id"
				:disabled="busy" />

			<NcTextArea
				v-if="commentMode !== 'none'"
				v-model="comment"
				data-testid="cn-stage-move-comment"
				:label="commentLabel"
				:disabled="busy"
				rows="3" />

			<p
				v-if="error"
				class="cn-stage-move__error"
				data-testid="cn-stage-move-error"
				role="alert">
				{{ error }}
			</p>
		</div>

		<template #actions>
			<NcButton
				data-testid="cn-stage-move-cancel"
				:disabled="busy"
				@click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				data-testid="cn-stage-move-confirm"
				:disabled="!canConfirm"
				@click="onConfirm">
				<template v-if="busy" #icon>
					<NcLoadingIcon :size="20" :name="t('nextcloud-vue', 'Moving …')" />
				</template>
				{{ t('nextcloud-vue', 'Move') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcSelect, NcTextArea } from '@nextcloud/vue'

/**
 * CnStageMoveDialog: the confirm step of a stage move.
 *
 * `CnStagesWidget` opens it when a move declares that it needs input: a
 * comment, a result because the target stage closes the record, or both.
 * It also opens for every move when the widget is set to always confirm.
 *
 * The dialog performs no request itself. It emits `confirm` with what the
 * person entered and the widget performs the move. The widget passes `busy`
 * while the move runs and `error` when the server refused it, so a refusal
 * shows HERE, beside the button that caused it, and the dialog stays open.
 *
 * The confirm button stays disabled until every required input is filled.
 * A request the server is known to refuse is a worse answer than a button
 * that cannot be pressed yet. Lives in its own file under `src/dialogs/` per
 * the modal-isolation rule.
 *
 * ```vue
 * <CnStageMoveDialog
 *   v-if="pendingMove"
 *   :stage-label="pendingMove.stage.label"
 *   comment-mode="optional"
 *   :result-options="[{ id: 'granted', label: 'Granted' }]"
 *   :result-required="true"
 *   :busy="busy"
 *   :error="moveError"
 *   @confirm="onConfirm"
 *   @close="pendingMove = null" />
 * ```
 */
export default {
	name: 'CnStageMoveDialog',

	components: {
		NcButton,
		NcDialog,
		NcLoadingIcon,
		NcSelect,
		NcTextArea,
	},

	props: {
		/**
		 * The name of the stage the record moves to. Used in the dialog title.
		 */
		stageLabel: {
			type: String,
			required: true,
		},
		/**
		 * Whether to ask for a comment: `'none'`, `'optional'` or `'required'`.
		 * A required comment keeps the confirm button disabled until it holds
		 * text.
		 */
		commentMode: {
			type: String,
			default: 'none',
			validator: (v) => ['none', 'optional', 'required'].includes(v),
		},
		/**
		 * The results to choose from when the move closes the record, as
		 * `{ id, label }`.
		 *
		 * @type {Array<{id: string, label: string}>}
		 */
		resultOptions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Whether a result must be picked before the move can be confirmed.
		 * Only takes effect when `resultOptions` offers at least one result.
		 */
		resultRequired: {
			type: Boolean,
			default: false,
		},
		/**
		 * True while the move runs. Disables the inputs and both buttons, and
		 * keeps the dialog from closing mid-request.
		 */
		busy: {
			type: Boolean,
			default: false,
		},
		/**
		 * Why the last attempt was refused, shown inside the dialog. Empty when
		 * there is nothing to report.
		 */
		error: {
			type: String,
			default: '',
		},
	},

	emits: ['confirm', 'close'],

	data() {
		return {
			/** @type {string} The comment typed so far. */
			comment: '',
			/** @type {{id: string, label: string}|null} The picked result. */
			result: null,
		}
	},

	computed: {
		/**
		 * The dialog title, naming the target stage.
		 *
		 * @return {string} The title.
		 */
		dialogTitle() {
			return t('nextcloud-vue', 'Move to {stage}', { stage: this.stageLabel })
		},

		/**
		 * The comment field's label, saying whether it is optional.
		 *
		 * @return {string} The label.
		 */
		commentLabel() {
			return this.commentMode === 'required'
				? t('nextcloud-vue', 'Comment')
				: t('nextcloud-vue', 'Comment (optional)')
		},

		/**
		 * Whether the dialog asks for a result: one is required and there are
		 * results to choose from.
		 *
		 * @return {boolean} True when the result picker shows.
		 */
		asksResult() {
			return this.resultRequired && this.resultOptions.length > 0
		},

		/**
		 * Whether the move may be confirmed now.
		 *
		 * @return {boolean} True when every required input is filled.
		 */
		canConfirm() {
			if (this.busy) return false
			if (this.commentMode === 'required' && this.comment.trim() === '') return false
			if (this.asksResult && !this.result) return false
			return true
		},
	},

	methods: {
		t,

		/**
		 * Emit what the person entered. Empty inputs are left out, so the
		 * caller never sends an empty string where "not given" was meant.
		 *
		 * @return {void}
		 */
		onConfirm() {
			if (!this.canConfirm) return
			const payload = {}
			const comment = this.comment.trim()
			if (comment) payload.comment = comment
			if (this.result && this.result.id) payload.result = this.result.id
			/**
			 * @event confirm The person confirmed the move. Carries `comment`
			 * and `result` (the picked result id) when they were given.
			 * @type {{comment?: string, result?: string}}
			 */
			this.$emit('confirm', payload)
		},

		/**
		 * Close the dialog, unless a move is still running.
		 *
		 * @return {void}
		 */
		onClose() {
			if (this.busy) return
			/**
			 * @event close The dialog was cancelled or dismissed. No move is made.
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-stage-move {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-stage-move__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-stage-move__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
