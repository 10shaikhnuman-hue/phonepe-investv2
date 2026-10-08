// Offers accordion: one row open at a time.
document.querySelectorAll("[data-accordion]").forEach((accordion) => {
  const items = accordion.querySelectorAll(".accordion__item");
  items.forEach((item) => {
    item.querySelector(".accordion__head").addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".accordion__head").setAttribute("aria-expanded", "false");
      });
      if (willOpen) {
        item.classList.add("is-open");
        item.querySelector(".accordion__head").setAttribute("aria-expanded", "true");
      }
    });
  });
});

// Product ticker: duplicate the row so the marquee loops seamlessly.
document.querySelectorAll(".ticker__track").forEach((track) => {
  const row = track.querySelector(".ticker__row");
  const copies = 3;
  for (let i = 0; i < copies; i++) {
    const clone = row.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  }
});

// Sign-up form: format as "XXXXX XXXXX" and validate 10 digits.
document.querySelectorAll(".signup-form").forEach((form) => {
  const input = form.querySelector('input[type="tel"]');
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 10);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
    form.classList.remove("is-invalid");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const valid = input.value.replace(/\D/g, "").length === 10;
    form.classList.toggle("is-invalid", !valid);
    if (!valid) input.focus();
  });
});
