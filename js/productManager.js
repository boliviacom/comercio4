/**
 * productManager.js
 * Gestiona la carga y renderizado de productos y categorías desde Supabase.
 */

import { supabase } from './supabaseClient.js';

// 🛑 IMPORTACIÓN CLAVE: Importar la función que añade los listeners desde 'carrito.js'
import { agregarListenersCatalogo } from './carrito.js';

// =========================================================================
// FUNCIONES DE APOYO (HELPERS) PARA CALIFICACIÓN DINÁMICA
// =========================================================================

/**
 * ⭐ Genera el HTML de las estrellas dinámicamente basado en el promedio de la vista.
 */
const renderStars = (rating) => {
    const numericRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = (numericRating % 1) >= 0.5;
    let starsHtml = '<span class="text-yellow-400 text-xs flex">';

    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHtml += '<span class="material-icons text-sm">star</span>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            starsHtml += '<span class="material-icons text-sm">star_half</span>';
        } else {
            starsHtml += '<span class="material-icons text-sm text-gray-300">star</span>';
        }
    }

    starsHtml += '</span>';
    return `${starsHtml} <span class="text-xs text-gray-400">(${numericRating.toFixed(1)})</span>`;
};

// =========================================================================
// PLANTILLAS HTML (TEMPLATES)
// =========================================================================

/**
 * 🎨 Plantilla de la tarjeta de producto principal (Catálogo y Nuevos Ingresos).
 */
