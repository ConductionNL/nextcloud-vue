<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-kanban">
		<div v-if="loading" class="cn-object-kanban__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<div v-else-if="localColumns.length === 0" class="cn-object-kanban__empty">
			<!-- @slot empty Custom empty state shown when there are no columns to render. -->
			<slot name="empty">
				<NcEmptyContent :name="emptyText">
					<template #icon>
						<ViewColumn :size="64" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<div v-else class="cn-object-kanban__board">
			<div
				v-for="column in localColumns"
				:key="columnKey(column.value)"
				class="cn-object-kanban__column">
				<div class="cn-object-kanban__column-header">
					<!-- @slot column-header Override a column's header. -->
					<!-- @binding {object} column The column ({ value, cards, total, limit, offset }). -->
					<slot name="column-header" :column="column">
						<span class="cn-object-kanban__column-title">{{ columnLabel(column) }}</span>
						<span class="cn-object-kanban__column-count">{{ column.total }}</span>
					</slot>
				</div>

				<draggable
					:list="column.cards"
					tag="div"
					class="cn-object-kanban__column-cards"
					group="cn-object-kanban-cards"
					:data-column-value="columnKey(column.value)"
					@start="onDragStart(column)"
					@change="onColumnChange($event, column)">
					<div
						v-for="card in column.cards"
						:key="cardKey(card)"
						class="cn-object-kanban__card"
						:class="{ 'cn-object-kanban__card--pending': isPending(card) }">
						<!-- @slot card Fully replace the default card rendering. -->
						<!-- @binding {object} object The card's object. -->
						<!-- @binding {object} column The column the card currently sits in. -->
						<slot name="card" :object="card" :column="column">
							<div class="cn-object-kanban__card-title" @click="onCardClick(card)">
								{{ cardTitle(card) }}
							</div>
							<div v-if="cardFields.length" class="cn-object-kanban__card-fields">
								<div
									v-for="field in cardFields"
									:key="field"
									class="cn-object-kanban__card-field">
									<CnCellRenderer
										:value="card[field]"
										:property="schemaProperty(field)"
										:truncate="40" />
								</div>
							</div>
						</slot>
					</div>
				</draggable>

				<div v-if="hasMore(column)" class="cn-object-kanban__load-more">
					<NcButton :disabled="isColumnLoading(column)" @click="onLoadMore(column)">
						<template v-if="isColumnLoading(column)" #icon>
							<NcLoadingIcon :size="16" />
						</template>
						{{ loadMoreLabel }}
					</NcButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import draggable from 'vuedraggable'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import ViewColumn from 'vue-material-design-icons/ViewColumn.vue'
import { CnCellRenderer } from '../CnCellRenderer/index.js'

/**
 * CnObjectKanban — Kanban board over a schema property's distinct values.
 *
 * Renders one column per distinct value of `groupByField` and paginates each
 * column's cards independently ("load more", never a whole column at once).
 * Column values/order come from (in precedence order) an explicit
 * `columnOrder`, the `groupByField` schema property's `enum`, or values
 * discovered from `objects` — mirroring OpenRegister's
 * `ViewPresentationService::deriveColumnValues()`.
 *
 * Two rendering modes:
 * - **Pre-built columns** — pass `columns` (the shape returned by
 *   `GET /api/views/{id}/kanban`: `[{ value, cards, total, limit, offset }]`);
 *   the host owns pagination and re-fetches on `load-more`.
 * - **Flat objects** — pass `objects` + `groupByField` (and optionally
 *   `columnOrder`/`schema`); the component derives and paginates columns
 *   locally.
 *
 * Dragging a card to another column does NOT write anything itself — there is
 * deliberately no bespoke "move card" endpoint (REQ-VIEW-KANBAN-03). The move
 * is applied optimistically to the local board and the component emits
 * `move`; the host performs the actual object PATCH/PUT through the existing
 * guarded write path and reports back:
 * - On success, nothing further is required (the optimistic move already
 *   reflects it) — optionally call `resolveMove(id)` to clear the pending
 *   visual state sooner.
 * - On a rejected (e.g. illegal lifecycle transition) write, call
 *   `rejectMove(id, reason)` — the card snaps back to its origin column and
 *   `move-rejected` fires with the reason for the host to surface.
 *
 * ```vue
 * <CnObjectKanban
 *   :objects="objects"
 *   group-by-field="status"
 *   :column-order="['todo', 'doing', 'done']"
 *   :card-fields="['title', 'assignee']"
 *   :schema="schema"
 *   ref="kanban"
 *   @move="onMove"
 *   @load-more="fetchMoreCards" />
 * ```
 * ```js
 * async onMove({ object, groupByField, fromValue, toValue }) {
 *   try {
 *     await patchObject(object.id, { [groupByField]: toValue })
 *   } catch (e) {
 *     this.$refs.kanban.rejectMove(object.id, e.message)
 *   }
 * }
 * ```
 */
