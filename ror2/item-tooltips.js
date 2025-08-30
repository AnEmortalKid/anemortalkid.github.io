function enableItemHoverPopups({
    container = document,
    getId = (el) => el.dataset.itemId,
    infoById,        // { [id]: { action: string, description: string, name?: string } }
    itemsById = {},  // optional fallback source of name (from items_updated.js)
    selector = '[data-item-id]', // attach to any element with a data-item-id
    offset = { x: 14, y: 16 }    // cursor offset
} = {}) {
    // extra safety in case caller passes undefined/null explicitly
    itemsById = itemsById || {};

    // Create a single tooltip element
    const tip = document.createElement('div');
    tip.className = 'item-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = `
    <div class="it-row it-desc"></div>
  `;
    document.body.appendChild(tip);

    const els = Array.from(container.querySelectorAll(selector));
    let activeEl = null;

    function fillTooltip(info, id) {
        const descEl = tip.querySelector('.it-desc');
        descEl.textContent = info?.description ?? '—';
    }

    function positionTooltip(pageX, pageY) {
        // Start by placing above/right of cursor
        let x = pageX + offset.x;
        let y = pageY - offset.y;

        const rect = tip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // If off the right edge, nudge left
        if (x + rect.width > vw - 8) x = vw - rect.width - 8;
        // If off the left edge, nudge right
        if (x < 8) x = 8;

        // Prefer above cursor; if off the top, place below
        const wouldTopClip = (pageY - rect.height - 12) < 0;
        y = wouldTopClip ? (pageY + offset.y) : (pageY - offset.y);
        const bottomOverflow = y + rect.height > vh - 8;
        if (bottomOverflow) y = vh - rect.height - 8;

        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
    }

    function showTip(el, pageX, pageY) {
        const id = getId(el);
        const info = infoById[id];

        // If no info, don’t show a blank tooltip
        if (!info && !itemsById?.[id]) return;

        fillTooltip(info, id);
        tip.dataset.show = 'true';
        tip.setAttribute('aria-hidden', 'false');
        positionTooltip(pageX, pageY);
    }

    function hideTip() {
        tip.dataset.show = 'false';
        tip.setAttribute('aria-hidden', 'true');
    }

    function onEnter(e) {
        activeEl = e.currentTarget;
        const { pageX, pageY } = e.type === 'focus' ? { pageX: 0, pageY: 0 } : e;
        showTip(activeEl, pageX, pageY);
    }
    function onMove(e) {
        if (!activeEl) return;
        positionTooltip(e.pageX, e.pageY);
    }
    function onLeave() {
        activeEl = null;
        hideTip();
    }
    function onKeydown(e) {
        if (e.key === 'Escape' && activeEl) {
            activeEl.blur?.();
            onLeave();
        }
    }

    els.forEach(el => {
        // Make focusable for keyboard users if not naturally focusable
        if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName))
            el.setAttribute('tabindex', '0');

        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('focus', onEnter);
        el.addEventListener('blur', onLeave);
    });

    window.addEventListener('keydown', onKeydown);

    return {
        destroy() {
            els.forEach(el => {
                el.removeEventListener('mouseenter', onEnter);
                el.removeEventListener('mousemove', onMove);
                el.removeEventListener('mouseleave', onLeave);
                el.removeEventListener('focus', onEnter);
                el.removeEventListener('blur', onLeave);
            });
            window.removeEventListener('keydown', onKeydown);
            tip.remove();
        }
    };
}

window.enableItemHoverPopups = enableItemHoverPopups; // make it global