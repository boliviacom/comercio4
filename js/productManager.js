import { supabase } from './supabaseClient.js';

// 🛑 IMPORTACIÓN CLAVE: Importar la función que añade los listeners desde 'carrito.js'
import { agregarListenersCatalogo } from './carrito.js';
// Asegúrate de que esta línea esté comentada o eliminada si no usas esta clase aquí.
// import { Producto } from './models/Producto.js'; 

/**
 * 🎨 Plantilla de la tarjeta de producto principal.
 * @param {Object} product - Objeto producto retornado por el SELECT estándar.
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

    let placeholderIcon = 'nutrition';
    switch (categoryName.toLowerCase()) {
        case 'verduras':
            placeholderIcon = 'eco';
            break;
        case 'lácteos & huevos':
            placeholderIcon = 'egg_alt';
            break;
        case 'panadería':
            placeholderIcon = 'bakery_dining';
            break;
        default:
            placeholderIcon = 'nutrition';
    }

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
                <div class="bg-background-light dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center overflow-hidden relative">
                    ${imageUrl === 'PLACEHOLDER_ICON'
            ? `<span class="material-symbols-outlined text-primary/30 text-8xl group-hover:scale-105 transition-transform duration-500">${placeholderIcon}</span>`
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
 * 📦 Carga y renderiza los productos en la sección "Nuevos Ingresos".
 * @returns {Promise<void>}
 */
async function loadNewArrivals() {
    const container = document.querySelector('.lg\\:col-span-3 .grid');

    if (!container) {
        console.warn("Contenedor de 'Nuevos Ingresos' no encontrado.");
        return;
    }

    // Mostrar mensaje de carga
    container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 lg:col-span-3">Cargando productos...</p>';

    try {
        let { data: products, error } = await supabase
            .from('producto')
            // Se seleccionan las columnas clave y la categoría anidada para la plantilla principal
            .select('*, id_categoria(nombre)')
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

        console.log('PRODUCTOS OBTENIDOS DE SUPABASE (Primeros 10):', products.length);

        const productsHtml = products.map(productCardTemplate).join('');
        container.innerHTML = productsHtml;

    } catch (e) {
        console.error('Excepción al cargar productos:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 lg:col-span-3">Ocurrió un error inesperado.</p>';
    }
}


// =========================================================================
// CÓDIGO ACTUALIZADO: CARGAR PRIMEROS 3 PRODUCTOS (BARRA LATERAL)
// =========================================================================


/**
 * 🥇 Plantilla de la tarjeta de producto pequeño para la barra lateral.
 * @param {Object} product - Objeto producto retornado.
 */
const sidebarProductCardTemplate = (product) => {
    // Los datos provienen de una consulta estándar (no RPC)
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${product.id}`;
    const showPrice = product.mostrar_precio;
    // ... (el resto de la lógica de sidebarProductCardTemplate es idéntica) ...
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

    // 🛑 Nota: Se añade el botón de carrito al final de la tarjeta lateral (con botón invisible)
    // O puedes añadirlo en el contenedor si quieres que sea cliqueable.
    // Por simplicidad y formato lateral, mantendremos el enlace directo y haremos la tarjeta entera cliqueable.

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
 * 🏆 Carga y renderiza los primeros 3 productos de la tabla 'producto'.
 * @returns {Promise<void>}
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
            // Se seleccionan solo las columnas que necesita la plantilla sidebarProductCardTemplate
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

        console.log('PRIMEROS 3 PRODUCTOS OBTENIDOS DE SUPABASE:', products.length);

        const productsHtml = products.map(sidebarProductCardTemplate).join('');
        container.innerHTML = productsHtml;

    } catch (e) {
        console.error('Excepción al cargar productos:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400 text-sm">Ocurrió un error inesperado al cargar productos.</p>';
    }
}


// =========================================================================
// LÓGICA DE INICIO (FUNCIÓN ÚNICA PARA GARANTIZAR LA CARGA DE LISTENERS)
// =========================================================================

async function initProductManager() {
    // 1. Esperar a que los productos principales y de barra lateral se carguen.
    await loadNewArrivals();
    await loadBestSellers();

    // 2. Ejecutar la función para añadir listeners A TODOS los botones 'add-to-cart-btn'.
    agregarListenersCatalogo();

    console.log('Product Manager Inicializado y Listeners de Carrito Agregados.');
}


document.addEventListener('DOMContentLoaded', () => {
    // Llamar a la función de inicialización principal solo en index.html
    // productos.js tiene su propia lógica de DOMContentLoaded
    if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
        initProductManager();
    }
});


export { loadNewArrivals, loadBestSellers };