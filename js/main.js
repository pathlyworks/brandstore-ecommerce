/*
 * BrandStore — progressive enhancement only.
 * CSS owns every visual state; this file just flips ARIA attributes, the
 * `hidden` attribute and BEM modifier classes that the stylesheets react to.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile navigation toggle (state lives in aria-expanded)
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav__list');

    if (navToggle && navMenu) {
        const setNavOpen = (open) => navToggle.setAttribute('aria-expanded', String(open));

        navToggle.addEventListener('click', () => {
            setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        // Close after choosing a destination, and on Escape.
        navMenu.addEventListener('click', (event) => {
            if (event.target.closest('.nav__link')) {
                setNavOpen(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
                setNavOpen(false);
                navToggle.focus();
            }
        });
    }

    // 2. Featured products category filter (state lives in aria-pressed)
    const filterButtons = document.querySelectorAll('.filter__btn');
    const productCards = document.querySelectorAll('.product-card');

    const applyFilter = (selected) => {
        filterButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
        });
        productCards.forEach((card) => {
            card.hidden = !(selected === 'all' || card.dataset.category === selected);
        });
    };

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => applyFilter(button.dataset.filter));
    });

    // Category cards jump to the featured grid, pre-filtered when that
    // category has a filter button, otherwise showing everything.
    document.querySelectorAll('[data-filter-link]').forEach((link) => {
        link.addEventListener('click', () => {
            const wanted = link.dataset.filterLink;
            const hasFilter = Array.from(filterButtons).some((button) => button.dataset.filter === wanted);
            applyFilter(hasFilter ? wanted : 'all');
        });
    });

    // 3. Newsletter validation with inline, announced feedback
    const newsletterForm = document.querySelector('.newsletter__form');
    const newsletterInput = document.querySelector('#newsletter-email');
    const newsletterFeedback = document.querySelector('#newsletter-feedback');

    if (newsletterForm && newsletterInput && newsletterFeedback) {
        const submitButton = newsletterForm.querySelector('[type="submit"]');
        const submitLabel = submitButton.textContent;

        const showFeedback = (message, type) => {
            newsletterFeedback.textContent = message;
            newsletterFeedback.classList.toggle('newsletter__feedback--error', type === 'error');
            newsletterFeedback.classList.toggle('newsletter__feedback--success', type === 'success');
        };

        // Native bubbles are replaced by the inline message; without JS the
        // browser's own validation still runs because novalidate is set here.
        newsletterForm.noValidate = true;

        newsletterForm.addEventListener('submit', (event) => {
            event.preventDefault();

            if (!newsletterInput.checkValidity()) {
                newsletterInput.setAttribute('aria-invalid', 'true');
                showFeedback(newsletterInput.validationMessage || 'Please enter a valid email address.', 'error');
                newsletterInput.focus();
                return;
            }

            const email = newsletterInput.value.trim();
            newsletterForm.reset();
            newsletterInput.removeAttribute('aria-invalid');
            newsletterInput.focus();
            submitButton.disabled = true;
            submitButton.textContent = 'Subscribed';
            showFeedback(`Thanks for subscribing! Confirmation sent to ${email}.`, 'success');
        });

        // Typing again clears the error and re-enables the button.
        newsletterInput.addEventListener('input', () => {
            if (newsletterInput.getAttribute('aria-invalid') === 'true' && newsletterInput.checkValidity()) {
                newsletterInput.removeAttribute('aria-invalid');
                showFeedback('', null);
            }
            if (submitButton.disabled) {
                submitButton.disabled = false;
                submitButton.textContent = submitLabel;
                showFeedback('', null);
            }
        });
    }

    // 4. Comparison table difference highlighter
    const diffButton = document.querySelector('#highlight-diff-btn');
    const comparisonRows = document.querySelectorAll('.comparison-table__row');

    if (diffButton && comparisonRows.length) {
        diffButton.addEventListener('click', () => {
            const nextState = diffButton.getAttribute('aria-pressed') !== 'true';
            diffButton.setAttribute('aria-pressed', String(nextState));

            comparisonRows.forEach((row) => {
                const values = Array.from(row.querySelectorAll('.comparison-table__cell')).map((cell) => cell.textContent.trim());
                const allSame = values.every((value) => value === values[0]);
                row.classList.toggle('comparison-table__row--diff', nextState && !allSame);
            });
        });
    }

    // 5. Scrollable regions are keyboard-focusable only while they overflow,
    //    so wide screens do not get an empty tab stop.
    const scrollRegions = document.querySelectorAll('[data-scroll-region]');

    if (scrollRegions.length) {
        const syncScrollRegions = () => {
            scrollRegions.forEach((region) => {
                if (region.scrollWidth > region.clientWidth) {
                    region.setAttribute('tabindex', '0');
                } else {
                    region.removeAttribute('tabindex');
                }
            });
        };

        syncScrollRegions();
        window.addEventListener('resize', syncScrollRegions);
    }
});
