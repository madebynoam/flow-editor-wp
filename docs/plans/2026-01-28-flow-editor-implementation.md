# Flow Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a WordPress plugin that adds a visual, spatial canvas view where users can see pages, patterns, and template parts as connected nodes with relationship lines.

**Architecture:** Dedicated admin page with React Flow canvas. Links to/from Site Editor for navigation. Uses WordPress REST API for data, BlockPreview for rendering, and wp_options for position persistence.

**Tech Stack:** WordPress 6.0+, @wordpress/scripts, @xyflow/react, @wordpress/block-editor (BlockPreview), @wordpress/api-fetch

---

## Task 1: Scaffold Plugin Structure

**Files:**
- Create: `flow-editor.php`
- Create: `package.json`
- Create: `src/index.js`
- Create: `src/index.scss`

**Step 1: Create main plugin file**

```php
<?php
/**
 * Plugin Name: Flow Editor
 * Description: Visual flow-based editing for WordPress - see your site as a connected system.
 * Version: 0.1.0
 * Author: Noam Almosnino
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'FLOW_EDITOR_VERSION', '0.1.0' );
define( 'FLOW_EDITOR_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'FLOW_EDITOR_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register admin menu page.
 */
function flow_editor_admin_menu() {
    add_submenu_page(
        'themes.php',
        __( 'Flow Editor', 'flow-editor' ),
        __( 'Flow Editor', 'flow-editor' ),
        'edit_theme_options',
        'flow-editor',
        'flow_editor_render_page'
    );
}
add_action( 'admin_menu', 'flow_editor_admin_menu' );

/**
 * Render the Flow Editor admin page.
 */
function flow_editor_render_page() {
    echo '<div id="flow-editor-root" class="flow-editor-fullscreen"></div>';
}

/**
 * Enqueue scripts and styles for the Flow Editor page.
 */
function flow_editor_enqueue_assets( $hook ) {
    if ( 'appearance_page_flow-editor' !== $hook ) {
        return;
    }

    $asset_file = FLOW_EDITOR_PLUGIN_DIR . 'build/index.asset.php';

    if ( ! file_exists( $asset_file ) ) {
        return;
    }

    $asset = require $asset_file;

    wp_enqueue_script(
        'flow-editor',
        FLOW_EDITOR_PLUGIN_URL . 'build/index.js',
        $asset['dependencies'],
        $asset['version'],
        true
    );

    wp_enqueue_style(
        'flow-editor',
        FLOW_EDITOR_PLUGIN_URL . 'build/index.css',
        array( 'wp-components' ),
        $asset['version']
    );

    // Pass data to JavaScript.
    wp_localize_script(
        'flow-editor',
        'flowEditorData',
        array(
            'restUrl'   => rest_url(),
            'nonce'     => wp_create_nonce( 'wp_rest' ),
            'siteEditor' => admin_url( 'site-editor.php' ),
        )
    );
}
add_action( 'admin_enqueue_scripts', 'flow_editor_enqueue_assets' );

/**
 * Add body class for fullscreen styling.
 */
function flow_editor_admin_body_class( $classes ) {
    $screen = get_current_screen();
    if ( $screen && 'appearance_page_flow-editor' === $screen->id ) {
        $classes .= ' flow-editor-page';
    }
    return $classes;
}
add_action( 'admin_body_class', 'flow_editor_admin_body_class' );
```

**Step 2: Create package.json**

```json
{
  "name": "flow-editor",
  "version": "0.1.0",
  "description": "Visual flow-based editing for WordPress",
  "scripts": {
    "build": "wp-scripts build",
    "start": "wp-scripts start",
    "lint:js": "wp-scripts lint-js",
    "lint:css": "wp-scripts lint-style"
  },
  "devDependencies": {
    "@wordpress/scripts": "^30.0.0"
  },
  "dependencies": {
    "@xyflow/react": "^12.0.0"
  }
}
```

**Step 3: Create src/index.js (minimal)**

```javascript
/**
 * Flow Editor - Main entry point.
 */
import { createRoot } from '@wordpress/element';
import './index.scss';

const App = () => {
    return (
        <div className="flow-editor-app">
            <h1>Flow Editor</h1>
            <p>Canvas loading...</p>
        </div>
    );
};

// Mount the app.
document.addEventListener( 'DOMContentLoaded', () => {
    const container = document.getElementById( 'flow-editor-root' );
    if ( container ) {
        const root = createRoot( container );
        root.render( <App /> );
    }
});
```

