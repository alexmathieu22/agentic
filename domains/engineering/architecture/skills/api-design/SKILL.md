---
name: api-design
description: >
  Use when designing or reviewing an interface others will depend on — HTTP
  endpoints, a library's public surface, an event schema, an RPC contract.
  Focuses on making misuse hard and evolution possible.
x-domain: engineering.architecture
x-requires: []
---

# API design

## When this applies

Anything with a consumer you can't unilaterally change. Internal-only code with
one caller isn't an API yet; don't pay these costs for it.

## Principles

1. **Make illegal states unrepresentable.** A type that can't hold a bad value
   beats validation that must be remembered. Two mutually exclusive optional
   fields should be one union.
2. **Easy to use correctly, hard to use incorrectly.** If a caller must call two
   methods in a specific order, offer one. If they must remember to close
   something, offer a scope.
3. **Name for the caller's domain, not your implementation.** They don't know
   about your queue.
4. **Be conservative in what you promise.** Every field you return is a field you
   must keep returning. Undocumented behaviour becomes a contract the moment
   someone depends on it.
5. **Errors are part of the interface.** Design them: distinguishable,
   actionable, stable identifiers rather than prose to be regex-matched.

## Evolution

Design for the second version from the start.

- **Additive changes only** on a released surface: new optional fields, new
  endpoints. Never repurpose a field, never tighten validation silently, never
  change a default.
- **Version at the boundary you'll actually want to move independently** — often
  the resource, not the whole API.
- **Deprecate loudly and long.** Announce, warn in responses, keep it working,
  then remove. Skipping the middle step just relocates the outage.
- Adding a required field to a request is a breaking change. So is removing a
  value from an enum you return.

## HTTP specifics

- Nouns for resources, verbs from the method. `POST /orders/42/cancel` is
  acceptable when the action genuinely isn't a resource; `POST /doCancelOrder` isn't.
- Correct status codes: 4xx means the caller can fix it, 5xx means they can't.
  A 200 with `{"error": ...}` breaks every generic client.
- Pagination on every collection, from day one. Retrofitting it is a breaking change.
- Idempotency keys on anything that creates or charges. Networks retry.

## Events and schemas

- Events are named in the past tense and describe what happened, not what should
  happen next. Consumers decide that.
- Include a schema version. Consumers must tolerate unknown fields.
- Carry enough context to be useful without a callback to the producer — but
  not so much that the event becomes a second copy of the entity.

## Done when

You can write the caller's code first, it reads naturally, and you can name the
next three changes you'd want to make and confirm each is additive.
