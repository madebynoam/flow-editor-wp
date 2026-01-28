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
 * Enqueue scripts and styles for the Block Editor.
 */
function flow_editor_enqueue_editor_assets() {
    $asset_file = FLOW_EDITOR_PLUGIN_DIR . 'build/index.asset.php';

    if ( ! file_exists( $asset_file ) ) {
        return;
    }

    $asset = require $asset_file;

    // Always bust cache in development - use file modification time.
    $js_file = FLOW_EDITOR_PLUGIN_DIR . 'build/index.js';
    $css_file = FLOW_EDITOR_PLUGIN_DIR . 'build/index.css';
    $version = $asset['version'] . '.' . filemtime( $js_file );

    wp_enqueue_script(
        'flow-editor',
        FLOW_EDITOR_PLUGIN_URL . 'build/index.js',
        $asset['dependencies'],
        $version,
        true
    );

    wp_enqueue_style(
        'flow-editor',
        FLOW_EDITOR_PLUGIN_URL . 'build/index.css',
        array( 'wp-components', 'wp-block-editor' ),
        $version
    );

    // Pass data to JavaScript.
    wp_localize_script(
        'flow-editor',
        'flowEditorData',
        array(
            'restUrl'    => rest_url(),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
            'adminUrl'   => admin_url(),
            'siteEditor' => admin_url( 'site-editor.php' ),
            'homeUrl'    => home_url( '/' ),
            'siteTitle'  => get_bloginfo( 'name' ),
        )
    );
}
add_action( 'enqueue_block_editor_assets', 'flow_editor_enqueue_editor_assets' );

/**
 * Register REST API endpoints.
 */
function flow_editor_register_rest_routes() {
    // Positions endpoint.
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

    // Pattern preview endpoint.
    register_rest_route(
        'flow-editor/v1',
        '/pattern-preview',
        array(
            'methods'             => 'GET',
            'callback'            => 'flow_editor_pattern_preview',
            'permission_callback' => function() {
                return current_user_can( 'edit_theme_options' );
            },
            'args'                => array(
                'name' => array(
                    'required' => true,
                    'type'     => 'string',
                ),
            ),
        )
    );
}
add_action( 'rest_api_init', 'flow_editor_register_rest_routes' );

/**
 * Handle pattern preview via admin-ajax (returns full HTML page).
 */
function flow_editor_ajax_pattern_preview() {
    if ( ! current_user_can( 'edit_theme_options' ) ) {
        wp_die( 'Unauthorized' );
    }

    $pattern_name = isset( $_GET['pattern'] ) ? sanitize_text_field( $_GET['pattern'] ) : '';

    if ( empty( $pattern_name ) ) {
        wp_die( 'Pattern name required' );
    }

    // Get registered patterns.
    $patterns = WP_Block_Patterns_Registry::get_instance()->get_all_registered();
    $pattern_content = null;

    foreach ( $patterns as $pattern ) {
        if ( $pattern['name'] === $pattern_name ) {
            $pattern_content = $pattern['content'];
            break;
        }
    }

    if ( ! $pattern_content ) {
        wp_die( 'Pattern not found' );
    }

    // Render the pattern content.
    $rendered = do_blocks( $pattern_content );

    // Output full HTML page with theme styles.
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo( 'charset' ); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <?php wp_head(); ?>
        <style>
            body { margin: 0; padding: 20px; background: #fff; }
            .wp-block-template-part { display: block; }
            /* Hide submenus in preview */
            .wp-block-navigation__submenu-container,
            .sub-menu,
            .wp-block-navigation-submenu {
                display: none !important;
            }
        </style>
    </head>
    <body <?php body_class(); ?>>
        <?php echo $rendered; ?>
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
    exit;
}
add_action( 'wp_ajax_flow_editor_pattern_preview', 'flow_editor_ajax_pattern_preview' );

/**
 * Handle template part preview via admin-ajax (returns full HTML page).
 */
function flow_editor_ajax_template_part_preview() {
    if ( ! current_user_can( 'edit_theme_options' ) ) {
        wp_die( 'Unauthorized' );
    }

    $slug = isset( $_GET['slug'] ) ? sanitize_text_field( $_GET['slug'] ) : '';
    $theme = isset( $_GET['theme'] ) ? sanitize_text_field( $_GET['theme'] ) : get_stylesheet();

    if ( empty( $slug ) ) {
        wp_die( 'Template part slug required' );
    }

    // Get the template part.
    $template_part = get_block_template( $theme . '//' . $slug, 'wp_template_part' );

    if ( ! $template_part || empty( $template_part->content ) ) {
        wp_die( 'Template part not found' );
    }

    // Render the template part content.
    $rendered = do_blocks( $template_part->content );

    // Output full HTML page with theme styles.
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo( 'charset' ); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <?php wp_head(); ?>
        <style>
            body { margin: 0; padding: 20px; background: #fff; }
            /* Hide submenus in preview */
            .wp-block-navigation__submenu-container,
            .sub-menu,
            .wp-block-navigation-submenu,
            .wp-block-navigation__responsive-container:not(.is-menu-open) .wp-block-navigation__submenu-container {
                display: none !important;
            }
            /* Show only top-level nav items */
            .wp-block-navigation-item.has-child > .wp-block-navigation-item__content {
                display: inline-block;
            }
        </style>
    </head>
    <body <?php body_class(); ?>>
        <?php echo $rendered; ?>
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
    exit;
}
add_action( 'wp_ajax_flow_editor_template_part_preview', 'flow_editor_ajax_template_part_preview' );

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

