<!--
  CnFlowHealthDot — is this flow all right, in one glyph, before its name.

  WHAT IT REPORTS, AND WHY THAT AND NOT SOMETHING ELSE
  ---------------------------------------------------
  The health of a flow is the state of the LAST RUN, not of the document. A
  flow can be perfectly authored and failing every night, and the thing an
  author needs to know when they open the list is which one that is.

    disabled            grey      it is not going to run, so nothing else matters
    last run failed     error     it ran and it broke
    last run stopped
      or cancelled      warning   it ended without finishing what it was asked
    last run completed  success   it worked
    enabled, never run  info      armed, unproven

  Order matters: `disabled` wins over every run state, because a red dot on a
  flow that cannot run sends somebody to fix a thing that is not happening.

  🔴 NEVER COLOUR ALONE. Each state carries a shape as well as a hue, and the
  accessible name says the state in words. A status conveyed only by colour is
  invisible to a screen reader and ambiguous to the ~8% of men with a red-green
  deficiency — and error/success is exactly the pair they cannot separate.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-flow-health"
		:class="`cn-flow-health--${health}`"
		:title="label"
		:aria-label="label"
		data-testid="flow-health"
		:data-health="health"
		role="img">
		<span class="cn-flow-health__glyph" aria-hidden="true">{{ glyph }}</span>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * The run states that count as each health, keyed the way the API reports them.
 *
 * `stopped` is a WARNING and not a success on purpose: a run that stopped
 * reached a terminal state without finishing the work it was asked to do, and
 * calling that green is how a half-done nightly goes unnoticed for a week.
 */
const WARNING_STATES = ['stopped', 'cancelled', 'dead_letter']
const ERROR_STATES = ['failed']
const SUCCESS_STATES = ['completed']

export default {
	name: 'CnFlowHealthDot',

	props: {
		/**
		 * Whether the flow is armed. A disabled flow is grey whatever its
		 * history says.
		 */
		enabled: {
			type: Boolean,
			default: false,
		},

		/**
		 * The status of the most recent run, or null when it has never run.
		 */
		lastRunStatus: {
			type: String,
			default: null,
		},
	},

	computed: {
		/**
		 * @return {string} One of disabled, error, warning, success, info.
		 */
		health() {
			if (this.enabled !== true) {
				return 'disabled'
			}

			const last = (this.lastRunStatus || '').toLowerCase()
			if (last === '') {
				return 'info'
			}
			if (ERROR_STATES.includes(last)) {
				return 'error'
			}
			if (WARNING_STATES.includes(last)) {
				return 'warning'
			}
			if (SUCCESS_STATES.includes(last)) {
				return 'success'
			}

			// Running, queued, suspended: in flight, which is not a verdict.
			return 'info'
		},

		/**
		 * @return {string} The shape, so the state is not colour alone.
		 */
		glyph() {
			return {
				disabled: '○',
				error: '✕',
				warning: '▲',
				success: '●',
				info: '◍',
			}[this.health]
		},

		/**
		 * @return {string} The state in words, for the accessible name.
		 */
		label() {
			return {
				disabled: this.t('nextcloud-vue', 'Disabled'),
				error: this.t('nextcloud-vue', 'The last run failed'),
				warning: this.t('nextcloud-vue', 'The last run ended without finishing'),
				success: this.t('nextcloud-vue', 'The last run finished'),
				info: this.t('nextcloud-vue', 'Enabled, no finished run yet'),
			}[this.health]
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-flow-health {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: 1.1em;
	block-size: 1.1em;
	flex: 0 0 auto;
	font-size: 0.9em;
	line-height: 1;
}

.cn-flow-health--disabled { color: var(--color-text-maxcontrast); }

.cn-flow-health--error { color: var(--color-error); }

.cn-flow-health--warning { color: var(--color-warning); }

.cn-flow-health--success { color: var(--color-success); }

.cn-flow-health--info { color: var(--color-primary-element); }
</style>
