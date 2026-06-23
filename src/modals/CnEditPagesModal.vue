<!--
  CnEditPagesModal — edit the app's pages (ADR-041 / ADR-004).

  Mutates the working manifest copy ONLY: add, remove, reorder, relabel,
  re-type and re-route the manifest's `pages[]`. Each page's `id` is the
  vue-router route name (referenced by menu items' `route`), so it stays
  read-only to avoid silently breaking menu links; Title / Type / Route are
  editable. Isolated NcModal file per ADR-004; every NcSelect carries an
  `inputLabel`.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-pages">
			<h2 class="cn-edit-pages__title">
				{{ t('nextcloud-vue', 'Edit pages') }}
			</h2>

			<NcEmptyContent
				v-if="!pages.length"
				:name="t('nextcloud-vue', 'No pages yet')"
				:description="t('nextcloud-vue', 'Add a page to get started.')" />

			<ul v-else class="cn-edit-pages__list">
				<li v-for="(page, index) in pages" :key="page.id || index" class="cn-edit-pages__row">
					<div class="cn-edit-pages__fields">
						<NcTextField
							:value.sync="page.title"
							:label="t('nextcloud-vue', 'Title')"
							:label-visible="true" />
						<NcSelect
							class="cn-edit-pages__type"
							:value="selectedType(page)"
							:options="pageTypes"
							:input-label="t('nextcloud-vue', 'Type')"
							label="label"
							:clearable="false"
							@input="setType(page, $event)" />
						<NcTextField
							:value.sync="page.route"
							:label="t('nextcloud-vue', 'Route')"
							:label-visible="true"
							:placeholder="'/example'" />
						<span class="cn-edit-pages__id" :title="t('nextcloud-vue', 'Route name (used by menu links)')">
							{{ page.id }}
						</span>
					</div>
					<div class="cn-edit-pages__row-actions">
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
							:disabled="index === pages.length - 1"
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

			<div class="cn-edit-pages__footer">
				<NcButton type="secondary" @click="add">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add page') }}
				</NcButton>
				<NcButton type="primary" @click="$emit('close')">
					{{ t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'

// The renderer's closed page-type enum (CnPageRenderer dispatches on these).
const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

export default {
	name: 'CnEditPagesModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcEmptyContent, Plus, Delete, ArrowUp, ArrowDown },

	props: {
		/**
		 * The working manifest copy whose `pages[]` is edited in place. Never the
		 * base — the editor holds the base separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** Closed page-type options for the Type dropdown. */
		pageTypes() {
			return PAGE_TYPES
		},
		/** The working manifest's pages array (ensured to exist). */
		pages() {
			if (!this.working) return []
			// Lazily normalise to an array so the editor always has a mutable list.
			// The working manifest is ours to mutate by design — never the base.
			// eslint-disable-next-line vue/no-mutating-props, vue/no-side-effects-in-computed-properties
			if (!Array.isArray(this.working.pages)) this.working.pages = []
			return this.working.pages
		},
	},

	methods: {
		t,
		/**
		 * Resolve a page's type to its option (synthetic fallback for unknown values).
		 * @param page
		 */
		selectedType(page) {
			const type = (page && page.type) || 'custom'
			return this.pageTypes.find((o) => o.value === type) || { value: type, label: type }
		},
		/**
		 * Write the chosen type back onto the page.
		 * @param page
		 * @param option
		 */
		setType(page, option) {
			this.$set(page, 'type', option ? option.value : 'custom')
		},
		/**
		 * Append a new blank page. The `id` (route name) is generated unique and
		 * kept stable thereafter; `route` defaults to a slug of the id.
		 */
		add() {
			let n = this.pages.length + 1
			const ids = new Set(this.pages.map((p) => p && p.id))
			while (ids.has(`page-${n}`)) n++
			const id = `page-${n}`
			this.pages.push({ id, route: `/${id}`, type: 'custom', title: '', config: {} })
		},
		/**
		 * Remove the page at `index`.
		 * @param index
		 */
		remove(index) {
			this.pages.splice(index, 1)
		},
		/**
		 * Move the page at `index` by `delta` positions (reorder).
		 * @param index
		 * @param delta
		 */
		move(index, delta) {
			const to = index + delta
			if (to < 0 || to >= this.pages.length) return
			const [item] = this.pages.splice(index, 1)
			this.pages.splice(to, 0, item)
		},
	},
}
</script>

<style scoped>
.cn-edit-pages {
	padding: 20px;
}

.cn-edit-pages__title {
	margin-top: 0;
}

.cn-edit-pages__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-edit-pages__row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-edit-pages__fields {
	display: flex;
	gap: 8px;
	flex: 1 1 auto;
	flex-wrap: wrap;
	align-items: flex-end;
}

.cn-edit-pages__type {
	min-width: 160px;
}

.cn-edit-pages__id {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding-bottom: 8px;
	white-space: nowrap;
}

.cn-edit-pages__row-actions {
	display: flex;
	gap: 2px;
}

.cn-edit-pages__footer {
	display: flex;
	justify-content: space-between;
	margin-top: 16px;
}
</style>
