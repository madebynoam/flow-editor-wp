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
