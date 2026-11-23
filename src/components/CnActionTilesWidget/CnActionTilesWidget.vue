<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<ul class="cn-action-tiles" data-testid="cn-action-tiles">
		<li v-for="tile in shownTiles" :key="tile.key" class="cn-action-tiles__item">
			<button
				type="button"
				class="cn-action-tiles__tile"
				:disabled="tile.disabled"
				:data-testid="`cn-action-tile-${tile.key}`"
				@click="run(tile)">
				<span v-if="tile.icon" class="cn-action-tiles__icon" aria-hidden="true">
					<CnIcon :name="tile.icon" :size="20" />
				</span>
				<span class="cn-action-tiles__label">{{ tile.label }}</span>
			</button>
		</li>
	</ul>
</template>

<script>
import CnIcon from '../CnIcon/CnIcon.vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import {
	dropOptionalUnresolvedDeep,
	hasUnresolvedDeepTokens,
	resolveDeepTokens,
} from '../../utils/resolveFilterTokens.js'
import { evaluateWorkspaceCondition, isWorkspaceCondition } from '../../utils/visibleWhen.js'

/**
 * CnActionTilesWidget: a row of tiles, each an icon and a label, whose click
 * runs a declared action with the page's context (board PqWerkplekKlant: the
 * six steps of a call, each opening its form for the client on the line).
 *
 * `content.tiles` is `[{ id?, label, icon?, action, visibleWhen? }]`; `action`
 * has the `headerActions` shape and its `@workspace.<key>` / `@objectId` /
 * `@object.<field>` tokens are resolved at click time.
 *
 * @spec openspec/changes/dashboard-action-tiles/specs/dashboard-action-tiles/spec.md#requirement-a-dashboard-can-draw-a-row-of-action-tiles
 */
export default {
	name: 'CnActionTilesWidget',

	components: { CnIcon },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnWorkspaceContext: { default: null },
		/** The page's action dispatcher (CnPageRenderer), so `open-form` and `open-modal` open their dialogs. */
		cnDispatchAction: { default: null },
	},

	props: {
		/** The widget content: `{ tiles }`. */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/**
		 * The token context: the record the page shows, if any, and the page workspace.
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/**
		 * The tiles to draw: each with a label and an action, its visibleWhen
		 * holding, its action resolved, and disabled while a required token is open.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/dashboard-action-tiles/specs/dashboard-action-tiles/spec.md#requirement-a-dashboard-can-draw-a-row-of-action-tiles
		 */
		shownTiles() {
			const tiles = Array.isArray(this.content?.tiles) ? this.content.tiles : []
			const workspace = this.tokenCtx.workspace
			return tiles
				.filter((tile) => tile && typeof tile.label === 'string' && tile.label !== '' && tile.action && typeof tile.action === 'object')
				.filter((tile) => !isWorkspaceCondition(tile.visibleWhen) || evaluateWorkspaceCondition(tile.visibleWhen, workspace))
				.map((tile, index) => {
					const action = dropOptionalUnresolvedDeep(resolveDeepTokens(tile.action, this.tokenCtx))
					return {
						key: typeof tile.id === 'string' && tile.id !== '' ? tile.id : String(index),
						label: this.cnTranslate(tile.label),
						icon: typeof tile.icon === 'string' ? tile.icon : '',
						action,
						disabled: hasUnresolvedDeepTokens(action),
					}
				})
		},
	},

	methods: {
		/**
		 * Dispatch a tile's resolved action through the page's dispatcher, else
		 * the action dispatcher with the router.
		 *
		 * @param {object} tile A shown tile.
		 * @return {unknown}
		 * @spec openspec/changes/dashboard-action-tiles/specs/dashboard-action-tiles/spec.md#requirement-a-dashboard-can-draw-a-row-of-action-tiles
		 */
		run(tile) {
			if (tile.disabled) {
				return undefined
			}
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(tile.action)
			}
			return dispatchAction(tile.action, { router: this.$router || null })
		},
	},
}
</script>

<style scoped>
.cn-action-tiles {
	display: grid;
	grid-auto-columns: minmax(0, 1fr);
	grid-auto-flow: column;
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-action-tiles__item {
	display: flex;
	min-width: 0;
}

.cn-action-tiles__tile {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	min-width: 0;
	margin: 0;
	padding: 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.cn-action-tiles__tile:hover:not(:disabled) {
	border-color: var(--color-primary-element);
}

.cn-action-tiles__tile:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-action-tiles__tile:disabled {
	cursor: default;
	opacity: 0.6;
}

.cn-action-tiles__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-action-tiles__label {
	font-weight: 600;
	overflow-wrap: anywhere;
}

@media (max-width: 720px) {
	.cn-action-tiles {
		grid-auto-flow: row;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