**Step 4: Create src/index.scss (minimal)**

```scss
// Flow Editor styles.

.flow-editor-page {
    #wpcontent,
    #wpbody,
    #wpbody-content {
        padding: 0;
        margin: 0;
    }

    #wpfooter {
        display: none;
    }
}

.flow-editor-fullscreen {
    position: fixed;
    top: 32px; // Admin bar height.
    left: 160px; // Admin menu width.
    right: 0;
    bottom: 0;
    background: #1e1e1e;

    @media (max-width: 782px) {
        left: 0;
        top: 46px;
    }
}

// Collapsed menu.
.folded .flow-editor-fullscreen {
    left: 36px;
}

.flow-editor-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #fff;
    padding: 20px;
}
```

**Step 5: Install dependencies and build**

Run:
```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm install
```
Expected: node_modules created, package-lock.json generated

Run:
```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build
```
Expected: build/ folder created with index.js, index.css, index.asset.php

**Step 6: Commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && git init && git add -A && git commit -m "feat: scaffold Flow Editor plugin structure

- Main plugin file with admin page registration
- wp-scripts build setup
- Basic React entry point
- Fullscreen CSS styling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Set Up React Flow Canvas

**Files:**
- Create: `src/components/Canvas.js`
- Create: `src/components/Canvas.scss`
- Modify: `src/index.js`
- Modify: `src/index.scss`

**Step 1: Create Canvas component**

```javascript
/**
 * Flow Editor Canvas - React Flow wrapper.
 */
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Canvas.scss';

// Placeholder nodes for testing.
const initialNodes = [
    {
        id: 'pattern-1',
        type: 'default',
        position: { x: 50, y: 100 },
        data: { label: 'Header (pattern)' },
    },
    {
        id: 'page-1',
        type: 'default',
        position: { x: 350, y: 50 },
        data: { label: 'Home' },
    },
    {
        id: 'page-2',
        type: 'default',
        position: { x: 350, y: 200 },
        data: { label: 'About' },
    },
];

const initialEdges = [
    { id: 'e1', source: 'pattern-1', target: 'page-1', animated: true },
    { id: 'e2', source: 'pattern-1', target: 'page-2', animated: true },
];

const Canvas = () => {
    const [ nodes, setNodes, onNodesChange ] = useNodesState( initialNodes );
    const [ edges, setEdges, onEdgesChange ] = useEdgesState( initialEdges );

    return (
        <div className="flow-editor-canvas">
            <ReactFlow
                nodes={ nodes }
                edges={ edges }
                onNodesChange={ onNodesChange }
                onEdgesChange={ onEdgesChange }
                fitView
                attributionPosition="bottom-left"
            >
                <Controls />
                <Background variant="dots" gap={ 12 } size={ 1 } />
            </ReactFlow>
        </div>
    );
};

export default Canvas;
```

**Step 2: Create Canvas.scss**

```scss
// Canvas styles.

.flow-editor-canvas {
    flex: 1;
    width: 100%;
    height: 100%;

    .react-flow {
        background: #1e1e1e;
    }

    .react-flow__node {
        background: #2d2d2d;
        border: 1px solid #3d3d3d;
        border-radius: 4px;
        padding: 10px 15px;
        color: #fff;
        font-size: 13px;

        &.selected {
            border-color: #007cba;
            box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.3);
        }
    }

    .react-flow__edge-path {
        stroke: #666;
        stroke-width: 2;
    }

    .react-flow__controls {
        background: #2d2d2d;
        border: 1px solid #3d3d3d;
        border-radius: 4px;

        button {
            background: #2d2d2d;
            border-bottom-color: #3d3d3d;
            color: #fff;

            &:hover {
                background: #3d3d3d;
            }

            svg {
                fill: #fff;
            }
        }
    }

    .react-flow__background {
        background: #1e1e1e;
    }
}
```

**Step 3: Update src/index.js**

```javascript
/**
 * Flow Editor - Main entry point.
 */
import { createRoot } from '@wordpress/element';
import Canvas from './components/Canvas';
import './index.scss';

const App = () => {
    return (
        <div className="flow-editor-app">
            <header className="flow-editor-header">
                <h1>Flow Editor</h1>
                <a
                    href={ window.flowEditorData?.siteEditor || '#' }
                    className="flow-editor-back-link"
                >
                    &larr; Site Editor
                </a>
            </header>
            <Canvas />
        </div>
    );
};

// Mount the app.
document.addEventListener( 'DOMContentLoaded', () => {
    const container = document.getElementById( 'flow-editor-root' );
    if ( container ) {
        const root = createRoot( container );
        root.render( <App /> );
    }
});
```

