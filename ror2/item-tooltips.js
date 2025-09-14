function enableItemHoverPopups({
  container = document,
  getId = (el) => el.dataset.itemId,      // pass getId: el => el.dataset.id if you use data-id
  infoById,
  itemsById = {},
  selector = '[data-item-id]',
  offset = { x: 14, y: 16 },
  showDelayMs = 0                         // 0 = immediate, e.g. dropzone; 3000 = delayed, e.g. pool
} = {}) {
  itemsById = itemsById || {};

  const tip = document.createElement('div');
  tip.className = 'item-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  tip.innerHTML = `<div class="it-row it-desc"></div>`;
  document.body.appendChild(tip);

  const els = Array.from(container.querySelectorAll(selector));

  let activeEl = null;        // the element we’re currently over
  let hoverTarget = null;     // the element captured at mouseenter (for delay check)
  let isShown = false;
  let showDelayTimer = null;
  let lastXY = { x: 0, y: 0 }; // always track the latest mouse position

  function fillTooltip(info, id) {
    const descEl = tip.querySelector('.it-desc');
    descEl.textContent = info?.description ?? '—';
  }

  function positionTooltip(pageX, pageY) {
    let x = pageX + offset.x;
    let y = pageY - offset.y;

    const rect = tip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (x < 8) x = 8;

    const wouldTopClip = (pageY - rect.height - 12) < 0;
    y = wouldTopClip ? (pageY + offset.y) : (pageY - offset.y);
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;

    tip.style.left = Math.round(x) + 'px';
    tip.style.top  = Math.round(y) + 'px';
  }

  function actuallyShow(pageX, pageY) {
    const id = getId(activeEl);
    const info = infoById?.[id];

    if (!info && !itemsById?.[id]) return;

    fillTooltip(info, id);
    tip.dataset.show = 'true';
    tip.setAttribute('aria-hidden', 'false');
    positionTooltip(pageX, pageY);
    isShown = true;
  }

  function hideTip() {
    tip.dataset.show = 'false';
    tip.setAttribute('aria-hidden', 'true');
    isShown = false;
    hoverTarget = null;
    clearTimeout(showDelayTimer);
  }

  function onEnter(e) {
    activeEl = e.currentTarget;
    hoverTarget = activeEl;

    // Grab initial coords (mouse) or zeros (keyboard focus)
    const { pageX, pageY } = e.type === 'focus' ? { pageX: 0, pageY: 0 } : e;
    lastXY = { x: pageX, y: pageY };

    // Keyboard focus should show immediately (accessibility)
    if (e.type === 'focus' || showDelayMs <= 0) {
      actuallyShow(lastXY.x, lastXY.y);
      return;
    }

    clearTimeout(showDelayTimer);
    showDelayTimer = setTimeout(() => {
      // Only show if still hovering the same element
      if (activeEl === hoverTarget) {
        actuallyShow(lastXY.x, lastXY.y); // use the latest mouse position
      }
    }, showDelayMs);
  }

  function onMove(e) {
    // Always keep lastXY up to date (even before showing)
    lastXY = { x: e.pageX, y: e.pageY };
    if (isShown) positionTooltip(lastXY.x, lastXY.y);
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
      clearTimeout(showDelayTimer);
      tip.remove();
    }
  };
}

window.enableItemHoverPopups = enableItemHoverPopups;
