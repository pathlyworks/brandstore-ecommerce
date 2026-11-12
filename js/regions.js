/*
 * regions.js — keyboard access to scrollable areas.
 *
 * A scrollable region must be focusable so keyboard users can scroll it, but
 * only while it really overflows: on a wide screen an always-focusable box
 * would be an empty tab stop. Any element marked data-scroll-region is
 * given tabindex="0" while it overflows and loses it otherwise.
 */
(function () {
    'use strict';

    var dom = BrandStore.dom;

    /**
     * Add or remove the tab stop for each region.
     * @param {HTMLElement[]} regions
     */
    function syncRegions(regions) {
        regions.forEach(function (region) {
            if (region.scrollWidth > region.clientWidth) {
                region.setAttribute('tabindex', '0');
            } else {
                region.removeAttribute('tabindex');
            }
        });
    }

    /**
     * Sync now and whenever the window size changes.
     */
    function init() {
        var regions = dom.qsa('[data-scroll-region]');
        if (!regions.length) {
            return;
        }
        syncRegions(regions);
        window.addEventListener('resize', function () {
            syncRegions(regions);
        });
    }

    BrandStore.register('regions', init);
})();
