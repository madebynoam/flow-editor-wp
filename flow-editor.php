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
