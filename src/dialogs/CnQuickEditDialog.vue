<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnConfirmDialog
		v-if="conflict !== null"
		:name="conflictTitle"
		:message="conflictMessage"
		:confirmLabel="keepTheirsLabel"
		:cancelLabel="reopenLabel"
		data-testid="cn-quick-edit-conflict"
		@confirm="onKeepTheirs"
		@cancel="onReopen">
		<template #default>
			<dl class="cn-quick-edit__conflict">
				<template v-for="row in conflictRows" :key="row.field">
					<dt>{{ row.label }}</dt>
					<dd>
						<span class="cn-quick-edit__conflict-mine" :data-testid="`cn-quick-edit-mine-${row.field}`">{{ row.mine }}</span>
						<span class="cn-quick-edit__conflict-theirs" :data-testid="`cn-quick-edit-theirs-${row.field}`">{{ row.theirs }}</span>
					</dd>
				</template>
			</dl>
		</template>
	</CnConfirmDialog>
	<CnFormDialog
		v-else
		:schema="schema"
		:item="object"
		:register="register"
		:includeFields="fields"
		:lockedFields="lockedFields"
		:title="title"
		:size="size"
		data-testid="cn-quick-edit"
		@close="$emit('close')"
		@confirm="onConfirm" />
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnConfirmDialog from './CnConfirmDialog.vue'
import { CnFormDialog } from '../components/CnFormDialog/index.js'
import { conflictingFields, quickEditPatch, writableQuickEditFields } from '../utils/quickEdit.js'

/**
 * CnQuickEditDialog — edit a few fields of one row without leaving the list.
 *
 * It is the page's own form, narrowed. The fields render through
 * `CnFormDialog`, the same widgets the detail page renders, so a date is a
 * date picker here as well as there and nobody has to learn a second form.
 *
 * Two rules it does not bend:
 *
 * - A field the caller may not write renders read-only. The list asks the
 *   record which fields it may write (`writableField`, default
 *   `@self.writableFields`); a field outside that list is locked rather than
 *   hidden, so the person sees the value and learns it is not theirs to
 *   change.
 * - A save against a row somebody else changed overwrites nothing. Both
 *   values are shown, field by field, and the person chooses.
 *
 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
 */
export default {
	name: 'CnQuickEditDialog',

	components: {
		CnConfirmDialog,
		CnFormDialog,
	},

	props: {
		/** The row being edited. */
		object: {
			type: Object,
			required: true,
		},

		/** The schema the form renders from. */
		schema: {
			type: Object,
			default: null,
		},

		/** Register slug, for resolving object references. */
		register: {
			type: String,
			default: '',
		},

		/**
		 * The fields this quick edit asks for. The page names them; the dialog
		 * never offers a field the page did not.
		 *
		 * @type {string[]}
		 */
		fields: {
			type: Array,
			default: () => [],
		},

		/**
		 * Where the record says which of its fields this caller may write. A
		 * row carrying nothing there is a server that does not answer about
		 * field permissions, and every named field stays editable.
		 *
		 * @type {string}
		 */
		writableField: {
			type: String,
			default: '@self.writableFields',
		},

		/** The row as the server holds it now, when a save came back stale. */
		serverObject: {
			type: Object,
			default: null,
		},

		/** Dialog heading. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Quick edit'),
		},

		/** Dialog size, passed to CnFormDialog. */
		size: {
			type: String,
			default: 'normal',
		},
	},

	emits: ['close', 'save', 'keep-theirs'],

	data() {
		return {
			/** The patch the person tried to save, while a conflict is open. */
			pending: null,
		}
	},

	computed: {
		/**
		 * The fields the page named that this caller may not write. They render
		 * locked rather than missing.
		 *
		 * @return {string[]} The locked field keys.
		 */
		lockedFields() {
			const writable = writableQuickEditFields(this.object, this.fields, this.writableField)
			return this.fields.filter((field) => !writable.includes(field))
		},

		/**
		 * The fields whose value moved under the person while the dialog was
		 * open, or null when nothing did.
		 *
		 * @return {(Array<object>|null)} The conflicting fields.
		 */
		conflict() {
			if (this.pending === null || this.serverObject === null) {
				return null
			}
			const rows = conflictingFields(this.object, this.serverObject, this.pending)
			return rows.length > 0 ? rows : null
		},

		/** @return {Array<object>} The conflicting fields, for the template. */
		conflictRows() {
			return this.conflict || []
		},

		/** @return {string} Heading of the conflict dialog. */
		conflictTitle() {
			return t('nextcloud-vue', 'Somebody else changed this record')
		},

		/** @return {string} Body of the conflict dialog. */
		conflictMessage() {
			return t('nextcloud-vue', 'Nothing has been saved. Your value is on the left, theirs on the right.')
		},

		/** @return {string} Label of the keep-theirs button. */
		keepTheirsLabel() {
			return t('nextcloud-vue', 'Keep their version')
		},

		/** @return {string} Label of the reopen button. */
		reopenLabel() {
			return t('nextcloud-vue', 'Go back to my edit')
		},
	},

	methods: {
		t,

		/**
		 * Hand the page the patch: only the fields it asked for, and only the
		 * ones this caller may write and actually changed.
		 *
		 * @param {object} data The form's data.
		 * @return {void}
		 */
		onConfirm(data) {
			const patch = quickEditPatch(this.object, data, this.fields, this.writableField)
			this.pending = patch
			/**
			 * @event save The fields to write, and the row they belong to.
			 */
			this.$emit('save', { id: this.object?.id, patch })
		},

		/**
		 * Take the server's version and close. Nothing of this person's edit is
		 * written: a merge nobody asked for is how one of the two values gets
		 * lost quietly.
		 *
		 * @return {void}
		 */
		onKeepTheirs() {
			this.pending = null
			this.$emit('keep-theirs', this.serverObject)
			this.$emit('close')
		},

		/**
		 * Go back to the form with what they typed still in it.
		 *
		 * @return {void}
		 */
		onReopen() {
			this.pending = null
		},
	},
}
</script>

<style scoped>
.cn-quick-edit__conflict {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 4px 12px;
	margin-block-start: 8px;
}

.cn-quick-edit__conflict dd {
	display: flex;
	gap: 12px;
	margin: 0;
}

.cn-quick-edit__conflict-theirs {
	color: var(--color-text-maxcontrast);
}
</style>
