/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Injection key shared by CnTabs.vue (provider) and CnTab.vue (consumer).
 *
 * Two deliberate choices here:
 *
 *  1. It lives in its own module rather than as a named export of CnTabs.vue,
 *     so both SFCs import the same binding instead of one importing the other
 *     (which would make the pair mutually recursive through the barrel).
 *
 *  2. It is `Symbol.for(...)`, not `Symbol(...)`. A `Symbol()` is unique per
 *     module INSTANCE, and this package is routinely loaded twice in a
 *     Nextcloud app — once through the CJS entry, once through the ESM one, or
 *     through two different webpack aliases (ADR-019, openregister#1958). Two
 *     instances means two distinct symbols, `inject()` silently falls through
 *     to its default, and every `<CnTab>` decides it has no parent and renders
 *     its panel unconditionally: all tabs visible at once, stacked, with no
 *     error anywhere. `Symbol.for` looks the symbol up in the cross-realm
 *     global registry, so duplicate instances converge on the same key.
 *     `useTenantContext`'s `TENANT_CONTEXT_KEY` has the same failure mode.
 *
 * @module components/CnTabs/tabsKey
 */

/** Injection key for the CnTabs ↔ CnTab contract. */
export const CN_TABS_INJECTION_KEY = Symbol.for('cn:tabs')