**Step 4: Update src/index.scss**

```scss
// Flow Editor styles.

.flow-editor-page {
    #wpcontent,
    #wpbody,
    #wpbody-content {
        padding: 0;
        margin: 0;
    }

    #wpfooter {
        display: none;
    }
}

.flow-editor-fullscreen {
    position: fixed;
    top: 32px;
    left: 160px;
    right: 0;
    bottom: 0;
    background: #1e1e1e;

    @media (max-width: 782px) {
        left: 0;
        top: 46px;
    }
}

.folded .flow-editor-fullscreen {
    left: 36px;
}

.flow-editor-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #fff;
}

.flow-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: #2d2d2d;
    border-bottom: 1px solid #3d3d3d;

    h1 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
    }
}

.flow-editor-back-link {
    color: #a7aaad;
    text-decoration: none;
    font-size: 13px;

    &:hover {
        color: #fff;
    }
}
```

**Step 5: Rebuild**

Run:
```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build
```
Expected: Build succeeds, includes React Flow

**Step 6: Commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && git add -A && git commit -m "feat: add React Flow canvas with pan/zoom

- Canvas component with ReactFlow wrapper
- Dark theme styling matching WP admin
- Header with back link to Site Editor
- Placeholder nodes and edges for testing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create Data Fetching Layer

**Files:**
- Create: `src/api/index.js`
- Create: `src/hooks/useSiteData.js`

**Step 1: Create API module**

```javascript
/**
 * REST API functions for fetching site data.
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Fetch all published pages.
 */
export async function fetchPages() {
    return apiFetch({
        path: '/wp/v2/pages?per_page=100&status=publish',
    });
}

/**
 * Fetch all template parts.
 */
export async function fetchTemplateParts() {
    return apiFetch({
        path: '/wp/v2/template-parts?per_page=100',
    });
}

/**
 * Fetch all block patterns.
 */
export async function fetchPatterns() {
    return apiFetch({
        path: '/wp/v2/block-patterns/patterns',
    });
}

/**
 * Fetch all templates.
 */
export async function fetchTemplates() {
    return apiFetch({
        path: '/wp/v2/templates?per_page=100',
    });
}

/**
 * Fetch saved node positions from plugin options.
 */
export async function fetchNodePositions() {
    return apiFetch({
        path: '/flow-editor/v1/positions',
    }).catch( () => ({}) );
}

/**
 * Save node positions to plugin options.
 */
export async function saveNodePositions( positions ) {
    return apiFetch({
        path: '/flow-editor/v1/positions',
        method: 'POST',
        data: { positions },
    });
}
```

**Step 2: Create useSiteData hook**

```javascript
/**
 * Hook for fetching and managing site data.
 */
import { useState, useEffect } from '@wordpress/element';
import {
    fetchPages,
    fetchTemplateParts,
    fetchPatterns,
    fetchNodePositions,
} from '../api';

export function useSiteData() {
    const [ pages, setPages ] = useState( [] );
    const [ templateParts, setTemplateParts ] = useState( [] );
    const [ patterns, setPatterns ] = useState( [] );
    const [ positions, setPositions ] = useState( {} );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    useEffect( () => {
        async function loadData() {
            try {
                setLoading( true );

                const [ pagesData, partsData, patternsData, positionsData ] =
                    await Promise.all([
                        fetchPages(),
                        fetchTemplateParts(),
                        fetchPatterns(),
                        fetchNodePositions(),
                    ]);

                setPages( pagesData );
                setTemplateParts( partsData );
                setPatterns( patternsData );
                setPositions( positionsData );
            } catch ( err ) {
                setError( err.message || 'Failed to load site data' );
            } finally {
                setLoading( false );
            }
        }

        loadData();
    }, [] );

    return {
        pages,
        templateParts,
        patterns,
        positions,
        loading,
        error,
        refetch: () => {
            setLoading( true );
            // Re-run the effect by updating a dep (simplified approach)
            Promise.all([
                fetchPages(),
                fetchTemplateParts(),
                fetchPatterns(),
            ]).then( ([ p, tp, pt ]) => {
                setPages( p );
                setTemplateParts( tp );
                setPatterns( pt );
                setLoading( false );
            });
        },
    };
}
```

