const select = (selector) => document.querySelector(selector);
const selectAll = (selector) => document.querySelectorAll(selector);

// Top-level pages, in menu order. Drives the menu, the header label and the
// page counter in the footer.
const PAGES = [
  { path: "/", title: "Home" },
  { path: "/experience", title: "Experience" },
  { path: "/education", title: "Education" },
  { path: "/projects", title: "Projects" },
];

const normalizePath = (path = "/") =>
  path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

// "/projects/kimberly" -> { title: "Kimberly", index: "04", section: "/projects" }
const pageMeta = (path = "/") => {
  const segments = normalizePath(path).split("/").filter(Boolean);
  const slug = segments[segments.length - 1];
  const section = `/${segments[0] ?? ""}`;
  const position = PAGES.findIndex((page) => page.path === section);

  const title = slug
    ? decodeURIComponent(slug)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Home";

  return {
    title,
    section,
    index: String(Math.max(position, 0) + 1).padStart(2, "0"),
    total: String(PAGES.length).padStart(2, "0"),
  };
};

const setClassSplitText = (type) => {
  return type === "lines"
    ? {
        linesClass: "lines",
      }
    : type === "words"
      ? {
          wordsClass: "words",
        }
      : {
          charsClass: "chars",
        };
};

export {
  select,
  selectAll,
  setClassSplitText,
  PAGES,
  normalizePath,
  pageMeta,
};
