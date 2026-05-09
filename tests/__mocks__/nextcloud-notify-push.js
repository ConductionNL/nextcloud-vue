/**
 * Jest stub for `@nextcloud/notify_push`.
 *
 * Provides a controllable `listen` mock. By default, returns `true` (push available).
 * Tests can override `listen` via `jest.mock('@nextcloud/notify_push', factory)` or
 * by reassigning `module.listen` to a jest.fn() with specific behaviour.
 */

const listen = jest.fn(() => true)

module.exports = {
	__esModule: true,
	listen,
}
