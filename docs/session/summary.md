# Session: Flow Editor WordPress Plugin - Concept to Implementation

**Date:** 2026-01-28
**Duration:** ~45 minutes
**Directory:** /Users/noamalmosnino/Documents/GitHub/flow-editor-wp
**Repo:** https://github.com/madebynoam/flow-editor-wp

## Summary

This session took a blog post idea from Tino Barreiro about visual flow-based editing for WordPress and turned it into a fully functional WordPress plugin in under an hour. The post proposed moving beyond one-screen-at-a-time editing toward a spatial canvas where users can see their entire site—pages, patterns, and template parts—as a connected system.

We started with collaborative brainstorming to refine the concept, discussing how it aligns with Tino's vision as a creative director (fluidity, zoom in/out, see relationships). We decided on: React Flow for the canvas, BlockPreview for rendering actual content in nodes, connection lines showing which patterns are used where, and position persistence. The MVP scope was defined as an admin page accessible from the Site Editor.

The implementation followed a detailed 8-task plan using subagent-driven development. Each task was implemented by a fresh subagent, then reviewed for spec compliance and code quality. The result is a working plugin with 7 commits, ready for testing on a WordPress site.

## Key Work Done

- Read and analyzed Tino Barreiro's P2 post on visual flow-based editing
- Brainstormed the plugin concept with multiple design decisions
- Created comprehensive design document with architecture, UI/UX, and MVP scope
- Created detailed implementation plan with 8 tasks
- Implemented all 8 tasks using subagent-driven development:
  1. Plugin scaffold (PHP, package.json, React entry point)
  2. React Flow canvas with pan/zoom
  3. Data fetching layer (REST API, hooks)
  4. Relationship graph parser (regex extraction)
  5. Custom node components with BlockPreview
  6. Wired canvas to real WordPress data
  7. Added "Flow View" button in Site Editor
  8. Polish and verification
- Published to GitHub as public repository

## Technical Decisions

- **Integration approach:** Dedicated admin page under Appearance menu, linked from Site Editor (simpler than injecting into Site Editor directly)
- **Canvas library:** React Flow (@xyflow/react) for built-in pan/zoom/connections
- **Content rendering:** WordPress's BlockPreview component with parse() from @wordpress/blocks
- **Data sources:** REST API endpoints for pages, template parts, and patterns
- **Relationship detection:** Regex parsing of block content for `<!-- wp:pattern -->` and `<!-- wp:template-part -->` references
- **Position persistence:** Custom REST endpoint storing positions in wp_options
- **Hover interaction:** Highlight connected edges when hovering a node

## Files Created

```
flow-editor-wp/
├── flow-editor.php
├── package.json
├── README.md
├── docs/plans/
│   ├── 2026-01-28-flow-editor-design.md
│   └── 2026-01-28-flow-editor-implementation.md
├── src/
│   ├── index.js
│   ├── index.scss
│   ├── api/index.js
│   ├── hooks/useSiteData.js
│   ├── utils/buildNodes.js
│   ├── utils/parseRelationships.js
│   └── components/
│       ├── Canvas.js
│       ├── Canvas.scss
│       └── nodes/ (6 files)
└── build/ (compiled assets)
```

## Commits Made

```
e96556c feat: add Flow View button in Site Editor
fe2737e feat: wire canvas to real site data
36a3a75 feat: add custom node components with BlockPreview
1d84a54 feat: add relationship graph parser
d24c062 feat: add data fetching layer
e087d2f feat: add React Flow canvas with pan/zoom
48495be feat: scaffold Flow Editor plugin structure
```

## Inspiration

- [Building the Web Beyond One Screen at a Time](https://designomattic.wordpress.com/2026/01/28/building-the-web-beyond-one-screen-at-a-time/) by Tino Barreiro
- User's comment about generative UI and agent-driven interfaces

## Next Steps (Post-MVP)

- Component-level view (drill into patterns to see buttons, headings)
- Global Styles integration
- Clustering/layers for complex sites
- AI context for generative UI
