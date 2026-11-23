# Design: abstract-switch-rows

- Read: `objectData[row.key] === true`; `invert` shows the opposite (a stored `installDisabled` read as "install on").
- Write: a toggle PATCHes `{ [key]: stored }` only. The switch shows the new state while the request runs and is
  disabled; on success it takes what the server answered; on failure it returns to the last saved state and the
  server's message shows in an error note.
- Look: rows separated by a hairline, bold 600 label, 12px muted hint under it, NcCheckboxRadioSwitch.
- Security: only the configured fields are sent; OpenRegister authorises the PATCH.
