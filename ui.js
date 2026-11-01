/* Shared chrome behaviour for the secondary pages. */
(() => {
    const header = document.getElementById('site-header');
    const menuRoots = Array.from(document.querySelectorAll('[data-menu-root]'));
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const modal = document.getElementById('bug-modal');

    const syncHeader = () => {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });

    const closeMenus = (except) => {
        menuRoots.forEach((root) => {
            if (root === except) return;
            root.classList.remove('is-open');
            const btn = root.querySelector('[data-menu-button]');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    };

    menuRoots.forEach((root) => {
        const btn = root.querySelector('[data-menu-button]');
        const panel = root.querySelector('[data-menu]');
        if (!btn || !panel) return;

        btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const willOpen = !root.classList.contains('is-open');
            closeMenus(root);
            root.classList.toggle('is-open', willOpen);
            btn.setAttribute('aria-expanded', String(willOpen));
        });

        panel.addEventListener('click', (event) => event.stopPropagation());
    });

    const setMobile = (open) => {
        if (!mobileMenu || !mobileBtn) return;
        mobileMenu.classList.toggle('is-open', open);
        mobileMenu.setAttribute('aria-hidden', String(!open));
        mobileBtn.setAttribute('aria-expanded', String(open));
        const openIcon = mobileBtn.querySelector('.menu-open-icon');
        const closeIcon = mobileBtn.querySelector('.menu-close-icon');
        if (openIcon) openIcon.classList.toggle('hidden', open);
        if (closeIcon) closeIcon.classList.toggle('hidden', !open);
    };

    mobileBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobile(!mobileMenu.classList.contains('is-open'));
        closeMenus();
    });
    mobileMenu?.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('click', () => {
        closeMenus();
        setMobile(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeMenus();
        setMobile(false);
        if (modal && !modal.classList.contains('hidden') && typeof window.closeBugModal === 'function') {
            window.closeBugModal();
        }
    });

    if (modal) {
        new MutationObserver(() => {
            document.documentElement.style.overflow = modal.classList.contains('hidden') ? '' : 'hidden';
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
})();
