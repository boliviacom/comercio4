/**
 * productManager.js
 * Gestiona la carga y renderizado de productos y categorías desde Supabase.
 */

import { supabase } from './supabaseClient.js';

// 🛑 IMPORTACIÓN CLAVE: Importar la función que añade los listeners desde 'carrito.js'
import { agregarListenersCatalogo } from './carrito.js';

// =========================================================================
// PLANTILLAS HTML (TEMPLATES)
// =========================================================================

/**
 * 🎨 Plantilla de la tarjeta de producto principal (Catálogo y Nuevos Ingresos).
 * @param {Object} product - Objeto producto retornado de Supabase.
 */
const productCardTemplate = (product) => {
    // La carga principal usa la relación anidada (id_categoria.nombre)
    const categoryName = product.id_categoria?.nombre || 'General';
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${product.id}`;
    const showPrice = product.mostrar_precio;

    const imageUrl = (product.imagen_url && typeof product.imagen_url === 'string' && product.imagen_url.trim() !== '')
        ? product.imagen_url
        : 'PLACEHOLDER_ICON';

    // Lógica para asignar placeholder y colores
    let placeholderIcon = 'nutrition';
    let placeholderColorClass = 'text-primary/30';
    let bgClass = 'bg-background-light dark:bg-gray-800';

    switch (categoryName.toLowerCase()) {
        case 'verduras':
            placeholderIcon = 'eco';
            placeholderColorClass = 'text-green-500/30';
            bgClass = 'bg-green-100 dark:bg-gray-800';
            break;
        case 'lácteos & huevos':
            placeholderIcon = 'egg_alt';
            placeholderColorClass = 'text-yellow-500/30';
            bgClass = 'bg-yellow-100 dark:bg-gray-800';
            break;
        case 'panadería':
            placeholderIcon = 'bakery_dining';
            placeholderColorClass = 'text-amber-500/30';
            bgClass = 'bg-amber-100 dark:bg-gray-800';
            break;
        default:
        // Valores por defecto ya definidos
    }

    // Rating estático de ejemplo
    const starsHtml = `
        <span class="text-yellow-400 text-xs flex">
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm text-gray-300">star</span>
        </span>
        <span class="text-xs text-gray-400">(4.0)</span> 
    `;

    return `
        <div class="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group flex flex-col">
            <div class="relative p-4 flex-shrink-0">
                <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10">
                    <span class="material-icons">favorite_border</span>
                </button>
                <div class="rounded-lg aspect-square flex items-center justify-center overflow-hidden relative ${bgClass}">
                    ${imageUrl === 'PLACEHOLDER_ICON'
            ? `<span class="material-symbols-outlined ${placeholderColorClass} text-8xl group-hover:scale-105 transition-transform duration-500">${placeholderIcon}</span>`
            : `<img src="${imageUrl}" alt="${product.nombre}" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>`}
                </div>
            </div>
             
            <div class="px-4 pb-4 flex flex-col flex-grow">
                <div class="mb-2">
                    <span class="text-xs text-gray-400 font-medium">${categoryName}</span>
                    <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 h-12 group-hover:text-primary transition-colors cursor-pointer"
                        onclick="window.location.href='${linkHref}'">
                        ${product.nombre}
                    </h3>
                </div>
                <div class="flex items-center gap-1 mb-3">
                    ${starsHtml}
                </div>
                <div class="mt-auto flex items-center justify-between">
                    ${showPrice
            ? `<div class="flex flex-col">
                                <span class="text-lg font-bold text-primary">Bs ${finalPrice}</span>
                            </div>
                            <button data-product-id="${product.id}"
                                class="add-to-cart-btn bg-secondary/20 hover:bg-primary hover:text-white text-primary rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300">
                                <span class="material-icons text-xl">add_shopping_cart</span>
                            </button>`
            : `<span class="text-sm font-semibold text-gray-600">Consultar Precio</span>`}
                    
                </div>
            </div>
        </div>
    `;
};


/**
 * 🥇 Plantilla de la tarjeta de producto pequeño para la barra lateral ('Los Más Vendidos').
 */
const sidebarProductCardTemplate = (product) => {
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${product.id}`;
    const showPrice = product.mostrar_precio;

    const imageUrl = (product.imagen_url && typeof product.imagen_url === 'string' && product.imagen_url.trim() !== '')
        ? product.imagen_url
        : null;

    // Rating estático
    const starsHtml = `
        <span class="text-xs text-yellow-400 flex">
            <span class="material-icons text-[10px]">star</span>
            <span class="material-icons text-[10px]">star</span>
            <span class="material-icons text-[10px]">star</span>
            <span class="material-icons text-[10px]">star</span>
            <span class="material-icons text-[10px]">star_half</span>
        </span>
    `;

    return `
        <a class="flex items-start gap-4 group cursor-pointer" href="${linkHref}">
            <div
                class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-primary/40 flex-shrink-0 overflow-hidden relative">
                ${imageUrl
            ? `<img src="${imageUrl}" alt="${product.nombre}" class="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"/>`
            : `<span class="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">package_2</span>`
        }
            </div>
            <div>
                <h4
                    class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors line-clamp-2">
                    ${product.nombre}</h4>
                <div class="flex items-center gap-1 mt-1">
                    ${starsHtml}
                </div>
                ${showPrice
            ? `<span class="text-primary font-bold text-sm block mt-1">Bs ${finalPrice}</span>`
            : `<span class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mt-1">Consultar Precio</span>`}
            </div>
        </a>
    `;
};


/**
 * 🏷️ Plantilla de la tarjeta de categoría para el carrusel ('Categorías Populares').
 * @param {Object} category - Objeto categoría retornado (id, nombre).
 */
const categoryCardTemplate = (category) => {
    let icon = 'grocery';
    let iconClass = 'text-gray-400';
    let bgClass = 'bg-gray-200 dark:bg-gray-700';
    let description = 'Productos esenciales';

    switch (category.nombre.toLowerCase()) {
        case 'verduras':
            icon = 'eco';
            iconClass = 'text-green-300';
            bgClass = 'bg-green-100 dark:bg-gray-700';
            description = 'Frescos y nutritivos';
            break;
        case 'superfoods':
            icon = 'local_florist';
            iconClass = 'text-teal-300';
            bgClass = 'bg-teal-100 dark:bg-gray-700';
            description = 'Maca, espirulina, cacao';
            break;
        case 'snacks':
            icon = 'cookie';
            iconClass = 'text-orange-300';
            bgClass = 'bg-orange-100 dark:bg-gray-700';
            description = 'Sin culpa y deliciosos';
            break;
        case 'bebidas':
            icon = 'local_drink';
            iconClass = 'text-blue-300';
            bgClass = 'bg-blue-100 dark:bg-gray-700';
            description = 'Jugos, tés y leches';
            break;
        case 'edulcorantes':
            icon = 'sweet_alert';
            iconClass = 'text-pink-300';
            bgClass = 'bg-pink-100 dark:bg-gray-700';
            description = 'Alternativas al azúcar';
            break;
        case 'panadería':
            icon = 'bakery_dining';
            iconClass = 'text-yellow-300';
            bgClass = 'bg-yellow-100 dark:bg-gray-700';
            description = 'Artesanal y saludable';
            break;
        case 'pastas':
            icon = 'ramen_dining';
            iconClass = 'text-red-300';
            bgClass = 'bg-red-100 dark:bg-gray-700';
            description = 'Variedad de granos';
            break;
        default:
        // Valores por defecto ya definidos
    }

    // ⭐ CORRECCIÓN APLICADA AQUÍ: Usamos el nombre codificado, no el ID.
    const linkHref = `productos.html?categoria=${encodeURIComponent(category.nombre)}`;

    return `
        <a class="category-slide-item flex-shrink-0 w-1/2 sm:w-1/3 lg:w-1/4 xl:w-1/5 p-3"
            href="${linkHref}">
            <div class="group relative rounded-xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                <div class="absolute inset-0 ${bgClass} flex items-center justify-center">
                    <span
                        class="material-symbols-outlined ${iconClass} text-6xl group-hover:scale-110 transition-transform duration-500">${icon}</span>
                </div>
                <div
                    class="absolute bottom-0 left-0 p-4 z-20 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 class="text-white font-bold text-lg md:text-xl mb-1 line-clamp-1">${category.nombre}</h3>
                    <p
                        class="text-gray-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        ${description}</p>
                </div>
            </div>
        </a>
    `;
};


/**
 * 🔗 Plantilla de enlace para el menú desplegable y móvil de categorías.
 * @param {Object} category - Objeto categoría retornado (id, nombre).
 */
const categoryNavLinkTemplate = (category) => {
    // ⭐ CORRECCIÓN APLICADA AQUÍ: Usamos el nombre codificado, no el ID.
    const linkHref = `productos.html?categoria=${encodeURIComponent(category.nombre)}`;
    return `
        <a class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            href="${linkHref}">
            ${category.nombre}
        </a>
    `;
};


// =========================================================================
// FUNCIONES DE CARGA DE DATOS
// =========================================================================

/**
 * 📦 Carga y renderiza los productos en la sección "Nuevos Ingresos".
 */
async function loadNewArrivals() {
    // Selector adaptado a la estructura de tu index.html original
    const container = document.querySelector('.lg\\:col-span-3 .grid:last-of-type');

    if (!container) {
        console.warn("Contenedor de 'Nuevos Ingresos' no encontrado.");
        return;
    }

    container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 lg:col-span-3">Cargando productos...</p>';

    try {
        let { data: products, error } = await supabase
            .from('producto')
            .select('*, id_categoria(nombre)') // Carga la relación para obtener el nombre de la categoría
            .eq('visible', true)
            .order('id', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Error al cargar los productos:', error.message);
            container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 lg:col-span-3">Error al cargar productos.</p>';
            return;
        }

        if (!products || products.length === 0) {
            console.warn('Supabase retornó 0 productos para mostrar.');
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 lg:col-span-3">No hay productos disponibles.</p>';
            return;
        }

        const productsHtml = products.map(productCardTemplate).join('');
        container.innerHTML = productsHtml;

    } catch (e) {
        console.error('Excepción al cargar productos:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 lg:col-span-3">Ocurrió un error inesperado.</p>';
    }
}


/**
 * 🏆 Carga y renderiza los primeros 3 productos de la tabla 'producto' para la barra lateral.
 */
async function loadBestSellers() {
    const container = document.getElementById('best-sellers-container');

    if (!container) {
        console.warn("Contenedor de 'Los Más Vendidos' no encontrado.");
        return;
    }

    try {
        let { data: products, error } = await supabase
            .from('producto')
            .select('id, nombre, precio, imagen_url, mostrar_precio')
            .eq('visible', true)
            .order('id', { ascending: true }) // Ordena por ID para obtener los primeros
            .limit(3);

        if (error) {
            console.error('Error al cargar los primeros productos para la barra lateral:', error.message);
            container.innerHTML = `<p class="text-center text-red-500 dark:text-red-400 text-sm">Error al cargar productos: ${error.message}</p>`;
            return;
        }

        if (!products || products.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 text-sm">No hay productos disponibles para mostrar.</p>';
            return;
        }

        const productsHtml = products.map(sidebarProductCardTemplate).join('');
        container.innerHTML = productsHtml;

    } catch (e) {
        console.error('Excepción al cargar productos:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 text-sm">Ocurrió un error inesperado al cargar productos.</p>';
    }
}


/**
 * 📊 Carga y renderiza todas las categorías visibles para el carrusel.
 */
async function loadPopularCategories() {
    const container = document.getElementById('categories-wrapper');

    if (!container) {
        console.warn("Contenedor de 'Categorías Populares' no encontrado.");
        return;
    }

    container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 w-full p-4">Cargando categorías...</p>';

    try {
        let { data: categories, error } = await supabase
            .from('categoria')
            .select('id, nombre, visible')
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error al cargar las categorías:', error.message);
            container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 w-full p-4">Error al cargar categorías.</p>';
            return;
        }

        if (!categories || categories.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 w-full p-4">No hay categorías disponibles.</p>';
            return;
        }

        const categoriesHtml = categories.map(categoryCardTemplate).join('');
        container.innerHTML = categoriesHtml;

        // Inicializar la lógica del carrusel una vez cargadas
        setupCategoriesCarousel(categories.length);

    } catch (e) {
        console.error('Excepción al cargar categorías:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 w-full p-4">Ocurrió un error inesperado al cargar categorías.</p>';
    }
}


/**
 * 🧭 Carga las categorías y las inyecta en el menú desplegable principal (Desktop)
 * y en el menú de categorías del móvil.
 */
async function loadNavigationCategories() {
    const dropdownContainer = document.getElementById('dropdown-links-container');
    const mobileContainer = document.getElementById('mobile-categories-links');

    if (!dropdownContainer && !mobileContainer) {
        // No es una advertencia grave si la página no tiene ninguno de los menús
        return;
    }

    // Mostramos estado de carga inicial si existen los contenedores
    if (dropdownContainer) dropdownContainer.innerHTML = '<a class="block px-4 py-2 text-sm text-gray-400">Cargando...</a>';
    if (mobileContainer) mobileContainer.innerHTML = '<a class="text-sm text-gray-400">Cargando...</a>';


    try {
        let { data: categories, error } = await supabase
            .from('categoria')
            .select('id, nombre, visible')
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error al cargar las categorías de navegación:', error.message);
            if (dropdownContainer) dropdownContainer.innerHTML = '<a class="block px-4 py-2 text-sm text-red-500">Error al cargar</a>';
            if (mobileContainer) mobileContainer.innerHTML = '<a class="text-sm text-red-500">Error al cargar</a>';
            return;
        }

        if (!categories || categories.length === 0) {
            if (dropdownContainer) dropdownContainer.innerHTML = '<a class="block px-4 py-2 text-sm text-gray-400">No hay categorías</a>';
            if (mobileContainer) mobileContainer.innerHTML = '<a class="text-sm text-gray-400">No hay categorías</a>';
            return;
        }

        const linksHtml = categories.map(categoryNavLinkTemplate).join('');

        // 1. Menú desplegable principal (Desktop)
        if (dropdownContainer) {
            dropdownContainer.innerHTML = linksHtml;
        }

        // 2. Menú de categorías móvil
        if (mobileContainer) {
            mobileContainer.innerHTML = categories.map(c =>
                // ⭐ CORRECCIÓN APLICADA AQUÍ: Usamos el nombre codificado, no el ID.
                `<a class="block text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-secondary transition-colors text-sm font-medium py-1.5" href="productos.html?categoria=${encodeURIComponent(c.nombre)}">
                    ${c.nombre}
                </a>`
            ).join('');
        }

    } catch (e) {
        console.error('Excepción al cargar categorías de navegación:', e);
    }
}

// =========================================================================
// LÓGICA DEL CARRUSEL
// =========================================================================

/**
 * ⚙️ Lógica para inicializar y controlar el carrusel de categorías (movimiento por página).
 * @param {number} totalItems - Número total de categorías.
 */
function setupCategoriesCarousel(totalItems) {
    const wrapper = document.getElementById('categories-wrapper');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const pagination = document.getElementById('categories-pagination');

    if (!wrapper || !prevBtn || !nextBtn || !pagination || totalItems === 0) return;

    let currentIndex = 0; // Índice del primer ítem visible

    // Función para determinar cuántos ítems se muestran a la vez (responsive)
    const calculateItemsPerView = () => {
        const width = window.innerWidth;
        if (width >= 1280) return 5; // Tailwind 'xl' (w-1/5)
        if (width >= 1024) return 4; // Tailwind 'lg' (w-1/4)
        if (width >= 640) return 3; // Tailwind 'sm' (w-1/3)
        return 2;                   // Default (w-1/2)
    };

    /**
     * Actualiza el estado del carrusel (posición, botones y puntos).
     */
    const updateCarousel = () => {
        const itemsPerView = calculateItemsPerView();

        // Si todos los ítems caben en la vista actual, desactivar el carrusel y usar grid.
        if (totalItems <= itemsPerView) {
            wrapper.classList.remove('flex', 'transition-transform', 'duration-500', 'ease-in-out');
            wrapper.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            pagination.innerHTML = '';
            wrapper.style.transform = 'translateX(0%)';
            return;
        }

        // Habilitar modo carrusel
        wrapper.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
        wrapper.classList.add('flex', 'transition-transform', 'duration-500', 'ease-in-out');
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');

        const maxIndex = totalItems - itemsPerView;
        const totalPages = Math.ceil(totalItems / itemsPerView);

        // 1. Asegurar que currentIndex no se salga de los límites
        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex > maxIndex) currentIndex = maxIndex;

        // 2. Calcular la traslación.
        const itemWidth = 100 / itemsPerView;
        wrapper.style.transform = `translateX(-${currentIndex * itemWidth}%)`;


        // 3. Actualizar botones de navegación
        prevBtn.classList.toggle('opacity-0', currentIndex === 0);
        prevBtn.classList.toggle('pointer-events-none', currentIndex === 0);

        nextBtn.classList.toggle('opacity-0', currentIndex >= maxIndex);
        nextBtn.classList.toggle('pointer-events-none', currentIndex >= maxIndex);


        // 4. Actualizar paginación (dots)
        pagination.innerHTML = '';

        // Generar un punto por cada "página" (grupo de itemsPerView)
        for (let i = 0; i < totalPages; i++) {
            const startItemIndex = i * itemsPerView;

            // Determinar qué punto debe estar activo.
            const isCurrentDot = currentIndex >= startItemIndex && (currentIndex < startItemIndex + itemsPerView || i === totalPages - 1 && currentIndex >= startItemIndex);

            const dot = document.createElement('button');

            dot.classList.add(
                'w-2', 'h-2', 'rounded-full', 'transition-colors', 'duration-300',
                isCurrentDot ? 'bg-primary' : 'bg-gray-300',
                isCurrentDot ? 'cursor-default' : 'hover:bg-primary/50'
            );
            dot.dataset.index = startItemIndex;

            dot.addEventListener('click', () => {
                if (i === totalPages - 1) {
                    currentIndex = maxIndex;
                } else {
                    currentIndex = startItemIndex;
                }
                updateCarousel();
            });
            pagination.appendChild(dot);
        }
    };

    // Listeners para las flechas: se mueven por página
    prevBtn.addEventListener('click', () => {
        const itemsPerView = calculateItemsPerView();
        currentIndex -= itemsPerView;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        const itemsPerView = calculateItemsPerView();
        currentIndex += itemsPerView;
        updateCarousel();
    });

    // Listener para redimensionar (Throttle/Debounce)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateCarousel, 250);
    });

    // Inicializar carrusel
    updateCarousel();
}


// =========================================================================
// LÓGICA DE INICIO Y EXPORTACIÓN
// =========================================================================

/**
 * Función que carga SOLO la navegación global (menú de categorías del header).
 */
async function initGlobalNavigation() {
    await loadNavigationCategories();
    console.log('Navegación Global (Categorías) Cargada.');
}

/**
 * Función principal de inicialización para la PÁGINA DE INICIO (index.html).
 * Carga todo el contenido dinámico específico de la landing page.
 */
async function initHomePageContent() {
    // 1. Cargar categorías populares (carrusel)
    await loadPopularCategories();

    // 2. Cargar productos principales y de la barra lateral
    await loadNewArrivals();
    await loadBestSellers();

    // 3. Añadir listeners del carrito a todos los botones 'add-to-cart-btn'
    agregarListenersCatalogo();

    console.log('Contenido de Página de Inicio (index.html) Inicializado.');
}


document.addEventListener('DOMContentLoaded', () => {
    // 🛑 1. EJECUTAR SIEMPRE: Cargar la navegación global (menú de categorías) en TODAS las páginas.
    initGlobalNavigation();

    // 🛑 2. CORRECCIÓN: Detección inteligente para INDEX.HTML
    // Buscamos si el elemento 'categories-wrapper' existe. Si existe, es que estamos en el Index.
    const isHomePage = document.getElementById('categories-wrapper');

    if (isHomePage) {
        initHomePageContent();
    }
});


export { loadNewArrivals, loadBestSellers, loadPopularCategories };