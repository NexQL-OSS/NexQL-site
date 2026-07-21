// Pricing tier UI: billing toggle, dynamic price labels. USD only — INR hidden.

(function () {
  const STORAGE_PERIOD = 'nexql_pricing_period';

  let catalog = null;

  function getCurrency() {
    return 'USD';
  }

  function getPeriod() {
    return sessionStorage.getItem(STORAGE_PERIOD) || 'monthly';
  }

  function setPeriod(period) {
    sessionStorage.setItem(STORAGE_PERIOD, period);
    syncToggleGroup('.pricing-billing-toggle', 'data-period', period);
    updatePriceLabels();
  }

  function syncToggleGroup(selector, attr, value) {
    document.querySelectorAll(`${selector} button`).forEach((btn) => {
      const active = btn.getAttribute(attr) === value;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('is-active', active);
    });
  }

  function parseDisplay(display) {
    if (!display) return { amount: '—', period: '' };
    const slash = display.indexOf('/');
    if (slash === -1) return { amount: display, period: '' };
    return {
      amount: display.slice(0, slash).trim(),
      period: `/ ${display.slice(slash + 1).trim()}`,
    };
  }

  function updatePriceLabels() {
    if (!catalog) return;

    const currency = getCurrency();
    const period = getPeriod();

    document.querySelectorAll('[data-pricing-tier]').forEach((el) => {
      const tier = el.getAttribute('data-pricing-tier');
      const tierData = catalog.tiers?.[tier]?.[period]?.[currency];
      const amountEl = el.querySelector('.pricing-amount-value');
      const periodEl = el.querySelector('.pricing-amount .period');
      const payBtn = el.querySelector('[data-tier]');

      if (!tierData) return;

      const parsed = parseDisplay(tierData.display);
      if (amountEl) amountEl.textContent = parsed.amount;
      if (periodEl) periodEl.textContent = parsed.period;

      // Checkout temporarily disabled while payment setup is being fixed —
      // force-disabled regardless of catalog availability.
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.title = 'Checkout temporarily unavailable';
      }
    });
  }

  async function loadCatalog() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Failed to load pricing config');
      catalog = await res.json();
      updatePriceLabels();
    } catch (err) {
      console.error('Pricing catalog load failed:', err);
    }
  }

  document.addEventListener('click', (event) => {
    const periodBtn = event.target.closest('.pricing-billing-toggle button[data-period]');
    if (periodBtn) {
      setPeriod(periodBtn.getAttribute('data-period'));
    }
  });

  function initPricingUi() {
    syncToggleGroup('.pricing-billing-toggle', 'data-period', getPeriod());
    updatePriceLabels();
  }

  function init() {
    loadCatalog();
  }

  window.NexQLPricing = {
    getCurrency,
    getPeriod,
    getCatalog: () => catalog,
    refreshCatalog: loadCatalog,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('partials-loaded', () => {
    initPricingUi();
    loadCatalog();
  });
})();
