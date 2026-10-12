# Design: screens-ratio-stat

- `elapsed` is client-side because OpenRegister's `/value` averages one numeric field. It is capped (`limit`,
  default 1000) like `weighted`; past the cap it averages the first rows, so a board that needs the exact figure
  should store the duration as a field and use `metric: "avg"`.
- A share of two counts where the condition compares two fields (resolved at or before the deadline) cannot be a
  filter. The docs say to store a flag on the object.
- The list-total route is chosen from the resolved filter (a list anywhere, also under an operator), only for a count.
  Sums and averages keep the aggregation endpoint.
- `via: "list"` exists for counts of empty values: the endpoint has no null operator.