**Step 3: Add REST API endpoint for positions**

Add to `flow-editor.php` before closing `?>`:

```php
/**
 * Register REST API endpoint for saving/loading positions.
 */
function flow_editor_register_rest_routes() {
    register_rest_route(
        'flow-editor/v1',
        '/positions',
        array(
            array(
                'methods'             => 'GET',
                'callback'            => 'flow_editor_get_positions',
                'permission_callback' => function() {
                    return current_user_can( 'edit_theme_options' );
                },
            ),
            array(
                'methods'             => 'POST',
                'callback'            => 'flow_editor_save_positions',
                'permission_callback' => function() {
                    return current_user_can( 'edit_theme_options' );
                },
            ),
        )
    );
}
add_action( 'rest_api_init', 'flow_editor_register_rest_routes' );

/**
 * Get saved node positions.
 */
function flow_editor_get_positions() {
    $positions = get_option( 'flow_editor_positions', array() );
    return rest_ensure_response( $positions );
}

/**
 * Save node positions.
 */
function flow_editor_save_positions( $request ) {
    $positions = $request->get_param( 'positions' );

    if ( ! is_array( $positions ) ) {
        return new WP_Error( 'invalid_data', 'Positions must be an array', array( 'status' => 400 ) );
    }

    update_option( 'flow_editor_positions', $positions );
    return rest_ensure_response( array( 'success' => true ) );
}
```

**Step 4: Rebuild**

Run:
```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build
```
Expected: Build succeeds

**Step 5: Commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && git add -A && git commit -m "feat: add data fetching layer

- API module for pages, template parts, patterns
- useSiteData hook for loading all site data
- REST endpoint for position persistence
- Error handling and loading states

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Build Relationship Graph Parser

**Files:**
- Create: `src/utils/parseRelationships.js`

**Step 1: Create relationship parser**

```javascript
/**
 * Parse block content to find pattern/template-part relationships.
 */

/**
 * Extract pattern slugs from block content string.
 *
 * Looks for: <!-- wp:pattern {"slug":"namespace/pattern-name"} /-->
 *
 * @param {string} content - Raw block content.
 * @return {string[]} Array of pattern slugs found.
 */
export function extractPatternSlugs( content ) {
    if ( ! content ) {
        return [];
    }

    const patternRegex = /<!-- wp:pattern \{"slug":"([^"]+)"\}/g;
    const slugs = [];
    let match;

    while ( ( match = patternRegex.exec( content ) ) !== null ) {
        slugs.push( match[ 1 ] );
    }

    return slugs;
}

/**
 * Extract template part slugs from block content string.
 *
 * Looks for: <!-- wp:template-part {"slug":"header"} /-->
 *
 * @param {string} content - Raw block content.
 * @return {string[]} Array of template part slugs found.
 */
export function extractTemplatePartSlugs( content ) {
    if ( ! content ) {
        return [];
    }

    const partRegex = /<!-- wp:template-part \{[^}]*"slug":"([^"]+)"[^}]*\}/g;
    const slugs = [];
    let match;

    while ( ( match = partRegex.exec( content ) ) !== null ) {
        slugs.push( match[ 1 ] );
    }

    return slugs;
}

/**
 * Build a relationship graph from site data.
 *
 * @param {Object} params - Site data.
 * @param {Array} params.pages - Array of page objects.
 * @param {Array} params.templateParts - Array of template part objects.
 * @param {Array} params.patterns - Array of pattern objects.
 * @return {Object} Relationship graph with edges.
 */
export function buildRelationshipGraph({ pages, templateParts, patterns }) {
    const edges = [];

    // Map patterns by slug for lookup.
    const patternsBySlug = {};
    patterns.forEach( ( pattern ) => {
        if ( pattern.name ) {
            patternsBySlug[ pattern.name ] = pattern;
        }
    });

    // Map template parts by slug for lookup.
    const partsBySlug = {};
    templateParts.forEach( ( part ) => {
        if ( part.slug ) {
            partsBySlug[ part.slug ] = part;
        }
    });

    // Find relationships in pages.
    pages.forEach( ( page ) => {
        const content = page.content?.raw || page.content?.rendered || '';

        // Find pattern references.
        const patternSlugs = extractPatternSlugs( content );
        patternSlugs.forEach( ( slug ) => {
            if ( patternsBySlug[ slug ] ) {
                edges.push({
                    id: `pattern-${ slug }-page-${ page.id }`,
                    source: `pattern-${ slug }`,
                    target: `page-${ page.id }`,
                    type: 'pattern',
                });
            }
        });

        // Find template part references.
        const partSlugs = extractTemplatePartSlugs( content );
        partSlugs.forEach( ( slug ) => {
            if ( partsBySlug[ slug ] ) {
                edges.push({
                    id: `part-${ slug }-page-${ page.id }`,
                    source: `part-${ slug }`,
                    target: `page-${ page.id }`,
                    type: 'template-part',
                });
            }
        });
    });

    // Find relationships in template parts (parts can reference patterns).
    templateParts.forEach( ( part ) => {
        const content = part.content?.raw || part.content?.rendered || '';

        const patternSlugs = extractPatternSlugs( content );
        patternSlugs.forEach( ( slug ) => {
            if ( patternsBySlug[ slug ] ) {
                edges.push({
                    id: `pattern-${ slug }-part-${ part.slug }`,
                    source: `pattern-${ slug }`,
                    target: `part-${ part.slug }`,
                    type: 'pattern',
                });
            }
        });
    });

    return { edges };
}
```

