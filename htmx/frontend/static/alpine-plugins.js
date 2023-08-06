document.addEventListener("alpine:init", () => {
  Alpine.magic("scrollto", () => (el) => {
    if (!el) {
      debugger;
      el = $el;
    }

    el.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  });
});
