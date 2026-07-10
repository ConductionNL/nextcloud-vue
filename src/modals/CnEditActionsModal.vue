<!--
  CnEditActionsModal — edit the active page's action buttons (ADR-041 / ADR-004).

  Mutates the working manifest copy ONLY: add, remove, reorder, relabel, re-icon
  and re-target the active page's `config.actions[]` — the quick buttons and
  overflow Actions items the page renders. Isolated NcModal file per ADR-004.
  Every NcSelect carries an `inputLabel`.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-actions">
			<h2 class="cn-edit-actions__title">
				{{ t('nextcloud-vue', 'Edit actions') }}
			</h2>

			<NcEmptyContent
				v-if="!page"
				:name="t('nextcloud-vue', 'No editable page')" />
			<template v-else>
				<ul class="cn-edit-actions__list">
					<li v-for="(action, index) in actions" :key="action.id || index" class="cn-edit-actions__row">
						<div class="cn-edit-actions__fields">
							<NcTextField
								:value.sync="action.label"
								:label="t('nextcloud-vue', 'Label')"
								:label-visible="true" />
							<NcTextField
								:value.sync="action.icon"
								:label="t('nextcloud-vue', 'Icon')"
								:label-visible="true" />
							<NcSelect
								v-model="action.type"
								:options="actionTypes"
								:input-label="t('nextcloud-vue', 'Type')"
								:clearable="false" />
							<NcTextField
								:value.sync="action.target"
								:label="targetLabel(action)"
								:label-visible="true" />
						</div>
						<div class="cn-edit-actions__row-actions">
							<NcButton type="tertiary"
								:aria-label="t('nextcloud-vue', 'Move up')"
								:disabled="index === 0"
								@click="move(index, -1)">
								<template #icon>
									<ArrowUp :size="20" />
								</template>
							</NcButton>
							<NcButton type="tertiary"
								:aria-label="t('nextcloud-vue', 'Move down')"
								:disabled="index === actions.length - 1"
								@click="move(index, 1)">
								<template #icon>
									<ArrowDown :size="20" />
								</template>
							</NcButton>
							<NcButton type="tertiary" :aria-label="t('nextcloud-vue', 'Remove')" @click="remove(index)">
								<template #icon>
									<Delete :size="20" />
								</template>
							</NcButton>
						</div>
					</li>
				</ul>

				<div class="cn-edit-actions__footer">
					<NcButton type="secondary" @click="add">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Add action') }}
					</NcButton>
					<NcButton type="primary" :disabled="saving" @click="onDone">
						<template #icon>
							<NcLoadingIcon v-if="saving" :size="20" />
							<ContentSaveOutline v-else :size="20" />
						</template>
						{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
					</NcButton>
				</div>
			</template>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

const ACTION_TYPES = ['open-page', 'navigate', 'open-modal', 'handler']

export default {
	name: 'CnEditActionsModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcEmptyContent, NcLoadingIcon, Plus, Delete, ArrowUp, ArrowDown },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose active-page `config.actions[]` is edited.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
		/**
		 * The active page's id; selects which page's actions to edit.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
	},

	computed: {
		/** Closed enum of action types (open-page / navigate / open-modal / handler). */
		actionTypes() {
			return ACTION_TYPES
		},
		/** The active page object from the working manifest, or null. */
		page() {
			const pages = this.working && Array.isArray(this.working.pages) ? this.working.pages : []
			return pages.find((p) => p && p.id === this.pageId) ?? pages[0] ?? null
		},
		/** The page's `config.actions[]` array (ensured to exist). */
		actions() {
			if (!this.page) return []
			// Normalise the working page in place so the editor can bind to it —
			// the working manifest is ours to mutate by design (see CnEditPagesModal).
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!this.page.config || typeof this.page.config !== 'object') this.$set(this.page, 'config', {})
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(this.page.config.actions)) this.$set(this.page.config, 'actions', [])
			return this.page.config.actions
		},
	},

	methods: {
		t,
		/**
		 * Human label for the target field, hinting what each type targets.
		 * @param action
		 */
		targetLabel(action) {
			switch (action.type) {
			case 'open-page': return t('nextcloud-vue', 'Target page id')
			case 'navigate': return t('nextcloud-vue', 'URL or route')
			case 'open-modal': return t('nextcloud-vue', 'Modal key')
			default: return t('nextcloud-vue', 'Handler name')
			}
		},
		/** Append a new blank action to the working page. */
		add() {
			this.actions.push({ id: `action-${this.actions.length + 1}`, label: '', icon: '', type: 'open-page', target: '' })
		},
		/**
		 * Remove the action at `index`.
		 * @param index
		 */
		remove(index) {
			this.actions.splice(index, 1)
		},
		/**
		 * Move the action at `index` by `delta` positions (reorder).
		 * @param index
		 * @param delta
		 */
		move(index, delta) {
			const to = index + delta
			if (to < 0 || to >= this.actions.length) return
			const [item] = this.actions.splice(index, 1)
			this.actions.splice(to, 0, item)
		},
	},
}
</script>

<style scoped>
.cn-edit-actions {
	padding: 20px;
}

.cn-edit-actions__title {
	margin-top: 0;
}

.cn-edit-actions__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-edit-actions__row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-edit-actions__fields {
	display: flex;
	gap: 8px;
	flex: 1 1 auto;
	flex-wrap: wrap;
}

.cn-edit-actions__row-actions {
	display: flex;
	gap: 2px;
}

.cn-edit-actions__footer {
	display: flex;
	justify-content: space-between;
	margin-top: 16px;
}
</style>
