# Examples

## Invoke

User: "Review this vertical change with Deepfield."

1. Decide which nested checkouts belong in this review. Leave them on
   their current branches.
2. `generate --root --only` on the meta-repo (cwd if already there).
   Pass `--base` only when the harness has a comparison ref; otherwise
   the working tree vs `HEAD` is the delta.
3. `serve` with the same `--root` / `--only` / `--base` and tell the
   user the local URL
4. `watch --root` and wait

## Inbox apply

Inbox:

```json
{
  "version": 1,
  "items": [
    {
      "id": "c1",
      "targetId": "cluster:payments-api:abc",
      "body": "Retry must be idempotent; client should send an idempotency key.",
      "status": "pending"
    }
  ]
}
```

Edit `payments-api` and the consumer checkout. Set status `applied`.
Generate. Watch again.

## Do not

- Update submodule pins to "fix" a missing graph
- Check out `main` (or infer `origin/main`) to invent a delta
- Ask a model to rebuild topology
- Hand-edit `graph.json` to move nodes
