/**
 * uiManager.js
 * * Contiene la lógica de JavaScript para la interactividad de la UI,
 * incluyendo el menú desplegable de categorías (escritorio) y el
 * menú hamburguesa (móvil).
 */

function setupUIToggles() {
    // 1. Category Dropdown Toggle
    const categoryToggle = document.getElementById('categories-toggle');
    const categoryDropdown = document.getElementById('categories-dropdown-menu');
    const categoryArrow = document.getElementById('categories-arrow');

    if (categoryToggle && categoryDropdown) {
        const toggleDropdown = () => {
            // El estado 'isHidden' es true si la clase 'hidden' existe.
            const isHidden = categoryDropdown.classList.toggle('hidden');
            
            // Toggle classes for smooth transition
            categoryDropdown.classList.toggle('scale-100', !isHidden);
            categoryDropdown.classList.toggle('scale-95', isHidden);
            categoryDropdown.classList.toggle('opacity-100', !isHidden);
            categoryDropdown.classList.toggle('opacity-0', isHidden);
            categoryArrow.classList.toggle('rotate-180', !isHidden);

            if (!isHidden) {
                // Abrir: Añadir listener para cerrar al hacer clic afuera
                setTimeout(() => { 
                    document.addEventListener('click', closeDropdownOnOutsideClick);
                }, 50);
            } else {
                // Cerrar: Remover listener
                document.removeEventListener('click', closeDropdownOnOutsideClick);
            }
        };

        const closeDropdownOnOutsideClick = (event) => {
            if (!categoryToggle.contains(event.target) && !categoryDropdown.contains(event.target)) {
                categoryDropdown.classList.add('hidden', 'scale-95', 'opacity-0');
                categoryDropdown.classList.remove('scale-100', 'opacity-100');
                categoryArrow.classList.remove('rotate-180');
                document.removeEventListener('click', closeDropdownOnOutsideClick);
            }
        };

        categoryToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });
    }

    // 2. Mobile Menu Toggle (Panel que se abre desde arriba)
    // Usando los IDs actualizados en el HTML
    const mobileMenuOpenButton = document.getElementById('mobile-menu-open-button');
    const mobileMenuCloseButton = document.getElementById('mobile-menu-close-button');
    const mobileMenuPanel = document.getElementById('mobile-menu-panel');

    if (mobileMenuOpenButton && mobileMenuCloseButton && mobileMenuPanel) {
        
        // Función principal para abrir
        const openMobileMenu = () => {
            // 1. Mostrar Panel (eliminar hidden)
            mobileMenuPanel.classList.remove('hidden');
            
            // 2. Cambiar Íconos y Estado de Accesibilidad
            // El botón de apertura se vuelve 'close' (la 'X')
            mobileMenuOpenButton.querySelector('.material-icons').textContent = 'close';
            // El botón de cerrar dentro del panel ya tiene 'close' en HTML, lo aseguramos
            mobileMenuCloseButton.querySelector('.material-icons').textContent = 'close';
            
            mobileMenuOpenButton.setAttribute('aria-expanded', 'true');

            // 3. Iniciar transición
            setTimeout(() => {
                mobileMenuPanel.classList.remove('-translate-y-full', 'opacity-0');
                mobileMenuPanel.classList.add('translate-y-0', 'opacity-100');
            }, 10); 
        };

        // Función principal para cerrar
        const closeMobileMenu = () => {
            // 1. Iniciar transición de ocultamiento
            mobileMenuPanel.classList.remove('translate-y-0', 'opacity-100');
            mobileMenuPanel.classList.add('-translate-y-full', 'opacity-0');
            
            // 2. Cambiar Íconos y Estado de Accesibilidad
            // El botón de apertura vuelve a ser 'menu' (la hamburguesa)
            mobileMenuOpenButton.querySelector('.material-icons').textContent = 'menu';
            mobileMenuOpenButton.setAttribute('aria-expanded', 'false');

            // 3. Ocultar físicamente el panel después de que termine la transición CSS (300ms)
            setTimeout(() => {
                mobileMenuPanel.classList.add('hidden');
            }, 300); 
        };

        // Escuchadores de eventos
        // 1. Botón de la barra de navegación (abre/cierra)
        mobileMenuOpenButton.addEventListener('click', () => {
            const isCurrentlyOpen = mobileMenuOpenButton.getAttribute('aria-expanded') === 'true';
            if (isCurrentlyOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
        
        // 2. Botón dentro del panel (siempre cierra)
        mobileMenuCloseButton.addEventListener('click', closeMobileMenu);


        // 3. Copiar enlaces de navegación principal a mobile menu
        const mainNavLinks = document.getElementById('main-nav-links');
        const mobileNavContainer = document.getElementById('mobile-nav-links');

        if (mainNavLinks && mobileNavContainer) {
            mobileNavContainer.innerHTML = Array.from(mainNavLinks.children).map(link => {
                let clonedLink = link.cloneNode(true);
                // Remover clases de escritorio
                clonedLink.classList.remove('text-white', 'hover:text-white/90', 'hover:bg-white/10', 'px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium', 'relative');
                // Añadir clases de móvil
                clonedLink.classList.add('block', 'px-4', 'py-3', 'text-base', 'font-medium', 'text-gray-800', 'dark:text-gray-200', 'hover:bg-gray-100', 'dark:hover:bg-gray-700', 'rounded-lg');

                // Eliminar el span de la línea de hover
                const hoverLine = clonedLink.querySelector('span:last-child');
                if (hoverLine && hoverLine.classList.contains('absolute')) {
                    hoverLine.remove();
                }

                return clonedLink.outerHTML;
            }).join('');
        }
    }
}

// Inicializar la gestión de la UI al cargar el documento
document.addEventListener('DOMContentLoaded', setupUIToggles);