**Step 2: Commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build && git add -A && git commit -m "feat: add relationship graph parser

- Extract pattern slugs from block content
- Extract template part slugs from block content
- Build edge list for React Flow from relationships

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Create Custom Node Components

**Files:**
- Create: `src/components/nodes/PageNode.js`
- Create: `src/components/nodes/PatternNode.js`
- Create: `src/components/nodes/TemplatePartNode.js`
- Create: `src/components/nodes/NodePreview.js`
- Create: `src/components/nodes/index.js`
- Create: `src/components/nodes/nodes.scss`

**Step 1: Create NodePreview wrapper (handles BlockPreview)**

```javascript
/**
 * NodePreview - Wrapper for BlockPreview in flow nodes.
 */
import { BlockPreview } from '@wordpress/block-editor';
import { parse } from '@wordpress/blocks';
import { useMemo } from '@wordpress/element';

const NodePreview = ({ content, viewportWidth = 800 }) => {
    const blocks = useMemo( () => {
        if ( ! content ) {
            return [];
        }
        try {
            return parse( content );
        } catch ( e ) {
            console.error( 'Failed to parse blocks:', e );
            return [];
        }
    }, [ content ] );

    if ( ! blocks.length ) {
        return (
            <div className="node-preview-empty">
                No content
            </div>
        );
    }

    return (
        <div className="node-preview">
            <BlockPreview
                blocks={ blocks }
                viewportWidth={ viewportWidth }
            />
        </div>
    );
};

export default NodePreview;
```

**Step 2: Create PageNode component**

```javascript
/**
 * PageNode - Custom node for pages.
 */
import { Handle, Position } from '@xyflow/react';
import NodePreview from './NodePreview';

const PageNode = ({ data, selected }) => {
    const { title, content, editUrl } = data;

    const handleDoubleClick = () => {
        if ( editUrl ) {
            window.location.href = editUrl;
        }
    };

    return (
        <div
            className={ `flow-node flow-node-page ${ selected ? 'selected' : '' }` }
            onDoubleClick={ handleDoubleClick }
        >
            <Handle type="target" position={ Position.Left } />

            <div className="flow-node-header">
                <span className="flow-node-type">Page</span>
                <span className="flow-node-title">{ title }</span>
            </div>

            <div className="flow-node-preview">
                <NodePreview content={ content } viewportWidth={ 400 } />
            </div>

            <Handle type="source" position={ Position.Right } />
        </div>
    );
};

export default PageNode;
```

**Step 3: Create PatternNode component**

```javascript
/**
 * PatternNode - Custom node for patterns.
 */
import { Handle, Position } from '@xyflow/react';
import NodePreview from './NodePreview';

const PatternNode = ({ data, selected }) => {
    const { title, content } = data;

    return (
        <div
            className={ `flow-node flow-node-pattern ${ selected ? 'selected' : '' }` }
        >
            <Handle type="target" position={ Position.Left } />

            <div className="flow-node-header">
                <span className="flow-node-type">Pattern</span>
                <span className="flow-node-title">{ title }</span>
            </div>

            <div className="flow-node-preview">
                <NodePreview content={ content } viewportWidth={ 400 } />
            </div>

            <Handle type="source" position={ Position.Right } />
        </div>
    );
};

export default PatternNode;
```