export default {
	name: 'CnObjectKanban',

	components: {
		draggable,
		NcButton,
		NcLoadingIcon,
		NcEmptyContent,
		ViewColumn,
		CnCellRenderer,
	},

	props: {
		/**
		 * Flat objects to derive columns from (ignored when `columns` is set).
		 *
		 * @type {Array<object>}
		 */
		objects: {
			type: Array,
			default: () => [],
		},
		/**
		 * Pre-built columns, e.g. the response of `GET /api/views/{id}/kanban`.
		 *
		 * @type {Array<{value: string|number, cards: Array<object>, total: number, limit: number, offset: number}>|null}
		 */
		columns: {
			type: Array,
			default: null,
		},
		/** The schema property whose distinct values become columns. */
		groupByField: {
			type: String,
			required: true,
		},
		/** Explicit column order. Takes precedence over the schema's enum order. */
		columnOrder: {
			type: Array,
			default: null,
		},
		/** Object fields rendered on each card (in order). */
		cardFields: {
			type: Array,
			default: () => [],
		},
		/** Schema definition, used to resolve enum column order and card field types. */
		schema: {
			type: Object,
			default: null,
		},
		/** Overall loading state (initial board fetch). */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Column values currently loading more cards (drives the per-column spinner). */
		loadingColumns: {
			type: Array,
			default: () => [],
		},
		/** Cards shown per column before "load more", in local (`objects`-driven) mode. */
		pageSize: {
			type: Number,
			default: 20,
		},
		/** Object property used as each card's identity. */
		rowKey: {
			type: String,
			default: 'id',
		},
	},

	data() {
		return {
			localColumns: [],
			// column.value -> full unpaginated card list, local mode only.
			fullCardsByColumn: {},
			// Suppressed while a move is pending so the prop-driven rebuild
			// doesn't clobber the optimistic UI before the host's data catches up.
			suppressRebuild: false,
			// objectId -> { fromValue, toValue, card, originIndex }
			pendingMoves: {},
			dragOriginValue: null,
		}
	},

	computed: {
		emptyText() {
			return t('nextcloud-vue', 'No columns to show')
		},

		loadMoreLabel() {
			return t('nextcloud-vue', 'Load more')
		},
	},

	watch: {
		objects: {
			handler() {
				if (!this.suppressRebuild) this.rebuild()
			},
			deep: false,
		},
		columns: {
			handler() {
				if (!this.suppressRebuild) this.rebuild()
			},
			deep: false,
		},
		groupByField() {
			this.rebuild()
		},
		columnOrder: {
			handler() {
				this.rebuild()
			},
			deep: true,
		},
	},

	created() {
		this.rebuild()
	},

	methods: {
		t,

		/**
		 * Rebuild `localColumns` from either the `columns` prop (backend-paginated
		 * mode) or `objects` + `groupByField` (locally-derived mode).
		 *
		 * @return {void}
		 */
		rebuild() {
			if (Array.isArray(this.columns)) {
				this.localColumns = this.columns.map((column) => ({
					value: column.value,
					cards: Array.isArray(column.cards) ? [...column.cards] : [],
					total: typeof column.total === 'number' ? column.total : (column.cards || []).length,
					limit: column.limit,
					offset: column.offset,
				}))
				return
			}

			const values = this.deriveColumnValues()
			const fullByColumn = {}
			this.localColumns = values.map((value) => {
				const fullCards = this.objects.filter((object) => object && object[this.groupByField] === value)
				fullByColumn[this.columnKey(value)] = fullCards
				return {
					value,
					cards: fullCards.slice(0, this.pageSize),
					total: fullCards.length,
					limit: this.pageSize,
					offset: 0,
				}
			})
			this.fullCardsByColumn = fullByColumn
		},

		/**
		 * Derive the ordered column values: `columnOrder` > schema enum order >
		 * distinct values observed in `objects`. Mirrors
		 * `ViewPresentationService::deriveColumnValues()`.
		 *
		 * @return {Array<*>}
		 */
		deriveColumnValues() {
			if (Array.isArray(this.columnOrder) && this.columnOrder.length > 0) {
				return [...this.columnOrder]
			}

			const enumValues = this.schema?.properties?.[this.groupByField]?.enum
			if (Array.isArray(enumValues) && enumValues.length > 0) {
				return [...enumValues]
			}

			return this.discoverDistinctValues()
		},

		/**
		 * Distinct `groupByField` values observed in `objects`, in first-seen order.
		 *
		 * @return {Array<*>}
		 */
		discoverDistinctValues() {
			const seen = new Set()
			const values = []
			for (const object of this.objects) {
				const value = object?.[this.groupByField]
				if (value !== undefined && value !== null && !seen.has(value)) {
					seen.add(value)
					values.push(value)
				}
			}
			return values
		},

		/**
		 * Stable string key for a column value (used as a `:key` and as the
		 * `fullCardsByColumn` index — object/array values are unlikely but guarded).
		 *
		 * @param {*} value The column value.
		 * @return {string}
		 */
		columnKey(value) {
			return typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)
		},

		/**
		 * The card's identity, per `rowKey`.
		 *
		 * @param {object} card The card object.
		 * @return {*}
		 */
		cardKey(card) {
			return card?.[this.rowKey]
		},

		/**
		 * Display label for a column: its schema `oneOf[].title` when the
		 * property declares per-value titles, otherwise the raw value.
		 *
		 * @param {object} column The column.
		 * @return {string}
		 */
		columnLabel(column) {
			const oneOf = this.schema?.properties?.[this.groupByField]?.oneOf
			if (Array.isArray(oneOf)) {
				const match = oneOf.find((entry) => entry?.const === column.value)
				if (match?.title) return match.title
			}
			return String(column.value)
		},

		/**
		 * Best-effort card title: the schema's configured name field, else
		 * `title`/`name`/the row key.
		 *
		 * @param {object} card The card object.
		 * @return {string}
		 */
		cardTitle(card) {
			const nameField = this.schema?.configuration?.objectNameField
			if (nameField && card[nameField]) return String(card[nameField])
			return String(card.title || card.name || card[this.rowKey] || '—')
		},

		/**
		 * The schema property definition for a card field, if known.
		 *
		 * @param {string} field The field name.
		 * @return {object|undefined}
		 */
		schemaProperty(field) {
			return this.schema?.properties?.[field]
		},

		/**
		 * Whether a column has more cards to load: backend-paginated mode compares
		 * `cards.length` to `total`; local mode compares to the full filtered set.
		 *
		 * @param {object} column The column.
		 * @return {boolean}
		 */
		hasMore(column) {
			if (Array.isArray(this.columns)) {
				return column.cards.length < column.total
			}
			const full = this.fullCardsByColumn[this.columnKey(column.value)] || []
			return column.cards.length < full.length
		},

		/**
		 * Whether a column's "load more" is in flight.
		 *
		 * @param {object} column The column.
		 * @return {boolean}
		 */
		isColumnLoading(column) {
			return this.loadingColumns.includes(column.value)
		},

		/**
		 * Whether a card has an unresolved optimistic move.
		 *
		 * @param {object} card The card object.
		 * @return {boolean}
		 */
		isPending(card) {
			return Object.prototype.hasOwnProperty.call(this.pendingMoves, this.cardKey(card))
		},

		/**
		 * Handle a column's "load more" click: local mode reveals the next page
		 * from the already-fetched full set; backend-paginated mode only emits —
		 * the host fetches the next page and passes updated `columns`.
		 *
		 * @param {object} column The column.
		 * @return {void}
		 */
		onLoadMore(column) {
			if (!Array.isArray(this.columns)) {
				const full = this.fullCardsByColumn[this.columnKey(column.value)] || []
				column.cards = full.slice(0, column.cards.length + this.pageSize)
			}
			/**
			 * @event load-more Emitted when a column's "load more" is clicked.
			 * @type {{ value: *, offset: number }}
			 */
			this.$emit('load-more', { value: column.value, offset: column.cards.length })
		},

		/**
		 * Card click (ignored while the card is mid-drag).
		 *
		 * @param {object} card The card object.
		 * @return {void}
		 */
		onCardClick(card) {
			/**
			 * @event card-click Emitted when a card is clicked (not dragged).
			 * @type {object} The card's object.
			 */
			this.$emit('card-click', card)
		},

		/**
		 * vuedraggable `@start` — remember which column a drag began in, since
		 * `@change` on the destination column doesn't know the source.
		 *
		 * @param {object} column The column the drag started in.
		 * @return {void}
		 */
		onDragStart(column) {
			this.dragOriginValue = column.value
		},

		/**
		 * vuedraggable `@change` on a column's card list. Only the destination
		 * column's `added` event carries the dropped object; a same-column
		 * reorder (`moved`) or the source column's `removed` are no-ops here.
		 *
		 * @param {object} evt vuedraggable's change event.
		 * @param {object} column The column the event fired on.
		 * @return {void}
		 */
		onColumnChange(evt, column) {
			if (!evt.added) return

			const card = evt.added.element
			const fromValue = this.dragOriginValue
			const toValue = column.value
			this.dragOriginValue = null

			if (fromValue === toValue) return

			this.commitMove(card, fromValue, toValue, evt.added.newIndex)
		},

		/**
		 * Record the pending move and emit it for the host to persist. The card
		 * has already been moved optimistically by vuedraggable's v-model splice.
		 *
		 * @param {object} card The moved object.
		 * @param {*} fromValue The origin column's value.
		 * @param {*} toValue The destination column's value.
		 * @param {number} originIndex The index the card is currently at in the destination column (used only for logging/debugging).
		 * @return {void}
		 */
		commitMove(card, fromValue, toValue, originIndex) {
			const id = this.cardKey(card)
			this.suppressRebuild = true
			this.pendingMoves = {
				...this.pendingMoves,
				[id]: { fromValue, toValue, card, originIndex },
			}

			/**
			 * @event move Emitted after a card is optimistically moved to another
			 * column. The host performs the actual object write through the
			 * existing guarded PATCH/PUT endpoint and calls `resolveMove`/
			 * `rejectMove` on this component to confirm or roll back.
			 * @type {{ object: object, groupByField: string, fromValue: *, toValue: * }}
			 */
			this.$emit('move', {
				object: card,
				groupByField: this.groupByField,
				fromValue,
				toValue,
			})
		},

		/**
		 * Confirm a pending move succeeded — clears its pending visual state.
		 * The card already sits in the destination column (optimistic UI); no
		 * further mutation is needed.
		 *
		 * @param {*} objectId The moved object's `rowKey` value.
		 * @return {void}
		 * @public
		 */
		resolveMove(objectId) {
			this.clearPending(objectId)
		},

		/**
		 * Roll back a rejected move: the card returns to its origin column and
		 * `move-rejected` fires with the server's reason.
		 *
		 * @param {*} objectId The moved object's `rowKey` value.
		 * @param {string} [reason] The rejection reason (e.g. an illegal lifecycle
		 *   transition message) to surface to the user.
		 * @return {void}
		 * @public
		 */
		rejectMove(objectId, reason) {
			const pending = this.pendingMoves[objectId]
			if (!pending) return

			const toColumn = this.localColumns.find((c) => c.value === pending.toValue)
			const fromColumn = this.localColumns.find((c) => c.value === pending.fromValue)

			if (toColumn) {
				const idx = toColumn.cards.findIndex((c) => this.cardKey(c) === objectId)
				if (idx !== -1) toColumn.cards.splice(idx, 1)
			}
			if (fromColumn) {
				fromColumn.cards.push(pending.card)
			}

			this.clearPending(objectId)

			/**
			 * @event move-rejected Emitted after `rejectMove()` rolls a card back
			 * to its origin column.
			 * @type {{ object: object, fromValue: *, toValue: *, reason: (string|undefined) }}
			 */
			this.$emit('move-rejected', {
				object: pending.card,
				fromValue: pending.fromValue,
				toValue: pending.toValue,
				reason,
			})
		},

		/**
		 * Remove a move from the pending map and, once none remain, allow
		 * prop-driven rebuilds again.
		 *
		 * @param {*} objectId The moved object's `rowKey` value.
		 * @return {void}
		 */
		clearPending(objectId) {
			const { [objectId]: _removed, ...rest } = this.pendingMoves
			this.pendingMoves = rest
			if (Object.keys(rest).length === 0) this.suppressRebuild = false
		},
	},
}
</script>

<style scoped>
.cn-object-kanban__loading,
.cn-object-kanban__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40px;
}

.cn-object-kanban__board {
	display: flex;
	gap: 16px;
	overflow-x: auto;
	padding-bottom: 8px;
}

.cn-object-kanban__column {
	display: flex;
	flex-direction: column;
	flex: 0 0 280px;
	min-width: 280px;
	background: var(--color-background-dark);
	border-radius: var(--border-radius-large, 10px);
	padding: 8px;
}

.cn-object-kanban__column-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px;
	font-weight: 600;
}

.cn-object-kanban__column-count {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
}

.cn-object-kanban__column-cards {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 40px;
}

.cn-object-kanban__card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 8px);
	padding: 10px;
	cursor: grab;
	transition: opacity 0.15s ease;
}

.cn-object-kanban__card--pending {
	opacity: 0.6;
}

.cn-object-kanban__card-title {
	font-weight: 500;
	cursor: pointer;
}

.cn-object-kanban__card-fields {
	margin-top: 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-object-kanban__load-more {
	display: flex;
	justify-content: center;
	padding-top: 8px;
}
</style>
