const carousel = document.querySelector('.carousel');
const slides = document.querySelectorAll('.carousel-slide');
const prevButton = document.querySelector('.prev');
const nextButton = document.querySelector('.next');

let index = 0;

// Función para mostrar la diapositiva actual
const showSlide = () => {
  carousel.style.transform = `translateX(-${index * 100}%)`;
};

// Botón Siguiente
nextButton.addEventListener('click', () => {
  index = (index + 1) % slides.length; // Avanza al siguiente, vuelve al inicio si es el último
  showSlide();
});

// Botón Anterior
prevButton.addEventListener('click', () => {
  index = (index - 1 + slides.length) % slides.length; // Regresa al anterior, va al final si es el primero
  showSlide();
});

// Autoplay: Cambia automáticamente cada 5 segundos
setInterval(() => {
  index = (index + 1) % slides.length; // Cicla entre las imágenes
  showSlide();
}, 5000); // Ajusta el tiempo del autoplay aquí
