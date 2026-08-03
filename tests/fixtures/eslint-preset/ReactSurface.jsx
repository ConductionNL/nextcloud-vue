/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A React surface in the shape a consuming app actually ships one: JSX
 * syntax plus modern JS (optional chaining, nullish coalescing, rest/spread).
 *
 * It must lint CLEAN through the preset once the consumer has enrolled `.jsx`
 * with a JSX-capable parser. Before the fix the preset ENROLLED `.jsx` itself,
 * with no parser able to read it, and the file fataled — which silently took
 * every other rule on it down too.
 *
 * "Clean" is only worth something next to `VueJsxLegacy.jsx`, which proves the
 * same pipeline still REPORTS on a `.jsx` file. A fixture that passes because
 * nothing ran is the bug, not the proof.
 */
export default function PortalCard({ title, meta, ...rest }) {
	const label = meta?.label ?? title
	return (
		<section className="portal-card" {...rest}>
			<h2>{label}</h2>
			{meta?.items?.map((item) => (
				<span key={item.id}>{item.name}</span>
			))}
		</section>
	)
}