**Step 4: Create TemplatePartNode component**

```javascript
/**
 * TemplatePartNode - Custom node for template parts.
 */
import { Handle, Position } from '@xyflow/react';
import NodePreview from './NodePreview';

const TemplatePartNode = ({ data, selected }) => {
    const { title, content, area, editUrl } = data;

    const handleDoubleClick = () => {
        if ( editUrl ) {
            window.location.href = editUrl;
        }
    };

    return (
        <div
            className={ `flow-node flow-node-template-part ${ selected ? 'selected' : '' }` }
            onDoubleClick={ handleDoubleClick }
        >
            <Handle type="target" position={ Position.Left } />

            <div className="flow-node-header">
                <span className="flow-node-type">{ area || 'Template Part' }</span>
                <span className="flow-node-title">{ title }</span>
            </div>

            <div className="flow-node-preview">
                <NodePreview content={ content } viewportWidth={ 400 } />
            </div>

            <Handle type="source" position={ Position.Right } />
        </div>
    );
};

export default TemplatePartNode;
```

**Step 5: Create node index and types**

```javascript
/**
 * Custom node types for React Flow.
 */
import PageNode from './PageNode';
import PatternNode from './PatternNode';
import TemplatePartNode from './TemplatePartNode';

export const nodeTypes = {
    page: PageNode,
    pattern: PatternNode,
    templatePart: TemplatePartNode,
};

export { PageNode, PatternNode, TemplatePartNode };
```

**Step 6: Create nodes.scss**

```scss
// Custom node styles.

.flow-node {
    background: #2d2d2d;
    border: 2px solid #3d3d3d;
    border-radius: 8px;
    width: 220px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
        border-color: #4d4d4d;
    }

    &.selected {
        border-color: #007cba;
        box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.25);
    }
}

.flow-node-header {
    padding: 8px 12px;
    background: #252525;
    border-bottom: 1px solid #3d3d3d;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.flow-node-type {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
}

.flow-node-title {
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.flow-node-preview {
    height: 120px;
    overflow: hidden;
    background: #fff;
    position: relative;

    .block-editor-block-preview__container {
        transform-origin: top left;
    }
}

.node-preview {
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.node-preview-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    font-size: 12px;
}

// Node type colors.
.flow-node-page {
    .flow-node-type {
        color: #4ab866;
    }
}

.flow-node-pattern {
    .flow-node-type {
        color: #9b59b6;
    }
}

.flow-node-template-part {
    .flow-node-type {
        color: #3498db;
    }
}

// Handles.
.react-flow__handle {
    width: 8px;
    height: 8px;
    background: #666;
    border: 2px solid #2d2d2d;

    &.connecting,
    &:hover {
        background: #007cba;
    }
}
```

**Step 7: Update src/index.scss to import nodes.scss**

Add at end of file:
```scss
@import './components/nodes/nodes.scss';
```

**Step 8: Rebuild and commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build && git add -A && git commit -m "feat: add custom node components with BlockPreview

- NodePreview wrapper for block content rendering
- PageNode with edit link on double-click
- PatternNode for block patterns
- TemplatePartNode for headers/footers
- Color-coded node types
- Styled handles for connections

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Wire Up Canvas with Real Data

**Files:**
- Modify: `src/components/Canvas.js`
- Create: `src/utils/buildNodes.js`

**Step 1: Create buildNodes utility**

