document.addEventListener("DOMContentLoaded", function () {
  const menuButtons = document.querySelectorAll(".menu-button");

  menuButtons.forEach(button => {
    const menu = button.nextElementSibling;

    if (menu && menu.classList.contains("menu")) {
      button.addEventListener("click", function () {
        const isActive = button.classList.contains("active");
        document.querySelectorAll(".menu-button").forEach(btn => {
          btn.classList.remove("active");
          const nextMenu = btn.nextElementSibling;
          if (nextMenu && nextMenu.classList.contains("menu")) {
            nextMenu.style.display = "none";
          }
        });

        if (!isActive) {
          button.classList.add("active");
          menu.style.display = "block";
        }
      });
    }
  });
});
