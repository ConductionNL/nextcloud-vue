<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-field-groups-widget" data-testid="cn-field-groups-widget">
		<CnFieldListWidget
			v-for="(group, index) in groupContents"
			:key="`${group.field}-${index}`"
			:ref="(el) => setList(index, el)"
			:content="group"
			:objectData="objectData"
			:objectId="objectId"
			:register="register"
			:schema="schema"
			@header="onGroupHeader(index, $event)"
			@saved="onSaved" />
		<NcActions
			v-if="!inTitle && menuItems.length > 0"
			:menuName="addLabel"
			:ariaLabel="addAriaLabel"
			class="cn-field-groups-widget__add"
			data-testid="cn-field-groups-add">
			<template #icon>
				<Plus :size="16" />
			</template>
			<NcActionButton
				v-for="item in menuItems"
				:key="item.key"
				:data-testid="`cn-field-groups-add-${item.key}`"
				@click="item.run">
				{{ item.label }}
			</NcActionButton>
		</NcActions>
	</div>
</template>

<script>
import { NcActionButton, NcActions } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnFieldListWidget from '../CnFieldListWidget/CnFieldListWidget.vue'

/**
 * CnFieldGroupsWidget: the `field-groups` widget: several list fields of the
 * record in one card, each drawn as a field list in the pairs look (a label
 * beside a value), with one "Add" that offers a choice of list. Board PqKlant
 * "Contactkanalen": e-mail addresses, phone numbers and social profiles, one
 * "Toevoegen" menu in the card's title row.
 *
 * Each group is a `field-list` content (`field`, `row`, `add`, `edit`,
 * `remove`, `mirror`, `emptyLabel`, `emptyText`), so a group saves exactly as
 * a field list does: one PATCH of its own field after re-reading the stored
 * value, the server's refusal shown in its words.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-several-list-fields-share-one-card-and-one-add-menu
 */
export default {
	name: 'CnFieldGroupsWidget',

	components: { CnFieldListWidget, NcActionButton, NcActions, Plus },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `groups`: `[<field-list content>]`, drawn in order in the pairs look.
		 * - `add`: `{ label?, ariaLabel?, placement?: 'title' | 'footer' }`: the one Add, a menu with an
		 *   item per group that has an `add` (the group's `add.label`). `title` reports it for the card's
		 *   title row on the `header` event; `footer` (default) draws it under the groups.
		 * - `readOnly`: no add, edit or remove in any group.
		 * - `afterSave`: the field-list `afterSave` for every group that declares none.
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

	emits: ['header', 'saved'],

	data() {
		return {
			/** The add action each group reported, by group index. */
			groupActions: {},
			/** The mounted field lists, by group index. */
			lists: {},
		}
	},

	computed: {
		/**
		 * The groups as field-list contents: the pairs look, the add opened
		 * from this widget's menu, and the shared `readOnly` and `afterSave`.
		 *
		 * @return {Array<object>}
		 */
		groupContents() {
			const groups = Array.isArray(this.content.groups) ? this.content.groups : []
			return groups
				.filter((group) => group && typeof group.field === 'string' && group.field !== '')
				.map((group) => ({
					...group,
					variant: 'pairs',
					readOnly: this.content.readOnly === true || group.readOnly === true,
					afterSave: group.afterSave || this.content.afterSave,
					add: group.add ? { ...group.add, trigger: 'button', placement: 'title' } : undefined,
				}))
		},

		/** Whether the Add sits in the card's title row. */
		inTitle() {
			return this.content.add?.placement === 'title'
		},

		addLabel() {
			return this.tr(this.content.add?.label || 'Add')
		},

		addAriaLabel() {
			return this.tr(this.content.add?.ariaLabel || '') || this.addLabel
		},

		/**
		 * One item per group that can add: its label, and opening its form.
		 *
		 * @return {Array<{key: string, label: string, run: () => void}>}
		 */
		menuItems() {
			return this.groupContents
				.map((group, index) => ({ group, index, action: this.groupActions[index] }))
				.filter(({ action }) => action)
				.map(({ group, index, action }) => ({
					key: `${group.field}-${index}`,
					label: action.label,
					run: () => this.openGroup(index),
				}))
		},

		/**
		 * What the card's title row draws: one outlined Add with the menu.
		 *
		 * @return {{actions: Array<object>}}
		 */
		header() {
			if (!this.inTitle || this.menuItems.length === 0) {
				return { actions: [] }
			}
			return {
				actions: [{
					label: this.addLabel,
					ariaLabel: this.addAriaLabel,
					icon: 'Plus',
					variant: 'secondary',
					items: this.menuItems.map(({ label, run }) => ({ label, run })),
				}],
			}
		},
	},

	watch: {
		header: {
			immediate: true,
			handler(header) {
				/**
				 * @event header The card's title-row actions, `{ actions }`, for the host to draw.
				 */
				this.$emit('header', header)
			},
		},
	},

	methods: {
		/**
		 * Pass a group's save on.
		 *
		 * @param {{field: string, value: Array}} payload The group's field and the list it saved.
		 */
		onSaved(payload) {
			/**
			 * @event saved One group's list was saved: one PATCH of its field succeeded.
			 * @type {{field: string, value: Array}}
			 */
			this.$emit('saved', payload)
		},

		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		setList(index, el) {
			if (el) {
				this.lists[index] = el
			} else {
				delete this.lists[index]
			}
		},

		/**
		 * Keep the add action a group reported (none on a read-only group).
		 *
		 * @param {number} index The group.
		 * @param {{actions?: Array}} header What the group reported.
		 * @return {void}
		 */
		onGroupHeader(index, header) {
			const action = (header && Array.isArray(header.actions) ? header.actions : []).find((candidate) => candidate && candidate.add)
			if (action) {
				this.groupActions = { ...this.groupActions, [index]: action }
			} else if (this.groupActions[index]) {
				const rest = { ...this.groupActions }
				delete rest[index]
				this.groupActions = rest
			}
		},

		/**
		 * Open one group's form and close the others.
		 *
		 * @param {number} index The group.
		 * @return {void}
		 */
		openGroup(index) {
			for (const [key, list] of Object.entries(this.lists)) {
				if (Number(key) !== index && list) {
					list.adding = false
				}
			}
			const list = this.lists[index]
			if (list) {
				list.adding = true
			}
		},
	},
}
</script>

<style scoped>
.cn-field-groups-widget {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
}

/* One label column for every group, so the labels line up across the lists. */
.cn-field-groups-widget :deep(.cn-field-list-widget__pairs) {
	grid-template-columns: 120px minmax(0, 1fr);
}

.cn-field-groups-widget__add {
	align-self: flex-start;
}
</style>
