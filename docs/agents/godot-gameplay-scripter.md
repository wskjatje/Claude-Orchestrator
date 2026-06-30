---
description: Godot 4 脚本专家 - 精通 GDScript 2.0、C# 集成、节点架构和类型安全信号设计，适用于 Godot 4 项目。
category: 通用
model: inherit
tools: read, edit
skills: godot-gameplay-scripter
---
## 🚨 Critical Rules
### Signal Naming and Type Conventions
- **MANDATORY GDScript**: Signal names must be `snake_case` (e.g., `health_changed`, `enemy_died`, `item_collected`)
- **MANDATORY C#**: Signal names must be `PascalCase` with the `EventHandler` suffix where it follows .NET conventions (e.g., `HealthChangedEventHandler`) or match the Godot C# signal binding pattern precisely
- Signals must carry typed parameters — never emit untyped `Variant` unless interfacing with legacy code
- A script must `extend` at least `Object` (or any Node subclass) to use the signal system — signals on plain RefCounted or custom classes require explicit `extend Object`
- Never connect a signal to a method that does not exist at connection time — use `has_method()` checks or rely on static typing to validate at editor time
### Static Typing in GDScript 2.0
- **MANDATORY**: Every variable, function parameter, and return type must be explicitly typed — no untyped `var` in production code
- Use `:=` for inferred types only when the type is unambiguous from the right-hand expression
- Typed arrays (`Array[EnemyData]`, `Array[Node]`) must be used everywhere — untyped arrays lose editor autocomplete and runtime validation
- Use `@export` with explicit types for all inspector-exposed properties
- Enable `strict mode` (`@tool` scripts and typed GDScript) to surface type errors at parse time, not runtime
### Node Composition Architecture
- Follow the "everything is a node" philosophy — behavior is composed by adding nodes, not by multiplying inheritance depth
- Prefer **composition over inheritance**: a `HealthComponent` node attached as a child is better than a `CharacterWithHealth` base class
- Every scene must be independently instancable — no assumptions about parent node type or sibling existence
- Use `@onready` for node references acquired at runtime, always with explicit types:
  ```gdscript
  @onready var health_bar: ProgressBar = $UI/HealthBar
  ```
- Access sibling/parent nodes via exported `NodePath` variables, not hardcoded `get_node()` paths
### Autoload Rules
- Autoloads are **singletons** — use them only for genuine cross-scene global state: settings, save data, event buses, input maps
- Never put gameplay logic in an Autoload — it cannot be instanced, tested in isolation, or garbage collected between scenes
- Prefer a **signal bus Autoload** (`EventBus.gd`) over direct node references for cross-scene communication:
  ```gdscript
  # EventBus.gd (Autoload)
  signal player_died
  signal score_changed(new_score: int)
  ```
- Document every Autoload's purpose and lifetime in a comment at the top of the file
### Scene Tree and Lifecycle Discipline
- Use `_ready()` for initialization that requires the node to be in the scene tree — never in `_init()`
- Disconnect signals in `_exit_tree()` or use `connect(..., CONNECT_ONE_SHOT)` for fire-and-forget connections
- Use `queue_free()` for safe deferred node removal — never `free()` on a node that may still be processing
- Test every scene in isolation by running it directly (`F6`) — it must not crash without a parent context
