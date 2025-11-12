document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-list');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            navMenu.classList.toggle('active');
        });
    }

    // 2. Featured Products Category Filter
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    if (filterButtons.length && productCards.length) {
        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const selected = btn.dataset.filter;
                filterButtons.forEach((b) => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                productCards.forEach((card) => {
                    if (selected === 'all' || card.dataset.category === selected) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
        });
    }

    // 3. Newsletter Form Validation (augments native HTML5 validation)
    const newsletterForm = document.querySelector('.newsletter-form');
    const newsletterInput = document.querySelector('#newsletter-email');
    const newsletterFeedback = document.querySelector('#newsletter-feedback');

    if (newsletterForm && newsletterInput && newsletterFeedback) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!newsletterInput.checkValidity()) {
                newsletterFeedback.textContent = newsletterInput.validationMessage || 'Please enter a valid email address.';
                newsletterFeedback.style.color = '#fca5a5';
                newsletterInput.focus();
                return;
            }

            const email = newsletterInput.value.trim();
            newsletterFeedback.textContent = `Thanks for subscribing! Confirmation sent to ${email}.`;
            newsletterFeedback.style.color = '#86efac';
            newsletterForm.reset();
        });
    }

    // 4. Comparison Table Difference Highlighter
    const diffBtn = document.querySelector('#highlight-diff-btn');
    const comparisonRows = document.querySelectorAll('.comparison-table tbody tr');

    if (diffBtn && comparisonRows.length) {
        diffBtn.addEventListener('click', () => {
            const nextState = diffBtn.getAttribute('aria-pressed') !== 'true';
            diffBtn.setAttribute('aria-pressed', String(nextState));

            comparisonRows.forEach((row) => {
                const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent.trim());
                const allSame = cells.every((val) => val === cells[0]);
                row.classList.toggle('diff-highlight', nextState && !allSame);
            });
        });
    }
});
