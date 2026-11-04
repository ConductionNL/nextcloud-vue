<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-transfer-card" data-testid="cn-transfer-card">
		<header v-if="title || subtitle" class="cn-transfer-card__header">
			<h3 v-if="title" class="cn-transfer-card__title">
				{{ title }}
			</h3>
			<span v-if="subtitle" class="cn-transfer-card__muted">{{ subtitle }}</span>
		</header>

		<div class="cn-transfer-card__progress">
			<span class="cn-transfer-card__line">
				<strong data-testid="cn-transfer-amount">{{ amountText }}</strong>
				<span v-if="remainingText && !paused" class="cn-transfer-card__muted" data-testid="cn-transfer-remaining">{{ remainingText }}</span>
			</span>
			<NcProgressBar
				:value="percent"
				:aria-label="amountText"
				data-testid="cn-transfer-bar" />
			<span v-if="hint" class="cn-transfer-card__muted" data-testid="cn-transfer-hint">{{ hint }}</span>
		</div>

		<p v-if="paused"
			class="cn-transfer-card__paused"
			role="status"
			data-testid="cn-transfer-paused">
			{{ pausedText || t('nextcloud-vue', 'The connection dropped. It carries on from where it stopped.') }}
		</p>

		<ul v-if="items.length > 0" class="cn-transfer-card__items">
			<li v-for="item in items"
				:key="item.id ?? item.label"
				class="cn-transfer-card__item"
				data-testid="cn-transfer-item">
				<span>{{ item.label }}</span>
				<span class="cn-transfer-card__muted">{{ item.state }}</span>
			</li>
		</ul>

		<div v-if="paused || $slots.actions" class="cn-transfer-card__actions">
			<NcButton v-if="paused"
				variant="primary"
				data-testid="cn-transfer-resume"
				@click="$emit('resume')">
				{{ resumeLabel || t('nextcloud-vue', 'Resume') }}
			</NcButton>
			<!-- @slot actions Further buttons under the card. -->
			<slot name="actions" />
		</div>

		<p v-if="note" class="cn-transfer-card__muted cn-transfer-card__note" data-testid="cn-transfer-note">
			{{ note }}
		</p>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcProgressBar } from '@nextcloud/vue'

/**
 * CnTransferCard: a transfer that takes a while, such as taking a day's work
 * offline (board DqInspectie "Dag synchroniseren": "32 MB van 48 MB gedownload",
 * "nog ca. 6 minuten", a row per part, and resuming after a dropped connection).
 *
 * The host owns the transfer and passes where it stands. The card holds no
 * state, so the same card serves a download, an upload or a sync.
 *
 * ```vue
 * <CnTransferCard
 *   title="Sync the day"
 *   :done="32"
 *   :total="48"
 *   unit="MB"
 *   remaining-text="about 6 minutes left"
 *   :items="[{ id: 'cases', label: 'Cases of 4 addresses', state: 'Done' }]"
 *   @resume="resume" />
 * ```
 *
 * @event resume The user pressed Resume on a paused transfer.
 * @spec openspec/changes/transfer-card/specs/transfer-card/spec.md
 */
export default {
	name: 'CnTransferCard',

	components: { NcButton, NcProgressBar },

	props: {
		/** Title, already translated. */
		title: { type: String, default: '' },
		/** A line under the title, already translated. */
		subtitle: { type: String, default: '' },
		/** How much has been transferred. */
		done: { type: Number, default: 0 },
		/** How much there is in total. */
		total: { type: Number, default: 0 },
		/** The unit of `done` and `total`, such as "MB". */
		unit: { type: String, default: '' },
		/** The amount line, already translated, with `{done}`, `{total}` and `{unit}`; the library default is "{done} {unit} of {total} {unit}". */
		amountTemplate: { type: String, default: '' },
		/** How long it will still take, already translated. */
		remainingText: { type: String, default: '' },
		/** A line under the bar, already translated. */
		hint: { type: String, default: '' },
		/** The parts: `{ id?, label, state }`, both already translated. */
		items: { type: Array, default: () => [] },
		/** The transfer stopped and can carry on. */
		paused: { type: Boolean, default: false },
		/** Says why it stopped, already translated. */
		pausedText: { type: String, default: '' },
		/** Label of the Resume button, already translated. */
		resumeLabel: { type: String, default: '' },
		/** A line at the end of the card, already translated. */
		note: { type: String, default: '' },
	},

	emits: ['resume'],

	computed: {
		/** @return {number} Progress in percent, from 0 to 100; 0 with no total. */
		percent() {
			if (!(this.total > 0)) {
				return 0
			}
			return Math.min(100, Math.max(0, Math.round((this.done / this.total) * 100)))
		},

		/** @return {string} The amount in words. */
		amountText() {
			const values = { done: String(this.done), total: String(this.total), unit: this.unit }
			if (this.amountTemplate) {
				return this.amountTemplate.replace(/\{(done|total|unit)\}/g, (match, key) => values[key])
			}
			return t('nextcloud-vue', '{done} {unit} of {total} {unit}', values)
		},
	},

	methods: {
		t,
	},
}
</script>

<style scoped>
.cn-transfer-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px 20px;
}

.cn-transfer-card__header,
.cn-transfer-card__progress {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-transfer-card__title {
	font-size: 1.1em;
	margin: 0;
}

.cn-transfer-card__muted {
	color: var(--color-text-maxcontrast);
}

.cn-transfer-card__line,
.cn-transfer-card__item {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	justify-content: space-between;
}

.cn-transfer-card__paused,
.cn-transfer-card__note {
	margin: 0;
}

.cn-transfer-card__items {
	display: flex;
	flex-direction: column;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-transfer-card__item {
	border-top: 1px solid var(--color-border);
	padding: 8px 0;
}

.cn-transfer-card__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
