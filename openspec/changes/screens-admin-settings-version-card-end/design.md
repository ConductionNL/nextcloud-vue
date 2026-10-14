# Design: screens-admin-settings-version-card-end

The default slot moves in the markup instead of the card moving by CSS `order`: with `end`, the slot renders right
after the header and the version card and the credential broker follow it. The slot is rendered once (one `v-if` on
each of its two places), and the keyboard order follows the visual order, which a CSS `order` would not give.
