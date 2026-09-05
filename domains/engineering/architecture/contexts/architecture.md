## Architecture conventions

- Decisions that are expensive to reverse get written down as an ADR before
  implementation, not after.
- Boundaries follow the domain, not the technology. A module named for a layer
  (`services`, `utils`) is usually a boundary that was never decided.
- Push complexity to the edges; keep the core rules free of I/O, framework types
  and transport concerns.
- Prefer explicit data contracts between components over shared mutable state.
- When two components must change together for every feature, they are one
  component. Say so instead of maintaining the fiction.
