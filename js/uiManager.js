/**
 * uiManager.js
 * Contiene la lógica de JavaScript para la interactividad de la UI,
 * incluyendo el menú desplegable de categorías (escritorio) y el
 * menú hamburguesa (móvil).
 */

function setupUIToggles() {
    // ---------------------------------------------------------
    // 1. Category Dropdown Toggle (Vista Escritorio)
    // ---------------------------------------------------------
    const categoryToggle = document.getElementById('categories-toggle');
    const categoryDropdown = document.getElementById('categories-dropdown-menu');
    const categoryArrow = document.getElementById('categories-arrow');

    if (categoryToggle && categoryDropdown) {
        const toggleDropdown = () => {
            const isHidden = categoryDropdown.classList.toggle('hidden');
            
            // Animaciones de escala y opacidad
            categoryDropdown.classList.toggle('scale-100', !isHidden);
            categoryDropdown.classList.toggle('scale-95', isHidden);
            categoryDropdown.classList.toggle('opacity-100', !isHidden);
            categoryDropdown.classList.toggle('opacity-0', isHidden);
            
            if (categoryArrow) {
                categoryArrow.classList.toggle('rotate-180', !isHidden);
            }

            if (!isHidden) {
                // Si se abre, añadir listener para cerrar al hacer clic fuera
                setTimeout(() => { 
                    document.addEventListener('click', closeDropdownOnOutsideClick);
                }, 50);
            } else {
                document.removeEventListener('click', closeDropdownOnOutsideClick);
            }
        };

        const closeDropdownOnOutsideClick = (event) => {
            if (!categoryToggle.contains(event.target) && !categoryDropdown.contains(event.target)) {
                categoryDropdown.classList.add('hidden', 'scale-95', 'opacity-0');
                categoryDropdown.classList.remove('scale-100', 'opacity-100');
                if (categoryArrow) categoryArrow.classList.remove('rotate-180');
                document.removeEventListener('click', closeDropdownOnOutsideClick);
            }
        };

        categoryToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });
    }

    // ---------------------------------------------------------
    // 2. Mobile Menu Toggle (Panel Hamburguesa)
    // ---------------------------------------------------------
    const mobileMenuOpenButton = document.getElementById('mobile-menu-open-button');
    const mobileMenuCloseButton = document.getElementById('mobile-menu-close-button');
    const mobileMenuPanel = document.getElementById('mobile-menu-panel');
    
    // Referencia al contenedor del buscador principal en el header
    // IMPORTANTE: Asegúrate de añadir la clase 'main-search-container' en tu index.html
    const mainSearchContainer = document.querySelector('.main-search-container');

    if (mobileMenuOpenButton && mobileMenuCloseButton && mobileMenuPanel) {
        
        // Función para ABRIR el menú móvil
        const openMobileMenu = () => {
            // 1. Mostrar Panel (quitar el display none)
            mobileMenuPanel.classList.remove('hidden');
            
            // 2. OCULTAR buscador principal para evitar que se sobreponga
            if (mainSearchContainer) {
                mainSearchContainer.classList.add('opacity-0', 'pointer-events-none', 'invisible');
            }

            // 3. Cambiar icono del botón principal
            const icon = mobileMenuOpenButton.querySelector('.material-icons');
            if (icon) icon.textContent = 'close';
            
            mobileMenuOpenButton.setAttribute('aria-expanded', 'true');

            // 4. Iniciar transición (delay mínimo para que el navegador detecte el cambio de 'hidden')
            setTimeout(() => {
                mobileMenuPanel.classList.remove('-translate-y-full', 'opacity-0');
                mobileMenuPanel.classList.add('translate-y-0', 'opacity-100');
            }, 10); 
        };

        // Función para CERRAR el menú móvil
        const closeMobileMenu = () => {
            // 1. Iniciar transición de salida
            mobileMenuPanel.classList.remove('translate-y-0', 'opacity-100');
            mobileMenuPanel.classList.add('-translate-y-full', 'opacity-0');
            
            // 2. MOSTRAR el buscador principal de nuevo
            if (mainSearchContainer) {
                mainSearchContainer.classList.remove('opacity-0', 'pointer-events-none', 'invisible');
            }

            // 3. Restaurar icono de hamburguesa
            const icon = mobileMenuOpenButton.querySelector('.material-icons');
            if (icon) icon.textContent = 'menu';
            
            mobileMenuOpenButton.setAttribute('aria-expanded', 'false');

            // 4. Ocultar físicamente después de la animación (300ms)
            setTimeout(() => {
                mobileMenuPanel.classList.add('hidden');
            }, 300); 
        };

        // Eventos de clic
        mobileMenuOpenButton.addEventListener('click', () => {
            const isCurrentlyOpen = mobileMenuOpenButton.getAttribute('aria-expanded') === 'true';
            if (isCurrentlyOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
        
        mobileMenuCloseButton.addEventListener('click', closeMobileMenu);

        // ---------------------------------------------------------
        // 3. Sincronización de enlaces de navegación al móvil
        // ---------------------------------------------------------
        const mainNavLinks = document.getElementById('main-nav-links');
        const mobileNavContainer = document.getElementById('mobile-nav-links');

        if (mainNavLinks && mobileNavContainer) {
            mobileNavContainer.innerHTML = Array.from(mainNavLinks.children).map(link => {
                let clonedLink = link.cloneNode(true);
                
                // Limpiar clases de escritorio y poner las de móvil
                clonedLink.className = 'block px-4 py-3 text-base font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors';

                // Quitar efectos visuales específicos de escritorio (como el span de subrayado)
                const hoverLine = clonedLink.querySelector('span.absolute');
                if (hoverLine) {
                    hoverLine.remove();
                }

                return clonedLink.outerHTML;
            }).join('');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', setupUIToggles);