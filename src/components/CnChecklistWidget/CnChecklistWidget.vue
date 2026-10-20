<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-checklist-widget" data-testid="cn-checklist-widget">
		<p v-if="items.length === 0" class="cn-checklist-widget__muted" data-testid="cn-checklist-empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<p class="cn-checklist-widget__summary" data-testid="cn-checklist-summary">
				{{ summary }}
			</p>
			<ul class="cn-checklist-widget__items">
				<li v-for="item in items" :key="item.id" class="cn-checklist-widget__item">
					<NcCheckboxRadioSwitch
						:modelValue="item.checked"
						:disabled="!writable || busy"
						:data-testid="`cn-checklist-item-${item.id}`"
						@update:modelValue="toggle(item, $event)">
						{{ item.label }}
					</NcCheckboxRadioSwitch>
					<p v-if="item.description" class="cn-checklist-widget__description">
						{{ item.description }}
					</p>
				</li>
			</ul>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { readPath } from '../../utils/readPath.js'

/**
 * CnChecklistWidget — the checklist a record carries, ticked in place.
 *
 * The items are read off the record in view (`content.path`, `checklist` by
 * default), each `{ id, label, description, checked }` unless `content`
 * names other fields. A tick is written through the detail page's record
 * source (`cnRecordChecklist`, provided by CnDetailPage when its source can
 * check items, as the `tasks` source does through the task engine). The box
 * follows the record the write answers with, so a refused tick leaves the
 * item as it was. Without a source that can write, or on a record the source
 * says can no longer be ticked, the list is read-only.
 *
 * An item without an id is left out: the write addresses an item by its id,
 * and a box that cannot be saved would look saved.
 */
export default {
	name: 'CnChecklistWidget',

	components: { NcCheckboxRadioSwitch },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnRecordChecklist: { default: null },
	},

	props: {
		/**
		 * The widget configuration: `path` (where the items sit on the record,
		 * default `checklist`), `idField` / `labelField` / `descriptionField` /
		 * `checkedField` (default `id`, `label`, `description`, `checked`),
		 * `emptyText` (shown when the record carries no items).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record in view, as the detail page hands it to a widget. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			/** Whether a tick is being written, so two cannot cross. */
			busy: false,
		}
	},

	computed: {
		/**
		 * The record: the prop, else the page's injected context.
		 *
		 * @return {object|null}
		 */
		record() {
			if (this.objectData) {
				return this.objectData
			}
			const context = this.cnObjectContext
			const value = context && typeof context === 'object' && 'value' in context ? context.value : context
			return value?.object || null
		},

		/**
		 * The items, normalised, without the ones that have no id.
		 *
		 * @return {Array<{id: string, label: string, description: string, checked: boolean}>}
		 */
		items() {
			const content = this.content || {}
			const list = this.record ? readPath(this.record, content.path || 'checklist') : null
			if (!Array.isArray(list)) {
				return []
			}
			return list
				.filter((item) => item && typeof item === 'object' && String(item[content.idField || 'id'] ?? '').trim() !== '')
				.map((item) => {
					const id = String(item[content.idField || 'id']).trim()
					return {
						id,
						label: String(item[content.labelField || 'label'] ?? '').trim() || id,
						description: String(item[content.descriptionField || 'description'] ?? '').trim(),
						checked: item[content.checkedField || 'checked'] === true,
					}
				})
		},

		/**
		 * "2 of 4 done".
		 *
		 * @return {string}
		 */
		summary() {
			const done = this.items.filter((item) => item.checked).length
			return t('nextcloud-vue', '{done} of {total} done', { done, total: this.items.length })
		},

		/**
		 * Whether a tick can be written for this record.
		 *
		 * @return {boolean}
		 */
		writable() {
			return Boolean(this.cnRecordChecklist && this.cnRecordChecklist.canCheck === true)
		},

		/** @return {string} The empty text, through the app's catalogue. */
		emptyLabel() {
			const text = this.content?.emptyText
			return typeof text === 'string' && text !== '' ? this.cnTranslate(text) : t('nextcloud-vue', 'Nothing to check off')
		},
	},

	methods: {
		/**
		 * Write one tick through the page's record source.
		 *
		 * @param {{id: string}} item The item.
		 * @param {boolean} checked The new state.
		 * @return {Promise<void>}
		 */
		async toggle(item, checked) {
			if (!this.writable || this.busy) {
				return
			}
			this.busy = true
			try {
				await this.cnRecordChecklist.check(item.id, checked === true)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-checklist-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.cn-checklist-widget__summary,
.cn-checklist-widget__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-checklist-widget__items {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-checklist-widget__item {
	min-width: 0;
}

.cn-checklist-widget__description {
	margin: 0 0 4px 36px;
	color: var(--color-text-maxcontrast);
}
</style>