```javascript
/**
 * Build React Flow nodes from site data.
 */

const GRID_GAP_X = 300;
const GRID_GAP_Y = 200;
const PATTERN_X = 50;
const PAGE_X = 400;

/**
 * Build nodes array for React Flow.
 *
 * @param {Object} params - Site data and positions.
 * @return {Array} React Flow nodes.
 */
export function buildNodes({ pages, templateParts, patterns, positions }) {
    const nodes = [];
    let patternY = 50;
    let pageY = 50;

    // Add template parts (top of patterns column).
    templateParts.forEach( ( part, index ) => {
        const id = `part-${ part.slug }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'templatePart',
            position: savedPos || { x: PATTERN_X, y: patternY },
            data: {
                title: part.title?.rendered || part.slug,
                content: part.content?.raw || '',
                area: part.area,
                editUrl: `${ window.flowEditorData?.siteEditor }?postType=wp_template_part&postId=${ encodeURIComponent( part.id ) }`,
            },
        });

        patternY += GRID_GAP_Y;
    });

    // Add patterns (below template parts).
    patterns.forEach( ( pattern, index ) => {
        const id = `pattern-${ pattern.name }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'pattern',
            position: savedPos || { x: PATTERN_X, y: patternY },
            data: {
                title: pattern.title || pattern.name,
                content: pattern.content || '',
            },
        });

        patternY += GRID_GAP_Y;
    });

    // Add pages (right column).
    pages.forEach( ( page, index ) => {
        const id = `page-${ page.id }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'page',
            position: savedPos || { x: PAGE_X, y: pageY },
            data: {
                title: page.title?.rendered || 'Untitled',
                content: page.content?.raw || page.content?.rendered || '',
                editUrl: `${ window.flowEditorData?.siteEditor }?postType=page&postId=${ page.id }`,
            },
        });

        pageY += GRID_GAP_Y;
    });

    return nodes;
}
```

**Step 2: Update Canvas.js to use real data**

```javascript
/**
 * Flow Editor Canvas - React Flow wrapper with real data.
 */
import { useCallback, useMemo, useEffect } from '@wordpress/element';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSiteData } from '../hooks/useSiteData';
import { buildRelationshipGraph } from '../utils/parseRelationships';
import { buildNodes } from '../utils/buildNodes';
import { nodeTypes } from './nodes';
import { saveNodePositions } from '../api';
import './Canvas.scss';

const Canvas = () => {
    const { pages, templateParts, patterns, positions, loading, error } = useSiteData();

    // Build nodes and edges from data.
    const initialNodes = useMemo( () => {
        if ( loading ) return [];
        return buildNodes({ pages, templateParts, patterns, positions });
    }, [ pages, templateParts, patterns, positions, loading ] );

    const initialEdges = useMemo( () => {
        if ( loading ) return [];
        const { edges } = buildRelationshipGraph({ pages, templateParts, patterns });
        return edges.map( ( edge ) => ({
            ...edge,
            animated: false,
            style: { stroke: '#666', strokeWidth: 2 },
        }));
    }, [ pages, templateParts, patterns, loading ] );

    const [ nodes, setNodes, onNodesChange ] = useNodesState( [] );
    const [ edges, setEdges, onEdgesChange ] = useEdgesState( [] );

    // Update nodes/edges when data loads.
    useEffect( () => {
        if ( ! loading ) {
            setNodes( initialNodes );
            setEdges( initialEdges );
        }
    }, [ initialNodes, initialEdges, loading, setNodes, setEdges ] );

    // Save positions on drag end.
    const onNodeDragStop = useCallback( ( event, node ) => {
        const newPositions = {};
        nodes.forEach( ( n ) => {
            newPositions[ n.id ] = n.id === node.id ? node.position : n.position;
        });
        saveNodePositions( newPositions );
    }, [ nodes ] );

    // Highlight connections on node hover.
    const onNodeMouseEnter = useCallback( ( event, node ) => {
        setEdges( ( eds ) =>
            eds.map( ( edge ) => {
                const isConnected = edge.source === node.id || edge.target === node.id;
                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: isConnected ? '#007cba' : '#444',
                        strokeWidth: isConnected ? 3 : 2,
                        opacity: isConnected ? 1 : 0.3,
                    },
                    animated: isConnected,
                };
            })
        );
    }, [ setEdges ] );

    const onNodeMouseLeave = useCallback( () => {
        setEdges( ( eds ) =>
            eds.map( ( edge ) => ({
                ...edge,
                style: { stroke: '#666', strokeWidth: 2, opacity: 1 },
                animated: false,
            }))
        );
    }, [ setEdges ] );

    if ( loading ) {
        return (
            <div className="flow-editor-canvas flow-editor-loading">
                <p>Loading site data...</p>
            </div>
        );
    }

    if ( error ) {
        return (
            <div className="flow-editor-canvas flow-editor-error">
                <p>Error: { error }</p>
            </div>
        );
    }

    return (
        <div className="flow-editor-canvas">
            <ReactFlow
                nodes={ nodes }
                edges={ edges }
                onNodesChange={ onNodesChange }
                onEdgesChange={ onEdgesChange }
                onNodeDragStop={ onNodeDragStop }
                onNodeMouseEnter={ onNodeMouseEnter }
                onNodeMouseLeave={ onNodeMouseLeave }
                nodeTypes={ nodeTypes }
                fitView
                attributionPosition="bottom-left"
            >
                <Controls />
                <Background variant="dots" gap={ 12 } size={ 1 } />
            </ReactFlow>
        </div>
    );
};

