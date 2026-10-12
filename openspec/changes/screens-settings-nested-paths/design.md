# Design: screens-settings-nested-paths

- Read: unchanged, `readPath(objectData, path)`.
- Write, top-level only: as before, ONE PATCH, no re-read.
- Write, any nested path: GET the object, take each affected top-level field from that fresh copy (the first
  changed leaf of a top-level field starts from the stored value, later leaves of the same field build on the result),
  set the leaf, and send ONE PATCH of the whole top-level objects. A sibling written elsewhere in the meantime is kept.
  This is the field-list approach; OpenRegister has no deep-merge PATCH, so the smallest enclosing object is the
  smallest safe write.
- `save` = `{ url, method?, payload? }`. Tokens: `{value}`, `{field}`, `{changes}` (nested object), `{object.<path>}`.
  A string that is exactly one token keeps the value's type; inside text a token is written as text. Method PUT, POST
  or PATCH, default PATCH; payload default `{changes}`. When `save` is set the object is neither read nor patched.
- The value shown is still read from the object by path; an endpoint that keeps its own state needs the object to
  carry (or mirror) the value, or the page to refresh it. Not covered here: loading from an endpoint.
- Security: the url and payload are config, tokens only read the current object; the endpoint authorises the write.