const productCardTemplate = (product) => {
    // La vista v_producto_estadisticas usa 'producto_id'
    const productId = product.producto_id || product.id;
    
    // Mantenemos tu lógica, pero aseguramos que use el campo de la vista v_producto_estadisticas
    const categoryName = product.nombre_categoria || (product.id_categoria?.nombre || 'General');
    
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${productId}`;
    const showPrice = product.mostrar_precio;

    const imageUrl = (product.imagen_url && typeof product.imagen_url === 'string' && product.imagen_url.trim() !== '')
        ? product.imagen_url
        : 'PLACEHOLDER_ICON';

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
    }

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
                    ${renderStars(product.promedio_estrellas)}
                </div>
                <div class="mt-auto flex items-center justify-between">
                    ${showPrice
            ? `<div class="flex flex-col">
                                <span class="text-lg font-bold text-primary">Bs ${finalPrice}</span>
                            </div>
                            <button data-product-id="${productId}"
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
    const productId = product.producto_id || product.id;
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${productId}`;
    const showPrice = product.mostrar_precio;

    const imageUrl = (product.imagen_url && typeof product.imagen_url === 'string' && product.imagen_url.trim() !== '')
        ? product.imagen_url
        : null;

    return `
        <a class="flex items-start gap-4 group cursor-pointer" href="${linkHref}">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-primary/40 flex-shrink-0 overflow-hidden relative">
                ${imageUrl
            ? `<img src="${imageUrl}" alt="${product.nombre}" class="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"/>`
            : `<span class="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">package_2</span>`
        }
            </div>
            <div>
                <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors line-clamp-2">
                    ${product.nombre}</h4>
                <div class="flex items-center gap-1 mt-1">
                    ${renderStars(product.promedio_estrellas)}
                </div>
                ${showPrice
            ? `<span class="text-primary font-bold text-sm block mt-1">Bs ${finalPrice}</span>`
            : `<span class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mt-1">Consultar Precio</span>`}
            </div>
        </a>
    `;
};

/**
 * 🏷️ Plantilla de la tarjeta de categoría para el carrusel.
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
    }

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

const categoryNavLinkTemplate = (category) => {
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

async function loadNewArrivals() {
    const container = document.querySelector('.lg\\:col-span-3 .grid:last-of-type');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 lg:col-span-3">Cargando productos...</p>';

    try {
        let { data: products, error } = await supabase
            .from('v_producto_estadisticas') 
            .select('*')
            .eq('visible', true)
            .order('producto_id', { ascending: true })
            .limit(10);

        if (error) throw error;
        container.innerHTML = products.map(productCardTemplate).join('');

    } catch (e) {
        console.error('Error loadNewArrivals:', e);
        container.innerHTML = '<p class="text-center text-red-500 lg:col-span-3">Error al cargar productos.</p>';
    }
}

async function loadBestSellers() {
    const container = document.getElementById('best-sellers-container');
    if (!container) return;

    try {
        let { data: products, error } = await supabase
            .from('v_productos_mas_vendidos') 
            .select('*')
            .eq('visible', true)
            .limit(3);

        if (error) throw error;
        container.innerHTML = products.map(sidebarProductCardTemplate).join('');

    } catch (e) {
        console.error('Error loadBestSellers:', e);
    }
}

async function loadPopularCategories() {
    const container = document.getElementById('categories-wrapper');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-gray-500 w-full p-4">Cargando categorías...</p>';

    try {
        let { data: categories, error } = await supabase
            .from('categoria')
            .select('id, nombre, visible, id_padre') // Mantenemos tu select
            .eq('visible', true)
            .is('id_padre', null) // 🚩 Solo agregamos este filtro para que en la Home solo salgan los padres
            .order('nombre', { ascending: true });

        if (error) throw error;
        container.innerHTML = categories.map(categoryCardTemplate).join('');
        setupCategoriesCarousel(categories.length);
    } catch (e) {
        console.error('Error loadPopularCategories:', e);
    }
}

async function loadNavigationCategories() {
    const dropdownContainer = document.getElementById('dropdown-links-container');
    const mobileContainer = document.getElementById('mobile-categories-links');
    if (!dropdownContainer && !mobileContainer) return;

    try {
        let { data: categories, error } = await supabase
            .from('categoria')
            .select('id, nombre, visible, id_padre') // Mantenemos tu select
            .eq('visible', true)
            .is('id_padre', null) // 🚩 Solo agregamos este filtro para que en el Nav solo salgan los padres
            .order('nombre', { ascending: true });

        if (error) throw error;
        const linksHtml = categories.map(categoryNavLinkTemplate).join('');
        if (dropdownContainer) dropdownContainer.innerHTML = linksHtml;
        if (mobileContainer) {
            mobileContainer.innerHTML = categories.map(c =>
                `<a class="block text-gray-600 dark:text-gray-300 hover:text-primary transition-colors text-sm font-medium py-1.5" href="productos.html?categoria=${encodeURIComponent(c.nombre)}">${c.nombre}</a>`
            ).join('');
        }
    } catch (e) {
        console.error('Error loadNavigationCategories:', e);
    }
}

// =========================================================================
// LÓGICA DEL CARRUSEL (MANTENIENDO LÓGICA ORIGINAL SIN CAMBIOS)
// =========================================================================

function setupCategoriesCarousel(totalItems) {
    const wrapper = document.getElementById('categories-wrapper');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const pagination = document.getElementById('categories-pagination');

    if (!wrapper || !prevBtn || !nextBtn || !pagination || totalItems === 0) return;

    let currentIndex = 0;

    const calculateItemsPerView = () => {
        const width = window.innerWidth;
        if (width >= 1280) return 5;
        if (width >= 1024) return 4;
        if (width >= 640) return 3;
        return 2;
    };

    const updateCarousel = () => {
        const itemsPerView = calculateItemsPerView();

        if (totalItems <= itemsPerView) {
            wrapper.classList.remove('flex', 'transition-transform', 'duration-500', 'ease-in-out');
            wrapper.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            pagination.innerHTML = '';
            wrapper.style.transform = 'translateX(0%)';
            return;
        }

        wrapper.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
        wrapper.classList.add('flex', 'transition-transform', 'duration-500', 'ease-in-out');
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');

        const maxIndex = totalItems - itemsPerView;
        const totalPages = Math.ceil(totalItems / itemsPerView);

        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex > maxIndex) currentIndex = maxIndex;

        const itemWidth = 100 / itemsPerView;
        wrapper.style.transform = `translateX(-${currentIndex * itemWidth}%)`;

        prevBtn.classList.toggle('opacity-0', currentIndex === 0);
        prevBtn.classList.toggle('pointer-events-none', currentIndex === 0);
        nextBtn.classList.toggle('opacity-0', currentIndex >= maxIndex);
        nextBtn.classList.toggle('pointer-events-none', currentIndex >= maxIndex);

        pagination.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const startItemIndex = i * itemsPerView;
            const isCurrentDot = currentIndex >= startItemIndex && (currentIndex < startItemIndex + itemsPerView || i === totalPages - 1 && currentIndex >= startItemIndex);
            const dot = document.createElement('button');
            dot.className = `w-2 h-2 rounded-full transition-colors duration-300 ${isCurrentDot ? 'bg-primary' : 'bg-gray-300 hover:bg-primary/50'}`;
            dot.onclick = () => { currentIndex = (i === totalPages - 1) ? maxIndex : startItemIndex; updateCarousel(); };
            pagination.appendChild(dot);
        }
    };

    prevBtn.onclick = () => { currentIndex -= calculateItemsPerView(); updateCarousel(); };
    nextBtn.onclick = () => { currentIndex += calculateItemsPerView(); updateCarousel(); };

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateCarousel, 250);
    });

    updateCarousel();
}

// =========================================================================
// LÓGICA DE INICIO
// =========================================================================

async function initGlobalNavigation() {
    await loadNavigationCategories();
}

async function initHomePageContent() {
    await loadPopularCategories();
    await loadNewArrivals();
    await loadBestSellers();
    agregarListenersCatalogo();
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalNavigation();
    if (document.getElementById('categories-wrapper')) {
        initHomePageContent();
    }
});

export { loadNewArrivals, loadBestSellers, loadPopularCategories };
