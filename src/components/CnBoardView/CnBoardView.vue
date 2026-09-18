<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-board-view" data-testid="cn-board-view">
		<p v-if="!usable" class="cn-board-view__unusable" data-testid="cn-board-unusable">
			{{ unusableText }}
		</p>

		<div
			v-for="lane in lanes"
			v-else
			:key="`lane-${lane.key}`"
			class="cn-board-view__lane"
			data-testid="cn-board-lane"
			:data-lane="lane.key">
			<button
				v-if="lane.key !== ''"
				class="cn-board-view__lane-header"
				data-testid="cn-board-lane-header"
				:aria-expanded="String(!isCollapsed(lane.key))"
				@click="toggleLane(lane.key)">
				{{ lane.label }} ({{ lane.count }})
			</button>

			<div
				v-show="!isCollapsed(lane.key)"
				class="cn-board-view__columns"
				role="list"
				:aria-label="lane.key === '' ? boardLabel : lane.label">
				<section
					v-for="column in lane.columns"
					:key="`col-${lane.key}-${column.key}`"
					class="cn-board-view__column"
					role="listitem"
					data-testid="cn-board-column"
					:data-column="column.key"
					@dragover.prevent
					@drop="onDrop(column, $event)">
					<h3 class="cn-board-view__column-header">
						{{ column.label }}
						<span class="cn-board-view__count" data-testid="cn-board-count">
							{{ countLabel(column) }}
						</span>
					</h3>

					<article
						v-for="card in column.cards"
						:key="`card-${cardKey(card)}`"
						class="cn-board-view__card"
						data-testid="cn-board-card"
						:data-card-id="cardKey(card)"
						:draggable="canMove"
						tabindex="0"
						:aria-label="cardLabel(card, column)"
						@click="openCard(card)"
						@keydown.enter="openCard(card)"
						@dragstart="onDragStart(card, column, $event)">
						<span
							v-for="field in cardFields"
							:key="`f-${cardKey(card)}-${field}`"
							class="cn-board-view__card-field">
							{{ card[field] }}
						</span>

						<!--
							The keyboard's way to do what a drag does. A board
							whose only move is a drag is a board a keyboard
							user cannot use at all, and "drag the card" is not
							an instruction you can follow with a keyboard.
						-->
						<label v-if="canMove" class="cn-board-view__move">
							<span class="cn-board-view__move-label">{{ moveLabel }}</span>
							<select
								data-testid="cn-board-move"
								:data-card-id="cardKey(card)"
								:value="column.key"
								@change="onMoveTo(card, column, $event)">
								<option
									v-for="target in lane.columns"
									:key="`t-${cardKey(card)}-${target.key}`"
									:value="target.key">
									{{ target.label }}
								</option>
							</select>
						</label>
					</article>

					<p
						v-if="column.cards.length === 0"
						class="cn-board-view__empty"
						data-testid="cn-board-column-empty">
						{{ emptyColumnText }}
					</p>
				</section>
			</div>
		</div>

		<p
			v-if="refusal"
			class="cn-board-view__refusal"
			data-testid="cn-board-refusal"
			role="alert">
			{{ refusal }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { buildBoardColumns } from '../../utils/boardColumns.js'
import { buildSwimlanes } from '../../utils/boardSwimlanes.js'
import { DROP_OUTCOMES, runBoardDrop } from '../../utils/boardTransition.js'

/**
 * CnBoardView — the index page's rows as a board, one column per stage.
 *
 * THE COLUMNS ARE THE SCHEMA'S, NOT THE DATA'S. `buildBoardColumns` decides
 * them and is tested on its own; this renders what it returns. A board that
 * built its columns from the values present would lose the stage nothing is
 * in, which is the one you drag a card into.
 *
 * 🔴 A MOVE GOES THROUGH THE HOST'S TRANSITION AND NEVER WRITES THE STATUS
 * FIELD. Writing it here would skip every guard, side effect and audit entry
 * the transition carries, and the board would become a way to move a case past
 * a rule the case page enforces. `runBoardDrop` owns that contract; this
 * component owns the gestures that reach it.
 *
 * 🔴 THERE ARE TWO GESTURES, ALWAYS. A board whose only move is a drag is a
 * board a keyboard user cannot use, and "drag the card" is not an instruction
 * anybody can follow with a keyboard. Move to on the card runs the identical
 * call.
 *
 * @event {object} card-click — A card was opened. Payload: the row.
 * @event {object} moved — A card moved. Payload: `{ card, toKey }`.
 * @event {object} refused — A move was refused. Payload: `{ card, message }`.
 * @event {object} stale — The card had already moved. Payload: `{ card }`.
 */
export default {
	name: 'CnBoardView',

	props: {
		/** The rows the list holds. */
		rows: {
			type: Array,
			default: () => [],
		},

		/** The status field's schema: its enum or its lifecycle states. */
		statusFieldSchema: {
			type: Object,
			default: null,
		},

		/** The property a row's status lives on. */
		statusField: {
			type: String,
			default: 'status',
		},

		/** The fields a card shows. */
		cardFields: {
			type: Array,
			default: () => [],
		},

		/** A second field to group the board into rows by. */
		swimlaneField: {
			type: String,
			default: '',
		},

		/** The row key, so a card is identifiable. */
		rowKey: {
			type: String,
			default: 'id',
		},

		/**
		 * The host's transition. Absent, the board is read-only: no drag, no
		 * Move to, because a gesture that cannot do anything is worse than no
		 * gesture at all.
		 */
		runTransition: {
			type: Function,
			default: null,
		},

		/** Re-read one card, to check it has not moved under the dragger. */
		reread: {
			type: Function,
			default: null,
		},

		/**
		 * Whether the counts are of one page. A count of a page shown as
		 * though it were the total is a number somebody quotes in a meeting.
		 */
		paged: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['card-click', 'moved', 'refused', 'stale'],

	data() {
		return {
			/** Lanes the reader has collapsed, for as long as they are here. */
			collapsed: [],
			/** The guard's own words, when it refused the last move. */
			refusal: '',
			/** The card being dragged, and where from. */
			dragging: null,
		}
	},

	computed: {
		/** @return {boolean} Whether the status field can back a board at all. */
		usable() {
			return this.board.usable
		},

		/** @return {object} The columns, from the schema. */
		board() {
			return buildBoardColumns({
				field: this.statusFieldSchema,
				rows: this.rows,
				statusField: this.statusField,
				offBoardLabel: t('nextcloud-vue', 'Elsewhere'),
			})
		},

		/** @return {Array<object>} The board as rows of columns. */
		lanes() {
			return buildSwimlanes({
				columns: this.board.columns,
				swimlaneField: this.swimlaneField,
				unassignedLabel: t('nextcloud-vue', 'Unassigned'),
			})
		},

		/** @return {boolean} Whether a move is possible at all. */
		canMove() {
			return typeof this.runTransition === 'function'
		},

		/** @return {string} What to say when the field cannot back a board. */
		unusableText() {
			return t('nextcloud-vue', 'This list has no status field with stages, so it cannot be shown as a board.')
		},

		/** @return {string} The board's accessible name. */
		boardLabel() {
			return t('nextcloud-vue', 'Board')
		},

		/** @return {string} The Move to control's label. */
		moveLabel() {
			return t('nextcloud-vue', 'Move to')
		},

		/** @return {string} What an empty column says. */
		emptyColumnText() {
			return t('nextcloud-vue', 'Nothing here')
		},
	},

	methods: {
		t,

		/**
		 * Open one card. The pointer and the keyboard both come through here,
		 * so a reader on Enter reaches the same record as a reader on click.
		 *
		 * @param {object} card The card the reader picked.
		 * @return {void} Nothing.
		 */
		openCard(card) {
			/**
			 * @event card-click Emitted when a reader opens a card, by click or by Enter. Payload: the card row.
			 */
			this.$emit('card-click', card)
		},

		/**
		 * A card's identity.
		 *
		 * @param {object} card The row.
		 * @return {string} Its key.
		 */
		cardKey(card) {
			return String(card?.[this.rowKey] ?? '')
		},

		/**
		 * A column's count, said as a page count when that is what it is.
		 *
		 * @param {object} column The column.
		 * @return {string} The count.
		 */
		countLabel(column) {
			return this.paged
				? t('nextcloud-vue', '{count} on this page', { count: column.count })
				: String(column.count)
		},

		/**
		 * What a card is called to somebody who cannot see which column it is in.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @return {string} The accessible name.
		 */
		cardLabel(card, column) {
			const name = this.cardFields.map((field) => card?.[field]).filter(Boolean).join(', ')
			return t('nextcloud-vue', '{name}, in {column}', { name: name || this.cardKey(card), column: column.label })
		},

		/**
		 * Whether a lane is collapsed.
		 *
		 * @param {string} key The lane.
		 * @return {boolean} True when collapsed.
		 */
		isCollapsed(key) {
			return this.collapsed.includes(key)
		},

		/**
		 * Collapse a lane, or open it again.
		 *
		 * Held in the component for as long as the reader is on the view, and
		 * deliberately not persisted: a collapsed lane somebody forgot they
		 * collapsed is work that has gone missing for them.
		 *
		 * @param {string} key The lane.
		 */
		toggleLane(key) {
			this.collapsed = this.isCollapsed(key)
				? this.collapsed.filter((entry) => entry !== key)
				: [...this.collapsed, key]
		},

		/**
		 * Remember which card is being dragged and where from.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @param {DragEvent} event The event.
		 */
		onDragStart(card, column, event) {
			this.dragging = { card, fromKey: column.key }
			// Firefox drops a drag that carries no data.
			event?.dataTransfer?.setData?.('text/plain', this.cardKey(card))
		},

		/**
		 * A drop on a column.
		 *
		 * @param {object} column The column dropped on.
		 * @return {Promise<void>} Nothing.
		 */
		async onDrop(column) {
			if (!this.dragging) {
				return
			}
			const { card, fromKey } = this.dragging
			this.dragging = null
			await this.move(card, fromKey, column.key)
		},

		/**
		 * Move to, from the card's own menu.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @param {Event} event The change event.
		 * @return {Promise<void>} Nothing.
		 */
		async onMoveTo(card, column, event) {
			await this.move(card, column.key, event?.target?.value ?? '')
		},

		/**
		 * The one move, whichever gesture asked for it.
		 *
		 * @param {object} card The row.
		 * @param {string} fromKey Where it was.
		 * @param {string} toKey Where it is going.
		 * @return {Promise<void>} Nothing.
		 */
		async move(card, fromKey, toKey) {
			this.refusal = ''

			const result = await runBoardDrop({
				card,
				fromKey,
				toKey,
				statusField: this.statusField,
				runTransition: this.runTransition,
				reread: this.reread,
			})

			if (result.outcome === DROP_OUTCOMES.MOVED) {
				/**
				 * @event moved Emitted when the host's transition accepted the move and the card now sits in the new lane. Payload: `{ card, toKey }`.
				 */
				this.$emit('moved', { card: result.card, toKey })
				return
			}

			if (result.outcome === DROP_OUTCOMES.REFUSED) {
				// The guard's own sentence when it gave one. Our own only when
				// it did not, so the two are never confused.
				this.refusal = result.message || t('nextcloud-vue', 'That move was refused.')
				/**
				 * @event refused Emitted when the guard turned the move down. Payload: `{ card, message }`, the message being the guard's own sentence when it gave one.
				 */
				this.$emit('refused', { card: result.card, message: this.refusal })
				return
			}

			if (result.outcome === DROP_OUTCOMES.STALE) {
				this.refusal = t('nextcloud-vue', 'Somebody else moved this card. It is shown where it is now.')
				/**
				 * @event stale Emitted when somebody else moved the card first, so the board shows it where it is now. Payload: `{ card }`.
				 */
				this.$emit('stale', { card: result.card })
			}
		},
	},
}
</script>

<style scoped lang="scss">
.cn-board-view__columns {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	align-items: flex-start;
}

.cn-board-view__column {
	flex: 0 0 260px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	padding: 8px;
}

.cn-board-view__column-header {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 1rem;
	margin: 0 0 8px;
}

.cn-board-view__count,
.cn-board-view__empty,
.cn-board-view__unusable {
	color: var(--color-text-maxcontrast);
}

.cn-board-view__card {
	display: block;
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
	margin-bottom: 8px;
	cursor: pointer;
}

.cn-board-view__card-field {
	display: block;
}

.cn-board-view__lane-header {
	background: none;
	border: none;
	font-weight: bold;
	padding: 8px 0;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-board-view__move-label {
	color: var(--color-text-maxcontrast);
	font-size: 0.8rem;
}

.cn-board-view__refusal {
	color: var(--color-error);
}
</style>
