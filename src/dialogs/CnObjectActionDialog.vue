<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="form"
		:eyebrow="eyebrow"
		:subtitle="action.description || subtitle"
		:name="action.label"
		size="normal"
		data-testid="cn-object-action-dialog"
		@closing="close">
		<div class="cn-object-action" :aria-busy="phase === 'running' ? 'true' : null">
			<template v-if="phase === 'form'">
				<!-- A refusal keeps the dialog open with what was typed still in it. -->
				<NcNoteCard v-if="error"
					type="error"
					data-testid="cn-object-action-error">
					{{ error }}
				</NcNoteCard>
				<NcNoteCard v-if="confirmText"
					type="warning"
					data-testid="cn-object-action-confirm-text">
					{{ confirmText }}
				</NcNoteCard>
				<p v-if="ids.length > 0" class="cn-object-action__muted" data-testid="cn-object-action-selection">
					{{ n('nextcloud-vue', 'Runs on {count} item', 'Runs on {count} items', ids.length, { count: ids.length }) }}
				</p>
				<CnTransitionInputFields
					v-if="inputs.length > 0"
					:inputs="inputs"
					:modelValue="values"
					:schema="action.inputs"
					:currentObject="currentObject"
					:register="register"
					:context="context"
					:fieldErrors="fieldErrors"
					:disabled="busy"
					@update:modelValue="values = $event" />
			</template>

			<div v-else-if="phase === 'running'" class="cn-object-action__status" data-testid="cn-object-action-running">
				<NcLoadingIcon :size="32" />
				<p>{{ t('nextcloud-vue', 'Running …') }}</p>
				<p v-if="progress && progress.steps > 0" class="cn-object-action__muted" data-testid="cn-object-action-steps">
					{{ n('nextcloud-vue', '{count} step done', '{count} steps done', progress.steps, { count: progress.steps }) }}
				</p>
			</div>

			<template v-else>
				<NcNoteCard :type="resultType" data-testid="cn-object-action-result">
					{{ resultText }}
				</NcNoteCard>
			</template>
		</div>

		<template #actions>
			<template v-if="phase === 'form'">
				<NcButton data-testid="cn-object-action-cancel" @click="close">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton
					variant="primary"
					:disabled="!canConfirm"
					:aria-busy="busy ? 'true' : null"
					data-testid="cn-object-action-confirm"
					@click="confirm">
					<template v-if="busy" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ action.label }}
				</NcButton>
			</template>
			<NcButton v-else
				:disabled="phase === 'running'"
				data-testid="cn-object-action-close"
				@click="close">
				{{ t('nextcloud-vue', 'Close') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { showSuccess } from '@nextcloud/dialogs'
import { getLanguage, translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnDialog from '../components/CnDialog/CnDialog.vue'
import CnTransitionInputFields from '../components/CnTransitionInputFields/CnTransitionInputFields.vue'
import { useObjectActions } from '../composables/useObjectActions.js'
import { dialogBoardMixin } from '../mixins/dialogBoard.js'
import { objectActionDefaults, objectActionInputs } from '../utils/objectActionInputs.js'
import { inputFieldsComplete, readTransitionInputs, resolveInputFields } from '../utils/transitionInputs.js'

/**
 * The language labels resolve in, English when l10n is not set up.
 *
 * @return {string}
 */
function readerLanguage() {
	try {
		return getLanguage() || 'en'
	} catch {
		return 'en'
	}
}

/**
 * CnObjectActionDialog: asks an object action's inputs, runs it, and shows
 * what happened.
 *
 * The inputs are the action's `inputs` JSON Schema, drawn by
 * `CnTransitionInputFields` (the fields `CnTransitionInputDialog` draws for a
 * lifecycle transition). The confirm text sits above them. Confirm stays
 * disabled until the required inputs are filled. The dialog runs the action
 * itself, through `useObjectActions`, on one object or on a selection
 * (`ids`):
 *
 * - a refusal keeps the dialog open with the reason, and a 422 marks the
 *   inputs it names;
 * - a sync run closes the dialog and emits `done`;
 * - an async run shows that it is running and the steps done so far, then
 *   the result;
 * - a suspended run says it waits, a selection run shows its summary.
 *
 * ```vue
 * <CnObjectActionDialog
 *   v-if="pending"
 *   :action="pending"
 *   register="zaken"
 *   schema="case"
 *   :objectId="caseId"
 *   @done="onDone"
 *   @close="pending = null" />
 * ```
 *
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-inputs-are-asked-in-a-dialog-built-from-their-json-schema
 */
export default {
	name: 'CnObjectActionDialog',

	components: {
		CnDialog,
		CnTransitionInputFields,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
	},

	mixins: [dialogBoardMixin],

	props: {
		/**
		 * The action as `useObjectActions` lists it: `key`, `label`,
		 * `description`, `inputs` (JSON Schema), `confirm`, `mode`.
		 *
		 * @type {object}
		 */
		action: {
			type: Object,
			required: true,
		},

		/**
		 * The register of the object (or of the selection).
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			required: true,
		},

		/**
		 * The schema of the object (or of the selection).
		 *
		 * @type {string}
		 */
		schema: {
			type: String,
			required: true,
		},

		/**
		 * The object the action runs on. Leave empty and pass `ids` to run it on
		 * a selection.
		 *
		 * @type {string}
		 */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The selected object ids, for a run on a selection.
		 *
		 * @type {Array<string>}
		 */
		ids: {
			type: Array,
			default: () => [],
		},

		/**
		 * The object, which `@object.<path>` defaults read.
		 *
		 * @type {object|null}
		 */
		currentObject: {
			type: Object,
			default: null,
		},

		/**
		 * What an input's `optionsSource` reads.
		 *
		 * @type {object}
		 */
		context: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['done', 'close'],

	setup(props) {
		const runner = useObjectActions(() => ({
			register: props.register,
			schema: props.schema,
			id: props.ids.length > 0 ? '' : String(props.objectId ?? ''),
		}), { immediate: false })
		return { runner }
	},

	data() {
		return {
			values: objectActionDefaults(this.action.inputs, {
				object: this.currentObject,
				user: getCurrentUser()?.uid || '',
			}),

			/** `form`, `running` or `result`. */
			phase: 'form',
			busy: false,
			error: '',
			fieldErrors: [],
			result: null,
		}
	},

	computed: {
		/** The declared inputs `CnTransitionInputFields` reads. */
		inputs() {
			return objectActionInputs(this.action.inputs, { language: readerLanguage() })
		},

		/** The confirm sentence, when the action declares one. */
		confirmText() {
			return typeof this.action.confirm === 'string' ? this.action.confirm : ''
		},

		/** Whether the required inputs are filled. */
		canConfirm() {
			if (this.busy) {
				return false
			}
			const fields = resolveInputFields(this.inputs, { schema: this.action.inputs, register: this.register, context: this.context, values: this.values })
			return inputFieldsComplete(fields, this.values)
		},

		/** The async run, while it is followed. */
		progress() {
			return this.runner.progress.value
		},

		/** The note type of the result. */
		resultType() {
			if (!this.result || this.result.ok === false) {
				return 'error'
			}
			return this.result.status === 'suspended' || (this.result.summary && this.result.summary.failed > 0) ? 'warning' : 'success'
		},

		/** What the result says. */
		resultText() {
			const result = this.result || {}
			if (result.ok === false) {
				return result.message || t('nextcloud-vue', 'The action did not run.')
			}
			if (result.status === 'suspended') {
				return t('nextcloud-vue', 'The action is waiting for a next step, such as a task.')
			}
			if (result.job) {
				return n('nextcloud-vue', 'Started on {count} item. You can follow it under bulk jobs.', 'Started on {count} items. You can follow it under bulk jobs.', this.ids.length, { count: this.ids.length })
			}
			if (result.summary) {
				return t('nextcloud-vue', '{succeeded} done, {failed} failed', { succeeded: result.summary.succeeded, failed: result.summary.failed })
			}
			if (result.status === 'queued') {
				return t('nextcloud-vue', 'The action is still running. You can close this dialog.')
			}
			return t('nextcloud-vue', 'Done')
		},
	},

	methods: {
		t,
		n,

		/**
		 * Run the action with the inputs that are asked now.
		 *
		 * @return {Promise<void>}
		 */
		async confirm() {
			if (!this.canConfirm) {
				return
			}
			const { data } = readTransitionInputs(this.inputs, this.values, { schema: this.action.inputs, register: this.register, context: this.context })
			this.busy = true
			this.error = ''
			this.fieldErrors = []
			let result
			if (this.ids.length > 0) {
				result = await this.runner.runOnSelection(this.action.key, this.ids, data)
			} else if (this.action.mode === 'async') {
				const started = this.runner.run(this.action.key, data)
				this.phase = 'running'
				result = await started
			} else {
				result = await this.runner.run(this.action.key, data)
			}
			this.busy = false
			if (!result.ok && result.status === 'refused') {
				this.phase = 'form'
				this.error = result.message || t('nextcloud-vue', 'The action did not run.')
				this.fieldErrors = result.fieldErrors || []
				return
			}
			this.result = result
			if (result.ok) {
				/**
				 * @event done The action ran. Payload: the run's result.
				 * @type {object}
				 */
				this.$emit('done', result)
			}
			// A sync run closes at once; an async one the person watched ends on its result.
			const settled = result.ok && result.status === 'completed' && !result.summary && this.phase === 'form'
			if (settled && this.ids.length === 0) {
				showSuccess(t('nextcloud-vue', '{action}: done', { action: this.action.label }))
				this.close()
				return
			}
			this.phase = 'result'
		},

		/** Close, and stop following a run. */
		close() {
			this.runner.stop()
			/** @event close The dialog asks to close. */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-object-action {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-object-action__status {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 0;
}

.cn-object-action__status p {
	margin: 0;
}

.cn-object-action__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
