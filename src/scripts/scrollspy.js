export function initScrollSpy(barbaContainer) {
    const container = barbaContainer.querySelector(".scroll-container");

    if (!container) return;

    const sections = container.querySelectorAll("section");

    if (!sections.length) return;

    // Dynamically build dots based on section count
    const scrollIndicator = barbaContainer.querySelector(".scroll-indicator");

    if (!scrollIndicator) return;

    scrollIndicator.innerHTML =
        sections.length > 1
            ? Array.from(
                  { length: sections.length },
                  (_, i) =>
                      `<a href="#" data-index="${i}" aria-label="Go to section ${i + 1}"></a>`,
              ).join("")
            : "";

    const dots = barbaContainer.querySelectorAll(".scroll-indicator a");

    if (!dots.length) return;

    if (container._observer) {
        container._observer.disconnect();
    }

    const sectionsArray = Array.from(sections);

    dots.forEach((d) => d.classList.remove("active"));
    dots[0]?.classList.add("active");

    // Click handler so dots act as navigation
    dots.forEach((dot, i) => {
        dot.addEventListener("click", (e) => {
            e.preventDefault();
            sectionsArray[i]?.scrollIntoView({ behavior: "smooth" });
        });
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const index = sectionsArray.indexOf(entry.target);

                dots.forEach((d) => d.classList.remove("active"));
                dots[index]?.classList.add("active");
            });
        },
        // A section is active while it crosses the middle of the screen. This
        // also works for sections taller than the screen, which a visibility
        // threshold would never mark as active.
        {
            root: null,
            rootMargin: "-50% 0px -50% 0px",
            threshold: 0,
        },
    );

    sections.forEach((s) => observer.observe(s));

    container._observer = observer;
}
