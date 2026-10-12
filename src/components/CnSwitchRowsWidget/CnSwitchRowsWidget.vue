<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-switch-rows" data-testid="cn-switch-rows">
		<ul class="cn-switch-rows__list">
			<li
				v-for="row in rows"
				:key="row.key"
				class="cn-switch-rows__row"
				:data-testid="`cn-switch-rows-row-${row.key}`">
				<NcCheckboxRadioSwitch
					:modelValue="values[row.key] === true"
					type="switch"
					:disabled="readOnly || busy === row.key"
					@update:modelValue="toggle(row, $event)">
					<span class="cn-switch-rows__label">{{ row.label }}</span>
					<span v-if="row.hint" class="cn-switch-rows__hint">{{ row.hint }}</span>
				</NcCheckboxRadioSwitch>
			</li>
		</ul>
		<NcNoteCard v-if="notice" type="error" data-testid="cn-switch-rows-notice">
			{{ notice }}
		</NcNoteCard>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch, NcNoteCard } from '@nextcloud/vue'
import { objectUrlOf, patchObject } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/**
 * CnSwitchRowsWidget — the `switch-rows` widget: a card of switches, each with
 * a label and a hint, bound to boolean fields of the CURRENT object. A toggle
 * saves at once with ONE PATCH of that field; a refused PATCH puts the switch
 * back and shows the server's words.
 *
 * @spec openspec/changes/abstract-switch-rows/specs/switch-rows/spec.md
 */
export default {
	name: 'CnSwitchRowsWidget',

	components: { NcCheckboxRadioSwitch, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `rows` (required) — `[{ key, label, hint?, invert? }]`; `key` is a top-level boolean field. `invert` shows the switch on when the field is false (a stored `disabled` read as "enabled").
		 * - `readOnly`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The current detail-page object. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The current object id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['saved'],

	data() {
		return {
			/** The switch states as last saved (by key, as the switch shows them). */
			saved: {},
			values: {},
			busy: '',
			notice: '',
		}
	},

	computed: {
		rows() {
			const list = Array.isArray(this.content.rows) ? this.content.rows : []
			return list
				.filter((row) => row && row.key)
				.map((row) => ({ ...row, label: this.tr(row.label || row.key), hint: this.tr(row.hint || '') }))
		},

		readOnly() {
			return this.content.readOnly === true
		},

		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.adopt()
		},
	},

	created() {
		this.adopt()
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/** Read every switch off the object. */
		adopt() {
			const values = {}
			for (const row of this.rows) {
				const stored = readPath(this.objectData || {}, row.key) === true
				values[row.key] = row.invert ? !stored : stored
			}
			this.saved = values
			this.values = { ...values }
		},

		/**
		 * Flip one switch and save that one field.
		 *
		 * @param {object} row The row.
		 * @param {boolean} on The new switch state.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-switch-rows/specs/switch-rows/spec.md#requirement-a-toggle-saves-that-one-field
		 */
		async toggle(row, on) {
			if (!this.objectUrl) {
				this.notice = this.tr('This switch cannot be saved here.')
				return
			}
			this.notice = ''
			this.busy = row.key
			this.values = { ...this.values, [row.key]: on }
			const stored = row.invert ? !on : on
			try {
				const data = await patchObject(this.objectUrl, { [row.key]: stored })
				const written = data[row.key] !== undefined ? data[row.key] === true : stored
				const shown = row.invert ? !written : written
				this.saved = { ...this.saved, [row.key]: shown }
				this.values = { ...this.values, [row.key]: shown }
				/**
				 * @event saved A switch was written.
				 * @type {{field: string, value: boolean}}
				 */
				this.$emit('saved', { field: row.key, value: written })
			} catch (e) {
				this.values = { ...this.values, [row.key]: this.saved[row.key] }
				this.notice = serverErrorMessage(e)
			} finally {
				this.busy = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-switch-rows {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.cn-switch-rows__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.cn-switch-rows__row {
	padding: 10px 0;
	border-top: 1px solid var(--cn-board-hairline, var(--color-border));
}

.cn-switch-rows__row:first-child {
	border-top: none;
	padding-top: 0;
}

.cn-switch-rows__label {
	display: block;
	font-weight: 600;
}

.cn-switch-rows__hint {
	display: block;
	font-size: 12px;
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}
</style>
