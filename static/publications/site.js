(() => {
  const ticker = document.querySelector(".news-ticker");
  const tickerTrack = ticker?.querySelector(".news-ticker-track");
  const tickerToggle = ticker?.querySelector(".news-ticker-toggle");

  if (tickerTrack && tickerToggle) {
    tickerToggle.addEventListener("click", () => {
      const paused = tickerTrack.classList.toggle("is-paused");
      tickerToggle.setAttribute("aria-pressed", String(paused));
      tickerToggle.setAttribute(
        "aria-label",
        `${paused ? "Resume" : "Pause"} latest news ticker`,
      );
      tickerToggle.textContent = paused ? "Resume" : "Pause";
    });
  }
})();

(() => {
  const tracks = document.querySelectorAll("[data-carousel]");

  tracks.forEach((track) => {
    const name = track.dataset.carousel;
    const cards = Array.from(track.querySelectorAll(".carousel-card"));
    const status = document.querySelector(`[data-carousel-status="${name}"]`);
    const dots = document.querySelector(`[data-carousel-dots="${name}"]`);
    const previous = document.querySelector(`[data-carousel-prev="${name}"]`);
    const next = document.querySelector(`[data-carousel-next="${name}"]`);

    if (!cards.length || !status || !dots || !previous || !next) return;

    cards.forEach((card, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Show edition ${index + 1}`);
      dot.addEventListener("click", () => card.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      }));
      dots.append(dot);
    });

    const step = () => {
      const card = cards[0];
      const styles = window.getComputedStyle(track);
      return card.getBoundingClientRect().width + Number.parseFloat(styles.columnGap || styles.gap || "0");
    };

    const activeIndex = () => Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / step())));
    const update = () => {
      const index = activeIndex();
      status.textContent = `${index + 1} / ${cards.length}`;
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      dots.querySelectorAll(".carousel-dot").forEach((dot, dotIndex) => {
        if (dotIndex === index) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    };

    previous.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    track.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      track.scrollBy({
        left: (event.key === "ArrowRight" ? 1 : -1) * step(),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();

(() => {
  const stages = document.querySelectorAll("[data-magazine-tilt]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  stages.forEach((stage) => {
    stage.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || reducedMotion.matches) return;
      const bounds = stage.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
      stage.style.setProperty("--tilt-x", `${(-vertical * 7).toFixed(2)}deg`);
      stage.style.setProperty("--tilt-y", `${(horizontal * 8).toFixed(2)}deg`);
      stage.style.setProperty("--lift", "-8px");
    });

    stage.addEventListener("pointerleave", () => {
      stage.style.removeProperty("--tilt-x");
      stage.style.removeProperty("--tilt-y");
      stage.style.removeProperty("--lift");
    });
  });
})();

(() => {
  const slots = document.querySelectorAll("[data-ad-impression]");

  const recordImpression = (slot) => {
    if (slot.dataset.impressionSent === "true") return;
    const form = slot.querySelector(".ad-impression-form");
    const csrfToken = form?.elements.csrfmiddlewaretoken?.value;
    if (!form || !csrfToken) return;
    slot.dataset.impressionSent = "true";
    fetch(form.action, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {"X-CSRFToken": csrfToken},
    }).catch((error) => console.error("Unable to record advertisement impression", error));
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          recordImpression(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.5});
    slots.forEach((slot) => observer.observe(slot));
  } else {
    slots.forEach(recordImpression);
  }
})();
