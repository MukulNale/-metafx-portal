@AGENTS.md

# Ticket Queue

Team members submit feature requests and bug reports through the portal's Tickets page.
Tickets are stored in `src/data/tickets.json`.

## How to process tickets

When the user says "check tickets", "process tickets", or similar:

1. Read `src/data/tickets.json`
2. Find all tickets with `"status": "open"`
3. For each open ticket (highest priority first — high → medium → low):
   a. Update the ticket's status to `"in-progress"` in the JSON file
   b. Implement the change described in `title` + `description`
   c. After implementing, update status to `"done"` and write a short `notes` field explaining what was changed and which files were touched
   d. If a ticket cannot be implemented (ambiguous, out of scope, or requires info), set status to `"rejected"` and explain in `notes`
4. Commit all code changes + the updated `tickets.json` together

## Ticket JSON shape

```json
{
  "id": "T-001",
  "title": "Short summary",
  "description": "Full detail of the request",
  "type": "feature | bug | improvement | other",
  "priority": "high | medium | low",
  "status": "open | in-progress | done | rejected",
  "createdBy": "Name",
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "notes": "Claude's implementation note — filled in after processing"
}
```

## Important

- Always update `tickets.json` atomically with the code changes in the same commit
- Keep `notes` concise: what changed, which files, any caveats
- Do not invent requirements beyond what the ticket describes
