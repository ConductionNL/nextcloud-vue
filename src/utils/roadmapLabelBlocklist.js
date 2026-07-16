/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * roadmapLabelBlocklist — 20 regex patterns hiding internal hydra pipeline /
 * workflow labels from the in-product Features & Roadmap surface.
 *
 * The blocklist is the display-side filter (D16 in the openregister design).
 * It is orthogonal to the inbound issue filter (`labels=enhancement,feature`,
 * D23) which controls *which* issues come back from GitHub. The blocklist
 * controls *which label chips* are rendered on the items that did come back.
 *
 * Frozen so consumers can iterate but not mutate. Apps that want a different
 * blocklist should fork the constant into their own utility — the convention
 * is shared but not enforced.
 *
 * Spec: features-roadmap-component — Requirement "ROADMAP_LABEL_BLOCKLIST"
 * (`openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`).
 *
 * @module utils/roadmapLabelBlocklist
 */

/**
 * Regex patterns matching hydra pipeline / workflow labels that should never
 * be rendered as a user-facing chip on a roadmap item card.
 *
 * @type {ReadonlyArray<RegExp>}
 */
export const ROADMAP_LABEL_BLOCKLIST = Object.freeze([
	/^build:/,
	/^code-review:/,
	/^security-review:/,
	/^applier:/,
	/^retry:/,
	/^rebuild:/,
	/^fix:/,
	/^fix-iteration:/,
	/^build-retry:/,
	/^ready-/,
	/^needs-input$/,
	/^yolo$/,
	/^openspec$/,
	/^agent-maxed-out$/,
	/^pipeline-active$/,
	/^done$/,
	/:queued$/,
	/:running$/,
	/:pass$/,
	/:fail$/,
])
