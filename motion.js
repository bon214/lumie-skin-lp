/* LUMIE SKIN: soft, finite entrances and scroll-linked photographic depth. */
window.LumieMotion = {
  mount(root, enabled = true) {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};
    function configure() {
      cleanup();
      if (!enabled || media.matches || !root || !('IntersectionObserver' in window)) return;
      const animations = new Set();
      const observed = new Set();
      const photos = [...root.querySelectorAll('img[src^="assets/images/"]:not(.hero-background-image)')];
      const hero = root.querySelector('section');
      const header = root.querySelector('header');
      let frame = 0;
      let disposed = false;
      root.classList.add('lumie-motion');
      function animate(el, frames, options) {
        if (!el.animate) return;
        const a = el.animate(frames, options);
        animations.add(a);
        const release = () => animations.delete(a);
        a.onfinish = release;
        a.oncancel = release;
      }
      const easing = 'cubic-bezier(.22, 1, .36, 1)';
      const heroImage = root.querySelector('.hero-background-image');
      if (heroImage) animate(heroImage, [
        {opacity: .65, transform: 'scale(1.025)'},
        {opacity: 1, transform: 'scale(1)'}
      ], {duration: 1800, easing});
      const observer = new IntersectionObserver(entries => {
        entries.forEach(({target, isIntersecting}) => {
          if (!isIntersecting) return;
          observer.unobserve(target);
          if (observed.has(target)) return;
          observed.add(target);
          const photoFrame = target.querySelector('[data-photo-frame]');
          if (photoFrame) animate(photoFrame, [
            {clipPath: 'inset(6% 3% 6% 3% round 48px)'},
            {clipPath: 'inset(0% 0% 0% 0% round 4px)'}
          ], {duration: 1500, easing, fill: 'backwards'});
          const isHero = hero.contains(target);
          const children = isHero && !target.querySelector('img') ? [...target.children] : [target];
          const siblings = [...target.parentElement.children].filter(el => el.hasAttribute('data-reveal'));
          children.forEach((el, i) => animate(el, [
            {opacity: 0, transform: 'translateY(30px)'},
            {opacity: 1, transform: 'translateY(0)'}
          ], {duration: isHero ? 1200 : 1000, delay: isHero ? 120 + i * 110 : Math.max(0, siblings.indexOf(target)) * 100, easing, fill: 'backwards'}));
        });
      }, {threshold: .06, rootMargin: '0px 0px -3% 0px'});
      root.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
      photos.forEach(img => img.classList.add('lumie-photo'));
      const activePhotos = new Set();
      const photoObserver = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? activePhotos.add(e.target) : activePhotos.delete(e.target));
        schedule();
      }, {rootMargin: '100px'});
      photos.forEach(img => photoObserver.observe(img));
      function update() {
        frame = 0;
        if (disposed) return;
        const height = innerHeight;
        const mobile = innerWidth < 720;
        activePhotos.forEach(img => {
          const box = img.parentElement.getBoundingClientRect();
          const progress = Math.max(-1, Math.min(1, (height / 2 - box.top - box.height / 2) / height));
          img.parentElement.style.setProperty('--lumie-light', `${.12 + (progress + 1) * .12}`);
          img.style.setProperty('--lumie-y', `${progress * (mobile ? 5 : 9)}px`);
          img.style.setProperty('--lumie-scale', `${1.065 + (1 - Math.abs(progress)) * .025}`);
        });
        header.classList.toggle('lumie-scrolled', scrollY > 30);
        const span = document.documentElement.scrollHeight - height;
        root.style.setProperty('--lumie-progress', span > 0 ? Math.min(1, Math.max(0, scrollY / span)) : 0);
      }
      function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(update); }
      addEventListener('scroll', schedule, {passive: true});
      addEventListener('resize', schedule, {passive: true});
      schedule();
      const panels = [...root.querySelectorAll('[id^="faq-p-"], #mobile-menu, [role="dialog"]')];
      const isVisible = el => getComputedStyle(el).display !== 'none' && getComputedStyle(el.parentElement).display !== 'none';
      const visible = new Map(panels.map(el => [el, isVisible(el)]));
      const mutation = new MutationObserver(() => {
        panels.forEach(el => {
          const now = isVisible(el);
          if (now && !visible.get(el)) animate(el, [
            {opacity: 0, transform: 'translateY(10px)'},
            {opacity: 1, transform: 'translateY(0)'}
          ], {duration: 420, easing});
          visible.set(el, now);
        });
      });
      panels.forEach(el => mutation.observe(el.matches('[role="dialog"]') ? el.parentElement : el, {attributes: true, attributeFilter: ['style']}));
      cleanup = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect(); photoObserver.disconnect(); mutation.disconnect();
        removeEventListener('scroll', schedule); removeEventListener('resize', schedule);
        animations.forEach(a => a.cancel()); animations.clear();
        root.classList.remove('lumie-motion');
        root.style.removeProperty('--lumie-progress');
        header.classList.remove('lumie-scrolled');
        photos.forEach(img => { img.parentElement.style.removeProperty('--lumie-light'); img.classList.remove('lumie-photo'); img.style.removeProperty('--lumie-y'); img.style.removeProperty('--lumie-scale'); });
      };
    }
    configure();
    media.addEventListener('change', configure);
    return () => { cleanup(); media.removeEventListener('change', configure); };
  }
};
