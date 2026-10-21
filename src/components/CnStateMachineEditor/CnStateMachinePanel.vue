<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<section class="cn-sm-panel" :aria-labelledby="`${uid}-title`">
		<header class="cn-sm-panel__header">
			<div class="cn-sm-panel__titles">
				<h3 :id="`${uid}-title`" class="cn-sm-panel__title">
					{{ title }}
				</h3>
				<span v-if="subtitle" class="cn-sm-panel__subtitle">{{ subtitle }}</span>
			</div>
			<NcButton
				variant="tertiary"
				:aria-label="closeLabel"
				@click="$emit('close')">
				<template #icon>
					<Close :size="20" />
				</template>
			</NcButton>
		</header>

		<CnStateMachineFields
			v-if="fields.length > 0"
			:fields="fields"
			:target="model"
			:disabled="readOnly" />

		<!-- @slot default Extra content below the fields. -->
		<slot />

		<div v-if="canDelete && !readOnly" class="cn-sm-panel__danger">
			<NcButton variant="error" @click="$emit('delete')">
				<template #icon>
					<DeleteOutline :size="20" />
				</template>
				{{ deleteLabel }}
			</NcButton>
		</div>
	</section>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import DeleteOutline from 'vue-material-design-icons/DeleteOutline.vue'
import CnStateMachineFields from './CnStateMachineFields.vue'
import { buildRecord, moveItem, readRecord } from './stateMachineFields.js'

/**
 * The property panel of one state, step or transition.
 *
 * Edits a copy of `record` described by `fields` and emits the whole record on
 * every change; the host stores it and passes it back down. A record that comes
 * back equal to the last one emitted does not reset the copy, so typing never
 * loses the caret.
 */
export default {
	name: 'CnStateMachinePanel',

	components: { NcButton, Close, DeleteOutline, CnStateMachineFields },

	provide() {
		// The panel itself: its `uid`, `locked`, `tr`, `optionsOf`, `isEnabled`,
		// `setEnabled`, `set`, `push`, `splice` and `move` are what the fields use.
		return { cnStateMachinePanel: this }
	},

	props: {
		/** The record being edited. */
		record: {
			type: Object,
			required: true,
		},

		/** Field descriptors, see CnStateMachineEditor's `config`. */
		fields: {
			type: Array,
			default: () => [],
		},

		/** The heading, already translated. */
		title: {
			type: String,
			required: true,
		},

		/** A line under the heading. */
		subtitle: {
			type: String,
			default: '',
		},

		/** The close button's accessible name. */
		closeLabel: {
			type: String,
			required: true,
		},

		/** The delete button's text. */
		deleteLabel: {
			type: String,
			default: '',
		},

		/** Whether to offer the delete button. */
		canDelete: {
			type: Boolean,
			default: false,
		},

		/** Disable every field. */
		readOnly: {
			type: Boolean,
			default: false,
		},

		/** Disable the fields marked `lockable`. */
		locked: {
			type: Boolean,
			default: false,
		},

		/** Named option lists a field can point at with `optionSet`. */
		optionSets: {
			type: Object,
			default: () => ({}),
		},

		/** Translates a configured text. */
		translate: {
			type: Function,
			default: (text) => text,
		},

		/** Prefix for the DOM ids inside the panel. */
		uid: {
			type: String,
			required: true,
		},
	},

	emits: ['update', 'delete', 'close'],

	data() {
		const { model, enabled } = readRecord(this.record, this.fields)
		return {
			model,
			enabled,
			lastEmitted: null,
		}
	},

	watch: {
		record: {
			deep: true,
			handler(next, previous) {
				const sameRecord = next && previous && next.id === previous.id
				if (sameRecord && this.lastEmitted !== null && JSON.stringify(next) === this.lastEmitted) {
					return
				}
				this.reset()
			},
		},

		fields() {
			this.reset()
		},
	},

	methods: {
		/**
		 * Rebuild the copy from `record`.
		 *
		 * @return {void}
		 */
		reset() {
			const { model, enabled } = readRecord(this.record, this.fields)
			this.model = model
			this.enabled = enabled
			this.lastEmitted = null
		},

		/**
		 * The options of a select or checkboxes field.
		 *
		 * @param {object} field The descriptor.
		 * @return {Array<{value: unknown, label: string}>} The options, labels translated when they are the config's own.
		 */
		optionsOf(field) {
			if (Array.isArray(field.options)) {
				return field.options.map((option) => ({ value: option.value, label: this.translate(option.label) }))
			}
			const set = field.optionSet ? this.optionSets[field.optionSet] : null
			return Array.isArray(set) ? set : []
		},

		/**
		 * @param {string} text A configured text.
		 * @return {string} It translated.
		 */
		tr(text) {
			return this.translate(text)
		},

		/**
		 * @param {string} path An optional group's path.
		 * @return {boolean} Whether it is switched on.
		 */
		isEnabled(path) {
			return this.enabled[path] === true
		},

		/**
		 * @param {string} path An optional group's path.
		 * @param {boolean} value Whether to switch it on.
		 * @return {void}
		 */
		setEnabled(path, value) {
			this.enabled[path] = value === true
			this.emitUpdate()
		},

		/**
		 * Write one value into the copy.
		 *
		 * @param {object|Array} target An object or list inside the copy.
		 * @param {string|number} key The key or index.
		 * @param {unknown} value The value.
		 * @return {void}
		 */
		set(target, key, value) {
			target[key] = value
			this.emitUpdate()
		},

		/**
		 * @param {Array} list A list inside the copy.
		 * @param {unknown} item The entry to append.
		 * @return {void}
		 */
		push(list, item) {
			list.push(item)
			this.emitUpdate()
		},

		/**
		 * @param {Array} list A list inside the copy.
		 * @param {number} index The entry to remove.
		 * @return {void}
		 */
		splice(list, index) {
			list.splice(index, 1)
			this.emitUpdate()
		},

		/**
		 * @param {Array} list A list inside the copy.
		 * @param {number} from The entry's index.
		 * @param {number} to Its new index.
		 * @return {void}
		 */
		move(list, from, to) {
			if (moveItem(list, from, to)) {
				this.emitUpdate()
			}
		},

		/**
		 * Emit the record built from the copy.
		 *
		 * @return {void}
		 */
		emitUpdate() {
			const record = buildRecord(this.model, this.fields, this.enabled)
			this.lastEmitted = JSON.stringify(record)
			/**
			 * @event update The edited record, complete. Keys the fields do not
			 *   describe are carried through unchanged.
			 */
			this.$emit('update', record)
		},
	},
}
</script>

<style scoped>
.cn-sm-panel {
	display: flex;
	flex-direction: column;
	gap: 14px;
	min-width: 0;
}

.cn-sm-panel__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px;
}

.cn-sm-panel__titles {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-sm-panel__title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
	overflow-wrap: anywhere;
}

.cn-sm-panel__subtitle {
	font-size: 13px;
	color: var(--color-text-maxcontrast, #6b6b6b);
}

.cn-sm-panel__danger {
	padding-top: 12px;
	border-top: 1px solid var(--color-border, #d0d0d0);
}
</style>
