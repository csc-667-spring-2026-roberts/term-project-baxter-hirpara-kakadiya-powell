document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
  btn.addEventListener("click", () => btn.parentElement.classList.toggle("open"));
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown"))
    document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
});

document.querySelectorAll(".flash").forEach((el) => {
  el.addEventListener("animationend", () => el.remove());
});

// vim: set ts=2 sw=2 sts=2 noet filetype=javascript:
