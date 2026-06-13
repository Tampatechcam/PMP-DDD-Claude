# Memory

Deep-memory store for the productivity skill. The quick-scan summary lives
in [`../CLAUDE.md`](../CLAUDE.md); this directory holds the full decoder
ring + per-entity profiles.

## Layout

```
memory/
├── README.md            ← you are here
├── glossary.md          ← all acronyms, terms, codenames, status taxonomy
├── people/
│   └── cam.md           ← Cam Hebeler (builder + sole human owner)
├── projects/
│   └── pmp-dashboard.md ← PMP Client Dashboard build
└── context/
    └── company.md       ← Power Mailers Plus (the business) + customer types
```

## When to update

- **Decoding fails** — a task or message references something not in glossary → add it
- **Status changes** — a project ships or pauses → update its file
- **New person enters scope** — add `people/{name}.md` with role + their relationships
- **Project ends** — move the project file to `projects/_archive/`, leave glossary entries

See `/productivity:update` (or the `productivity:memory-management` skill)
for the formal flow.
