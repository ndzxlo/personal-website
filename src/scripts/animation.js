import gsap from "gsap";
import barba from "@barba/core";
import MotionText from "./components/motion-text";
import { select, selectAll, normalizePath, pageMeta } from "./utils";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { initScrollSpy } from "./scrollspy";

const CLIP_FULL = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
const CLIP_TOP = "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)";

// The wipe is light when it comes out of the (dark) menu and dark when it
// crosses a (light) page, so it always reads against what it covers.
const OVERLAY_THEMES = {
    light: { bg: "var(--base-background)", fg: "var(--base-text)" },
    dark: { bg: "var(--menu-background)", fg: "var(--base-background)" },
};

class App {
    constructor() {
        this.menuState = { isOpen: false };
        this.menuTimeline = null;
        this.contentObserver = null;
        this.splitTitleDestination = null;
        this.heroSplit = null;

        this.motionTexts = new MotionText();

        this.barbaWrapper = select("[data-barba='wrapper']");
        this.navOverlay = select("#nav-overlay");
        this.menuToggle = select("#menu-toggle");
        this.transitionOverlay = select(".transition__overlay");
        this.titleDestination = select(
            ".transition__overlay .title__destination",
        );

        this.getPercentageVerticalClip();

        this.initBarba();
        this.bindNav();
        this.bindLinks();
        this.initCardLight();

        window.addEventListener("resize", this.onResize.bind(this));
    }

    /* ---------------------------------------------------------------- */
    /* Menu                                                             */
    /* ---------------------------------------------------------------- */

