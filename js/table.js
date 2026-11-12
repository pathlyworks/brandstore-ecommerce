/*
 * table.js — "Highlight Differences" toggle on the comparison table.
 *
 * A row counts as different when its product cells are not all equal. The
 * toggle button's state is aria-pressed; the highlight is a BEM modifier
 * class that CSS styles.
 */
(function () {
    'use strict';

    var dom = BrandStore.dom;
    var DIFF_CLASS = 'comparison-table__row--diff';

    /**
     * Do all cells in a row show the same text?
     * @param {HTMLElement} row
     * @returns {boolean}
     */
    function rowIsUniform(row) {
        var values = dom.qsa('.comparison-table__cell', row).map(function (cell) {
            return cell.textContent.trim();
        });
        return values.every(function (value) {
            return value === values[0];
        });
    }

    /**
     * Turn the highlight on or off for every row.
     * @param {HTMLElement[]} rows
     * @param {boolean} on
     */
    function setHighlight(rows, on) {
        rows.forEach(function (row) {
            row.classList.toggle(DIFF_CLASS, on && !rowIsUniform(row));
        });
    }

    /**
     * Attach the toggle (only on pages with the table).
     */
    function init() {
        var button = dom.qs('#highlight-diff-btn');
        var rows = dom.qsa('.comparison-table__row');
        if (!button || !rows.length) {
            return;
        }
        button.addEventListener('click', function () {
            var next = button.getAttribute('aria-pressed') !== 'true';
            button.setAttribute('aria-pressed', String(next));
            setHighlight(rows, next);
        });
    }

    BrandStore.register('table', init);
})();
