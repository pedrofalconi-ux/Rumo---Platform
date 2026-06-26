'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollRevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Stop observing once visible to maintain animation state
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null, // default is the browser viewport
        rootMargin: '0px 0px -40px 0px', // trigger slightly before the element fully enters
        threshold: 0.05, // trigger when 5% of the element is visible
      }
    );

    const observeElements = () => {
      const elements = document.querySelectorAll('.scroll-reveal:not(.visible)');
      elements.forEach((el) => {
        observer.observe(el);
      });
    };

    // Run initial scan
    observeElements();

    // Set up MutationObserver to scan when the DOM updates (e.g. data loaded from API)
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        observeElements();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]); // Re-run when navigation/page changes

  return null;
}
