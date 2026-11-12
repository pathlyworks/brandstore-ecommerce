/*
 * app.js — the tiny module system every other file plugs into.
 *
 * Each feature file calls BrandStore.register('name', initFunction). The
 * page decides which features exist by choosing which <script> tags it loads,
 * and main.js then runs the registered functions in the order they were
 * loaded. There are no build tools and no ES modules, so the site also works
 * when opened straight from the file system.
 */
(function () {
    'use strict';

    var registry = [];

    /**
     * Add a feature's init function to the start-up list.
     * @param {string} name  Label used in error messages.
     * @param {function} init  Called once, after the DOM has been parsed.
     */
    function register(name, init) {
        registry.push({ name: name, init: init });
    }

    /**
     * Run every registered init function. One failing feature is reported and
     * skipped, so it cannot stop the others from working.
     */
    function start() {
        registry.forEach(function (feature) {
            try {
                feature.init();
            } catch (error) {
                console.error('BrandStore: "' + feature.name + '" failed to start.', error);
            }
        });
    }

    window.BrandStore = { register: register, start: start };
})();