    // One timeline, played forwards to open and reversed to close, so the
    // menu can be interrupted at any point without snapping.
    buildMenuTimeline() {
        const rect = this.menuToggle.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        this.menuTimeline?.kill();

        this.menuTimeline = gsap
            .timeline({
                paused: true,
                onReverseComplete: () => {
                    gsap.set(this.navOverlay, { visibility: "hidden" });
                },
            })
            .fromTo(
                this.navOverlay,
                { clipPath: `circle(0px at ${x}px ${y}px)` },
                {
                    clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`,
                    duration: 0.9,
                    ease: "expo.inOut",
                },
                0,
            )
            .fromTo(
                this.navOverlay.querySelectorAll(".menu-text"),
                { yPercent: 115 },
                {
                    yPercent: 0,
                    duration: 1,
                    ease: "expo.out",
                    stagger: 0.07,
                },
                0.35,
            )
            .fromTo(
                this.navOverlay.querySelectorAll(".menu-fade"),
                { autoAlpha: 0 },
                {
                    autoAlpha: 1,
                    duration: 0.6,
                    ease: "sine.out",
                    stagger: 0.05,
                },
                0.6,
            );
    }

    setMenuOpen(open) {
        if (open === this.menuState.isOpen) return;
        if (!this.navOverlay || !this.menuToggle) return;

        this.menuState.isOpen = open;
        this.menuToggle.setAttribute("aria-expanded", String(open));

        if (open) {
            // Mid-close: just turn around. Otherwise measure and start fresh.
            if (this.menuTimeline?.isActive()) {
                this.menuTimeline.timeScale(1).play();
                return;
            }

            this.buildMenuTimeline();
            gsap.set(this.navOverlay, { visibility: "visible" });
            this.menuTimeline.timeScale(1).play(0);
        } else {
            this.menuTimeline?.timeScale(1.6).reverse();
        }
    }

    // Used once the page transition has covered the screen
    resetMenu() {
        this.menuTimeline?.pause(0);
        gsap.set(this.navOverlay, { visibility: "hidden" });
        this.menuState.isOpen = false;
        this.menuToggle?.setAttribute("aria-expanded", "false");
    }

    bindNav() {
        this.menuToggle?.addEventListener("click", () => {
            this.setMenuOpen(!this.menuState.isOpen);
        });

        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.setMenuOpen(false);
        });
    }

    // Links to the page we're already on: no reload, no transition. If the
    // menu is open it simply closes.
    bindLinks() {
        document.addEventListener("click", (e) => {
            const link = e.target.closest?.("a[href]");

            if (!link || link.target) return;

            const url = new URL(link.href, window.location.href);

            if (url.origin !== window.location.origin) return;

            if (
                normalizePath(url.pathname) ===
                normalizePath(window.location.pathname)
            ) {
                e.preventDefault();
                this.setMenuOpen(false);
            }
            // Capture phase: this has to run before Barba's own click
            // handler, which updates the URL as soon as it takes a link.
        }, true);
    }

    // Header label, footer counter and the highlighted menu link
    updateFrame(path) {
        const meta = pageMeta(path);

        selectAll("[data-page-label]").forEach((el) => {
            el.textContent = meta.title;
        });

        selectAll("[data-page-index]").forEach((el) => {
            el.textContent = meta.index;
        });

        selectAll(".nav-overlay__link").forEach((link) => {
            const isCurrent =
                normalizePath(new URL(link.href).pathname) === meta.section;

            if (isCurrent) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }

    /* ---------------------------------------------------------------- */
    /* Page content                                                     */
    /* ---------------------------------------------------------------- */

    prepareContentAnimation(container) {
        const cards = container.querySelectorAll(".hero-image");

        gsap.set(cards, { autoAlpha: 0, y: 56 });

        cards.forEach((card) => {
            gsap.set(card.children, { autoAlpha: 0, y: 20 });
        });

        gsap.set(container.querySelectorAll(".hero-text"), {
            autoAlpha: 0,
            y: 16,
        });

        gsap.set(container.querySelectorAll(".hero-portrait"), {
            clipPath: "circle(0% at 50% 50%)",
        });

        gsap.set(container.querySelectorAll(".hero-portrait img"), {
            scale: 1.5,
        });

        this.heroSplit?.revert();
        this.heroSplit = null;

        const heroTitle = container.querySelector(".hero-title");

        if (heroTitle) {
            this.heroSplit = new SplitText(heroTitle, {
                type: "lines,chars",
                mask: "lines",
                linesClass: "lines",
                charsClass: "chars",
            });

            gsap.set(this.heroSplit.chars, { yPercent: 115 });
        }
    }

    revealCard(card) {
        gsap.to(card, {
            autoAlpha: 1,
            y: 0,
            duration: 1.3,
            ease: "expo.out",
            clearProps: "transform",
        });

        gsap.to(card.children, {
            autoAlpha: 1,
            y: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.09,
            delay: 0.15,
            clearProps: "transform",
        });
    }

    animateContent(container) {
        // Cards come in as they enter the viewport, so cards further down a
        // snap-scrolling page get their own entrance.
        this.contentObserver?.disconnect();

        this.contentObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    this.contentObserver.unobserve(entry.target);
                    this.revealCard(entry.target);
                });
            },
            { threshold: 0.15 },
        );

        container
            .querySelectorAll(".hero-image")
            .forEach((card) => this.contentObserver.observe(card));

        gsap.to(container.querySelectorAll(".hero-portrait"), {
            clipPath: "circle(50% at 50% 50%)",
            duration: 1.4,
            ease: "expo.out",
            clearProps: "clipPath",
        });

        gsap.to(container.querySelectorAll(".hero-portrait img"), {
            scale: 1,
            duration: 1.8,
            ease: "expo.out",
        });

        if (this.heroSplit) {
            const split = this.heroSplit;

            gsap.to(split.chars, {
                yPercent: 0,
                duration: 1.1,
                ease: "expo.out",
                stagger: 0.025,
                delay: 0.1,
                onComplete: () => {
                    split.revert();
                    if (this.heroSplit === split) this.heroSplit = null;
                },
            });
        }

        gsap.to(container.querySelectorAll(".hero-text"), {
            autoAlpha: 1,
            y: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.1,
            delay: 0.45,
        });
    }

    /* ---------------------------------------------------------------- */
    /* Transition overlay                                               */
    /* ---------------------------------------------------------------- */

    setOverlayTitle(text, theme) {
        const { bg, fg } = OVERLAY_THEMES[theme];

        this.transitionOverlay.style.setProperty("--overlay-bg", bg);
        this.transitionOverlay.style.setProperty("--overlay-fg", fg);
        this.transitionOverlay.classList.add("team__transition");

        this.splitTitleDestination?.revert();

        this.titleDestination.textContent = text;

        this.splitTitleDestination = new SplitText(this.titleDestination, {
            type: "words",
            mask: "words",
            wordsClass: "words",
        });

        gsap.set(this.splitTitleDestination.words, { yPercent: 120 });

        this.getPercentageVerticalClip();
    }

    // The overlay is covering the screen: send the title up and lift the
    // cover while the new page settles in underneath.
    reveal(container) {
        this.prepareContentAnimation(container);

        const tl = gsap.timeline({
            defaults: { duration: 1, ease: "hop" },
        });

        tl.to(this.splitTitleDestination.words, {
            yPercent: -120,
            duration: 0.55,
            ease: "power3.in",
            stagger: { amount: 0.12 },
        });

        tl.to(
            this.transitionOverlay,
            {
                "--clip": CLIP_TOP,
                onStart: () => {
                    this.motionTexts.init(container);
                    this.motionTexts.animationIn();
                    this.animateContent(container);
                },
            },
            "<+0.3",
        );

        tl.fromTo(
            container,
            { y: 70 },
            { y: 0, duration: 1.2, ease: "expo.out", clearProps: "transform" },
            "<",
        );

        return new Promise((resolve) => {
            tl.call(() => {
                this.splitTitleDestination?.revert();
                this.splitTitleDestination = null;

                gsap.set(this.transitionOverlay, {
                    pointerEvents: "none",
                    autoAlpha: 0,
                });

                this.transitionOverlay.classList.remove("team__transition");
                this.barbaWrapper.classList.remove("is__transitioning");

                tl.kill();
                resolve();
            });
        });
    }

    // First load: the cover is already in place (see Layout), show where we
    // are, then lift it.
    intro() {
        const container = select("[data-barba='container']");

        this.barbaWrapper.classList.add("is__transitioning");
        this.setOverlayTitle(pageMeta(window.location.pathname).title, "dark");

        gsap.set(this.transitionOverlay, {
            "--clip": CLIP_FULL,
            autoAlpha: 1,
        });

        document.documentElement.classList.remove("is-intro");

        this.prepareContentAnimation(container);

        gsap.to(this.splitTitleDestination.words, {
            yPercent: 0,
            duration: 1,
            ease: "expo.out",
            stagger: { amount: 0.12 },
            delay: 0.15,
            onComplete: () => {
                gsap.delayedCall(0.15, () => this.reveal(container));
            },
        });
    }

    initBarba() {
        barba.init({
            transitions: [
                {
                    name: "default-page-transition",

                    once: (data) => {
                        requestAnimationFrame(() => {
                            initScrollSpy(data.next.container);
                        });
                    },

                    afterEnter: (data) => {
                        requestAnimationFrame(() => {
                            initScrollSpy(data.next.container);
                        });
                    },

                    before: (data) => {
                        this.barbaWrapper.classList.add("is__transitioning");

                        this.fromMenu = this.menuState.isOpen;

                        // Show the page we're heading to (also on back/forward)
                        this.setOverlayTitle(
                            pageMeta(data.next.url.path).title,
                            this.fromMenu ? "light" : "dark",
                        );

                        const top = 50 - this.percentageVerticalClip;
                        const bottom = 50 + this.percentageVerticalClip;

                        gsap.set(this.transitionOverlay, {
                            "--clip": `polygon(0% ${top}%, 0% ${top}%, 0% ${bottom}%, 0% ${bottom}%)`,
                        });
                    },

                    leave: (data) => {
                        const top = 50 - this.percentageVerticalClip;
                        const bottom = 50 + this.percentageVerticalClip;

                        const tl = gsap.timeline({
                            defaults: { duration: 0.85, ease: "expo.inOut" },
                        });

                        gsap.set(this.transitionOverlay, {
                            pointerEvents: "auto",
                            autoAlpha: 1,
                        });

                        // A bar the height of the title sweeps across…
                        tl.to(this.transitionOverlay, {
                            "--clip": `polygon(0% ${top}%, 100% ${top}%, 100% ${bottom}%, 0% ${bottom}%)`,
                        });

                        // …the destination rises into it…
                        tl.to(
                            this.splitTitleDestination.words,
                            {
                                yPercent: 0,
                                duration: 0.9,
                                ease: "expo.out",
                                stagger: { amount: 0.12 },
                            },
                            0.35,
                        );

                        // …then it opens to cover the screen while the old
                        // page drifts away behind it.
                        tl.to(
                            this.transitionOverlay,
                            { "--clip": CLIP_FULL },
                            0.8,
                        );

                        if (!this.fromMenu) {
                            tl.to(
                                data.current.container,
                                { y: -50, ease: "expo.inOut" },
                                "<",
                            );
                        }

                        return new Promise((resolve) => {
                            tl.call(() => {
                                this.contentObserver?.disconnect();
                                this.motionTexts.destroy();
                                this.resetMenu();
                                this.updateFrame(data.next.url.path);
                                tl.kill();
                                resolve();
                            });
                        });
                    },

                    after: (data) => this.reveal(data.next.container),
                },
            ],
        });
    }

    /* ---------------------------------------------------------------- */
    /* Pointer details                                                  */
    /* ---------------------------------------------------------------- */

    // Feeds the pointer position to the soft light on .card-hover
    initCardLight() {
        window.addEventListener("pointermove", (e) => {
            const card = e.target.closest?.(".card-hover");

            if (!card) return;

            const rect = card.getBoundingClientRect();

            card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
            card.style.setProperty("--my", `${e.clientY - rect.top}px`);
        });
    }

    /* ---------------------------------------------------------------- */

    // Half the title's height as a percentage of the viewport: the height of
    // the bar that sweeps across before the overlay opens.
    getPercentageVerticalClip() {
        const { height } = this.titleDestination.getBoundingClientRect();

        this.percentageVerticalClip =
            (height / 2 / (window.innerHeight / 2)) * 50;
    }

    onResize() {
        this.getPercentageVerticalClip();

        // The menu circle is measured in pixels; let it fill the new size
        if (this.menuState.isOpen && !this.menuTimeline?.isActive()) {
            gsap.set(this.navOverlay, { clipPath: "none" });
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(SplitText, CustomEase);
    gsap.config({ nullTargetWarn: false });

    CustomEase.create("hop", "0.56, 0, 0.35, 0.98");

    // Respect "reduce motion": everything still happens, just near-instantly
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.globalTimeline.timeScale(12);
    }

    const app = new App();

    // Text is split into words/letters, so wait for the real fonts (briefly)
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 1200));

    Promise.race([fontsReady, timeout]).then(() => app.intro());
});
