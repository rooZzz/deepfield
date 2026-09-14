# Examples

## Invoke

User: "Review this vertical change with Eagle Eye."

1. `generate --root` on the meta-repo (cwd if already there)
2. `serve --root` and tell the user the local URL
3. `watch --root` and wait

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
- Ask a model to rebuild topology
- Hand-edit `graph.json` to move nodes
