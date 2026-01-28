# Flow Editor for WordPress — Design Document

**Date:** 2026-01-28
**Status:** Draft
**Inspiration:** [Building the Web Beyond One Screen at a Time](https://designomattic.wordpress.com/2026/01/28/building-the-web-beyond-one-screen-at-a-time/) by Tino Barreiro

---

## Overview & Core Concept

**Plugin Name:** Flow Editor (working title)

**Purpose:** Add a visual, spatial canvas view to WordPress Site Editor where users can see their entire site — pages, patterns, and template parts — as a connected system. Enables zooming out to understand relationships, then diving into focused editing without losing context.

**Core Experience:**
- Open Site Editor → Toggle to "Flow View"
- See all pages as nodes on an infinite canvas
- See all patterns/template parts as nodes on the left
- Connection lines show which patterns are used in which pages
- Hover a pattern → its connections and instances highlight
- Double-click any node → opens in native block editor
- Click "Back to Flow" → returns to canvas with changes reflected
- Drag nodes to rearrange → positions persist across sessions

**Key Principles:**
- Additive, not replacement — Flow View is a toggle, normal editing unchanged
- Native feel — uses WordPress's own BlockPreview, fits Site Editor UI
- Fluid transitions — minimal friction between overview and detail
- Full picture by default — shows everything, filter later if needed

**Target Users:**
- Designers/creative directors who think spatially
- Site builders managing multi-page sites with shared patterns
- Anyone who wants to understand "what uses what" at a glance

---

## Technical Architecture

### Integration Point
- Lives inside Site Editor (Appearance → Editor)
- Added as a toggle/tab via WordPress plugin slots (Slotfill system)
- Uses `registerPlugin()` from `@wordpress/plugins`

### Canvas Technology
- **React Flow (xyflow)** — Node-based UI library with built-in pan/zoom/connections
- Renders inside a React component registered via WordPress plugin architecture
- Styled to match WordPress admin aesthetic

### Node Rendering
- Uses `<BlockPreview />` from `@wordpress/block-editor`
- Fetches block content via REST API, renders scaled-down preview
- Each node shows actual rendered content, not placeholders

```jsx
import { BlockPreview } from '@wordpress/block-editor';

function PageNode({ data }) {
  return (
    <div className="flow-node-page">
      <div className="node-header">{data.title}</div>
      <BlockPreview
        blocks={data.blocks}
        viewportWidth={1200}
      />
    </div>
  );
}
```

### Data Sources (REST API)
| Content Type | Endpoint |
|--------------|----------|
| Pages | `/wp/v2/pages` |
| Posts | `/wp/v2/posts` |
| Templates | `/wp/v2/templates` |
| Template Parts | `/wp/v2/template-parts` |
| Block Patterns | `/wp/v2/block-patterns/patterns` |

### Relationship Graph
WordPress doesn't expose pattern-to-page relationships directly. The plugin must:
1. Fetch all pages/templates and their block content
2. Parse for `<!-- wp:pattern {"slug":"..."} /-->` references
3. Build relationship graph in memory
4. Render connection lines via React Flow edges

### Position Persistence
- User-dragged node positions saved to plugin options or post meta
- Default: auto-layout (patterns left, pages right, grid-spaced)
- Positions loaded on canvas mount, saved on drag end

---

## UI/UX Details

### Canvas Layout (Default)
```
┌─────────────────────────────────────────────────────────────┐
│  FLOW VIEW                                    [Exit Flow]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PATTERNS/PARTS              PAGES                         │
│   ┌──────────┐                                              │
│   │ Header   │─────────────┬────────────┬─────────┐         │
│   │ (part)   │             │            │         │         │
│   └──────────┘             │            │         │         │
│                            ▼            ▼         ▼         │
│   ┌──────────┐        ┌────────┐  ┌────────┐ ┌────────┐     │
│   │ Hero     │───────►│  Home  │  │ About  │ │ Blog   │     │
│   │(pattern) │        │        │  │        │ │        │     │
│   └──────────┘        │ ┌────┐ │  │        │ │        │     │
│                       │ │Hero│◄┼──connection to block       │
│   ┌──────────┐        │ └────┘ │  │        │          │     │
│   │ Footer   │───────►│ ┌────┐ │  │ ┌────┐ │ ┌────┐   │     │
│   │ (part)   │        │ │Ftr │ │  │ │Ftr │ │ │Ftr │   │     │
│   └──────────┘        └─┴────┴─┘  └─┴────┴─┘ └┴────┴──┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Connection Lines
- SVG lines rendered by React Flow
- Connect pattern node → specific block location on page node
- All lines visible by default
- **Hover interaction:** Hover pattern → its lines + connected pages highlight, rest dims

### Node Types
1. **Page Node** — Shows page title + BlockPreview of content
2. **Pattern Node** — Shows pattern name + BlockPreview
3. **Template Part Node** — Shows part name (Header/Footer) + BlockPreview

### Interactions
| Action | Result |
|--------|--------|
| Pan | Click + drag on canvas background |
| Zoom | Scroll wheel or pinch |
| Select node | Click node → highlight + show connections |
| Hover pattern | Highlight its connection lines + instances |
| Double-click node | Open in native Site Editor |
| Drag node | Reposition, persisted on release |
| "Back to Flow" button | Return to canvas, refresh previews |

### Editing Flow
1. User double-clicks a pattern or page node
2. Plugin navigates to native Site Editor for that item
3. User edits using standard block editor
4. User clicks "Back to Flow" (injected button)
5. Canvas reloads, BlockPreviews reflect changes

---

## MVP Scope

### Included in MVP
- [ ] Flow View toggle inside Site Editor
- [ ] Infinite canvas with pan/zoom (React Flow)
- [ ] Page nodes with BlockPreview
- [ ] Pattern nodes with BlockPreview
- [ ] Template Part nodes with BlockPreview
- [ ] Connection lines (pattern → pages that use it)
- [ ] Hover highlighting for connections
- [ ] Double-click to open native editor
- [ ] "Back to Flow" navigation
- [ ] Auto-layout (patterns left, pages right)
- [ ] Draggable nodes with position persistence
- [ ] Auto-refresh previews on return

### Post-MVP Ideas
- **Component-level view** — Drill into patterns to see buttons, headings, etc.
- **Global Styles integration** — Show which style tokens are used where
- **Clustering/layers** — Group related items, toggle visibility
- **AI context** — Surface the visual graph to agents for generative UI
- **Create from canvas** — Add new pages/patterns directly on canvas
- **Visual diff** — See what changed since last visit

---

## Technical Considerations

### Performance
- Lazy-load BlockPreviews (only render visible nodes)
- Debounce position saves
- Cache relationship graph, invalidate on content change

### WordPress Compatibility
- Requires block theme (FSE-enabled)
- WordPress 6.0+ (Site Editor maturity)
- Uses official APIs only (REST, @wordpress packages)

### Dependencies
- `@wordpress/plugins` — Plugin registration
- `@wordpress/block-editor` — BlockPreview component
- `@wordpress/data` — State management
- `@wordpress/api-fetch` — REST API calls
- `reactflow` (xyflow) — Canvas rendering

---

## References

- [Building the Web Beyond One Screen at a Time](https://designomattic.wordpress.com/2026/01/28/building-the-web-beyond-one-screen-at-a-time/) — Tino Barreiro
- [WordPress FSE Guide](https://fullsiteediting.com/lessons/what-is-full-site-editing/)
- [Template Parts REST API](https://developer.wordpress.org/rest-api/reference/wp_template_parts/)
- [Patterns API template_types](https://make.wordpress.org/core/2023/03/07/patterns-api-expanded-to-include-template_types-property/)
- [Adding Custom Sidebars to Block Editor](https://permanenttourist.ch/2025/05/pluginsidebar/)
- [Slotfills in Gutenberg](https://pranjallive.wordpress.com/2025/05/12/episode-79/)
- [React Flow Documentation](https://reactflow.dev/)

---

## Next Steps

1. Scaffold WordPress plugin structure
2. Register plugin slot in Site Editor
3. Set up React Flow canvas component
4. Implement REST API data fetching
5. Build relationship graph parser
6. Create node components with BlockPreview
7. Add connection line rendering
8. Implement double-click → edit → return flow
9. Add position persistence
10. Style to match WordPress admin
