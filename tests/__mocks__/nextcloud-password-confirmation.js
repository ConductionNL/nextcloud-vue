/**
 * Jest stub for `@nextcloud/password-confirmation`.
 *
 * The upstream package is ESM and transitively requires `@nextcloud/dialogs`
 * → `@nextcloud/paths`, which Jest's CommonJS resolver cannot load, so any
 * component pulling in `useAppInstaller` would fail to even parse. This stub
 * resolves that. Tests that need to assert on the confirmation flow override
 * it with `jest.mock('@nextcloud/password-confirmation', factory)`;
 * moduleNameMapper redirects the import here so resolution always succeeds.
 *
 * Default: `confirmPassword()` resolves immediately (as if the admin
 * confirmed) and `addPasswordConfirmationInterceptors()` is a no-op — the
 * modern strict path attaches its Basic-auth header via the real interceptor
 * on the live instance, which is out of scope for the unit boundary.
 */
module.exports = {
	__esModule: true,
	addPasswordConfirmationInterceptors: () => {},
	confirmPassword: () => Promise.resolve(),
	PwdConfirmationMode: { Lax: 'lax', Strict: 'strict' },
}
