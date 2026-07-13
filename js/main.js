/* =========================================================
   LUMINA — main.js
   Theme toggle, mobile menu, ToC scroll spy
   ========================================================= */

(function () {
  'use strict';

  // ─── Theme ────────────────────────────────────────────────
  const STORAGE_KEY = 'lumina-theme';
  const root = document.documentElement;

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // On load — restore saved theme
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  }

  document.addEventListener('DOMContentLoaded', function () {

    // ─── Theme toggle ──────────────────────────────────────
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const current = root.getAttribute('data-theme') || getSystemTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });

    // ─── Mobile menu ───────────────────────────────────────
    const menuToggles = document.querySelectorAll('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    menuToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const open = mobileNav && mobileNav.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // ─── ToC scroll spy removed (backup saved to js/_toc-backup.js) ─

    // ─── Filter buttons (articles page) ───────────────────
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });

    // ─── Smooth anchor scroll ──────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });

    // ─── Contact form submission mock ─────────────────────
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = contactForm.querySelector('[type="submit"]');
        if (btn) {
          btn.textContent = 'Sent ✓';
          btn.disabled = true;
          btn.style.opacity = '0.7';
          setTimeout(function () {
            btn.textContent = 'Send Message';
            btn.disabled = false;
            btn.style.opacity = '';
          }, 3000);
        }
      });
    }

    // ─── Header shadow on scroll ───────────────────────────
    const header = document.querySelector('.site-header');
    if (header) {
      window.addEventListener('scroll', function () {
        header.style.boxShadow = window.scrollY > 10
          ? '0 1px 20px rgba(0,0,0,0.08)'
          : '';
      }, { passive: true });
    }

    // ─── Repair minimal headers in older article files (adds missing SVGs) ─
    (function repairBrokenHeaders() {
      try {
        const logoSvg = document.querySelector('.site-logo .site-logo-icon');
        if (logoSvg) {
          const circles = logoSvg.querySelectorAll('circle');
          if (circles.length === 1) {
            logoSvg.innerHTML = '\n              <circle cx="14" cy="14" r="12" stroke="currentColor" stroke-width="1.6"/>\n              <circle cx="14" cy="14" r="6" fill="var(--cobalt)" opacity="0.18"/>\n              <circle cx="14" cy="14" r="3" fill="var(--cobalt)"/>\n              <line x1="14" y1="2" x2="14" y2="6" stroke="var(--cobalt)" stroke-width="1.8" stroke-linecap="round"/>\n              <line x1="14" y1="22" x2="14" y2="26" stroke="var(--cobalt)" stroke-width="1.8" stroke-linecap="round"/>\n              <line x1="2" y1="14" x2="6" y2="14" stroke="var(--cobalt)" stroke-width="1.8" stroke-linecap="round"/>\n              <line x1="22" y1="14" x2="26" y2="14" stroke="var(--cobalt)" stroke-width="1.8" stroke-linecap="round"/>\n            ';
          }
        }

        const themeBtn = document.querySelector('.theme-toggle');
        if (themeBtn && themeBtn.innerHTML.trim() === '') {
          themeBtn.innerHTML = '\n            <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\n            <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\n          ';
        }

        const menuSvg = document.querySelector('.menu-toggle svg');
        if (menuSvg) {
          const lines = menuSvg.querySelectorAll('line');
          if (lines.length < 3) {
            menuSvg.innerHTML = '<line x1="3" y1="6" x2="21" y2="6"/>' +
                                '<line x1="3" y1="12" x2="21" y2="12"/>' +
                                '<line x1="3" y1="18" x2="21" y2="18"/>';
          }
        }
      } catch (e) {
        // no-op on error
      }
    })();
  });
})();