export default Canvas;
```

**Step 3: Update Canvas.scss with loading/error states**

Add to end of Canvas.scss:
```scss
.flow-editor-loading,
.flow-editor-error {
    display: flex;
    align-items: center;
    justify-content: center;

    p {
        color: #888;
        font-size: 14px;
    }
}

.flow-editor-error p {
    color: #d63638;
}
```

**Step 4: Rebuild and commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && npm run build && git add -A && git commit -m "feat: wire canvas to real site data

- buildNodes utility for creating React Flow nodes
- Canvas fetches pages, patterns, template parts
- Builds relationship edges automatically
- Hover highlighting for connections
- Position persistence on drag
- Loading and error states

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Add Site Editor Link to Flow Editor

**Files:**
- Modify: `flow-editor.php`

**Step 1: Add link in Site Editor**

Add to `flow-editor.php`:

```php
/**
 * Add Flow Editor link to Site Editor.
 */
function flow_editor_add_site_editor_link() {
    global $pagenow;

    if ( 'site-editor.php' !== $pagenow ) {
        return;
    }

    $flow_editor_url = admin_url( 'themes.php?page=flow-editor' );

    ?>
    <script>
    ( function() {
        wp.domReady( function() {
            // Wait for Site Editor to fully load.
            const checkInterval = setInterval( function() {
                const header = document.querySelector( '.edit-site-site-hub' );
                if ( ! header ) return;

                clearInterval( checkInterval );

                // Create Flow Editor button.
                const button = document.createElement( 'a' );
                button.href = '<?php echo esc_url( $flow_editor_url ); ?>';
                button.className = 'components-button is-tertiary flow-editor-launch-button';
                button.textContent = 'Flow View';
                button.style.cssText = 'margin-left: 8px; font-size: 12px;';

                header.appendChild( button );
            }, 500 );
        });
    })();
    </script>
    <?php
}
add_action( 'admin_footer', 'flow_editor_add_site_editor_link' );
```

**Step 2: Commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && git add -A && git commit -m "feat: add Flow View button in Site Editor

- Injects button into Site Editor header
- Links to Flow Editor admin page
- Styled as tertiary button to match UI

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Polish and Testing Checklist

**Files:**
- Review all files for issues

**Step 1: Manual testing checklist**

1. [ ] Install plugin on local WordPress with block theme
2. [ ] Navigate to Appearance → Flow Editor
3. [ ] Verify canvas loads with pages and patterns
4. [ ] Test pan (drag background) and zoom (scroll)
5. [ ] Verify BlockPreviews render content
6. [ ] Test hover highlighting on pattern/part nodes
7. [ ] Double-click a page node → goes to Site Editor
8. [ ] Drag nodes → positions persist on reload
9. [ ] Click "Site Editor" link in header → navigates
10. [ ] In Site Editor, click "Flow View" → returns to canvas

**Step 2: Fix any issues found**

Address bugs or polish items as discovered during testing.

**Step 3: Final commit**

```bash
cd /Users/noamalmosnino/Documents/GitHub/flow-editor-wp && git add -A && git commit -m "chore: polish and testing fixes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Scaffold plugin structure (PHP, package.json, entry point) |
| 2 | Set up React Flow canvas with pan/zoom |
| 3 | Create data fetching layer (REST API, hooks) |
| 4 | Build relationship graph parser |
| 5 | Create custom node components with BlockPreview |
| 6 | Wire canvas to real data |
| 7 | Add Site Editor ↔ Flow Editor navigation |
| 8 | Polish and manual testing |

**Total commits:** 8

**Key dependencies:**
- `@wordpress/scripts` ^30.0.0
- `@xyflow/react` ^12.0.0
- WordPress 6.0+ with block theme

**Post-MVP enhancements (from design doc):**
- Component-level view (drill into patterns)
- Global Styles integration
- Clustering/layers
- AI context for generative UI
