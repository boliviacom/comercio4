import { supabase } from './supabaseClient.js';
import { agregarListenersCatalogo } from './carrito.js';
import { Producto } from './models/Producto.js';

// =========================================================
// CONSTANTES Y CONFIGURACIÓN DE VISTAS (Tailwind CSS Classes)
// =========================================================
const PRODUCTS_PER_PAGE = 15;

// Clases CSS para el contenedor principal de productos
const GRID_VIEW_CLASSES = ['grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-6'];
const LIST_VIEW_CONTAINER_CLASSES = ['space-y-6']; // Utiliza 'space-y' para apilar elementos

// Clases para la tarjeta individual (product-card-item)
const PRODUCT_GRID_CLASSES = ['flex-col', 'shadow-sm', 'border-gray-100', 'dark:border-gray-700'];
const PRODUCT_LIST_CLASSES = [
    // Disposición horizontal (List View)
    'flex-row',
    'gap-6',
    'items-center',
    'border-gray-200',
    'dark:border-gray-700',
    'shadow-md'
];

// Clases para el contenedor de la imagen
const IMAGE_GRID_CLASSES = ['p-4'];
const IMAGE_LIST_CLASSES = [
    'p-4',
    // Ancho fijo para la imagen en vista de lista
    'w-32',
    'sm:w-40',
    'md:w-48',
    'flex-shrink-0' // Evita que la imagen se comprima
];

// Clases para el contenedor del contenido (texto)
const CONTENT_GRID_CLASSES = ['px-4', 'pb-4'];
const CONTENT_LIST_CLASSES = ['px-4', 'pb-4', 'flex-grow']; // Permite que el contenido tome el espacio restante

// Elementos del DOM (se inicializan en initializeViewSwitcher)
let productGridContainer, gridViewButton, listViewButton;


// =========================================================
// LÓGICA DEL CAMBIADOR DE VISTA (GRID/LISTA)
// =========================================================

/** Obtiene todos los elementos de producto actualmente renderizados. */
function getProductElements() {
    return productGridContainer.querySelectorAll('.product-card-item');
}

/** Actualiza la apariencia de los botones del cambiador de vista. */
function updateButtonAppearance(activeButton, inactiveButton) {
    if (!activeButton || !inactiveButton) return;

    // Activar botón
    activeButton.classList.remove('hover:bg-white', 'dark:hover:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
    activeButton.classList.add('bg-white', 'dark:bg-gray-600', 'text-primary', 'shadow-sm');

    // Desactivar botón
    inactiveButton.classList.remove('bg-white', 'dark:bg-gray-600', 'text-primary', 'shadow-sm');
    inactiveButton.classList.add('hover:bg-white', 'dark:hover:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
}

/** 🔄 Cambia la vista a Cuadrícula (Grid). */
function switchToGridView() {
    if (!productGridContainer) return;


    // 1. Cambiar el contenedor principal (de List a Grid)
    productGridContainer.classList.remove(...LIST_VIEW_CONTAINER_CLASSES);
    productGridContainer.classList.add(...GRID_VIEW_CLASSES);

    // 2. Cambiar cada elemento de producto individualmente
    getProductElements().forEach(productEl => {
        const imageWrapper = productEl.querySelector('.product-image-wrapper');
        const contentWrapper = productEl.querySelector('.product-content-wrapper');

        // Tarjeta Principal
        productEl.classList.remove(...PRODUCT_LIST_CLASSES);
        productEl.classList.add(...PRODUCT_GRID_CLASSES);
        productEl.classList.remove('p-4'); // Quitar padding de Lista
        productEl.classList.add('p-0');    // Poner padding de Grid (se pasa a wrappers)

        // Contenedor de Imagen
        if (imageWrapper) {
            imageWrapper.classList.remove(...IMAGE_LIST_CLASSES);
            imageWrapper.classList.add(...IMAGE_GRID_CLASSES);
        }

        // Contenedor de Contenido
        if (contentWrapper) {
            contentWrapper.classList.remove(...CONTENT_LIST_CLASSES);
            contentWrapper.classList.add(...CONTENT_GRID_CLASSES);
        }
    });

    // 3. Actualizar la apariencia de los botones y guardar preferencia
    updateButtonAppearance(gridViewButton, listViewButton);
    localStorage.setItem('productView', 'grid');
}

/** 📜 Cambia la vista a Lista. */
function switchToListView() {
    if (!productGridContainer) return;

    // 1. Cambiar el contenedor principal (de Grid a List)
    productGridContainer.classList.remove(...GRID_VIEW_CLASSES);
    productGridContainer.classList.add(...LIST_VIEW_CONTAINER_CLASSES);

    // 2. Cambiar cada elemento de producto individualmente
    getProductElements().forEach(productEl => {
        const imageWrapper = productEl.querySelector('.product-image-wrapper');
        const contentWrapper = productEl.querySelector('.product-content-wrapper');

        // Tarjeta Principal
        productEl.classList.remove(...PRODUCT_GRID_CLASSES);
        productEl.classList.add(...PRODUCT_LIST_CLASSES);
        productEl.classList.remove('p-0'); // Quitar padding de Grid
        productEl.classList.add('p-4');    // Poner padding de Lista

        // Contenedor de Imagen
        if (imageWrapper) {
            imageWrapper.classList.remove(...IMAGE_GRID_CLASSES);
            imageWrapper.classList.add(...IMAGE_LIST_CLASSES);
        }

        // Contenedor de Contenido
        if (contentWrapper) {
            contentWrapper.classList.remove(...CONTENT_GRID_CLASSES);
            contentWrapper.classList.add(...CONTENT_LIST_CLASSES);
        }
    });

    // 3. Actualizar la apariencia de los botones y guardar preferencia
    updateButtonAppearance(listViewButton, gridViewButton);
    localStorage.setItem('productView', 'list');
}

/** Inicializa el cambiador de vista y aplica la preferencia guardada. */
function initializeViewSwitcher() {
    productGridContainer = document.getElementById('product-grid-container');
    gridViewButton = document.getElementById('grid-view-button');
    listViewButton = document.getElementById('list-view-button');

    // Añadir Listeners
    if (gridViewButton) gridViewButton.addEventListener('click', switchToGridView);
    if (listViewButton) listViewButton.addEventListener('click', switchToListView);

    const savedView = localStorage.getItem('productView') || 'grid';

    if (productGridContainer) {
        // Aplicar las clases base del contenedor principal (Grid o List container)
        if (savedView === 'grid') {
            productGridContainer.classList.add(...GRID_VIEW_CLASSES);
            updateButtonAppearance(gridViewButton, listViewButton);
        } else {
            productGridContainer.classList.add(...LIST_VIEW_CONTAINER_CLASSES);
            updateButtonAppearance(listViewButton, gridViewButton);
        }
    }
    return savedView;
}

// =========================================================
// FUNCIÓN PARA GENERAR LOS CONTROLES DE PAGINACIÓN
// =========================================================

/**
 * Renderiza los controles de paginación con el patrón de elipsis (...).
 * @param {number} totalCount - Número total de productos.
 * @param {number} currentPage - Página actual.
 * @param {string | null} categoriaNombre - Nombre de la categoría (para enlaces).
 */
function renderPagination(totalCount, currentPage, categoriaNombre) {
    const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-controls');

    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    const maxPagesToShow = 5; // Máximo de números de página visibles a la vez
    const halfMax = Math.floor(maxPagesToShow / 2);

    // Helper para construir el enlace de la página
    const buildLink = (page) => {
        let href = 'productos.html?';
        if (categoriaNombre) {
            href += `categoria=${encodeURIComponent(categoriaNombre)}&`;
        }
        href += `page=${page}`;
        return href;
    };

    // --- Botón Anterior (Prev) ---
    const prevPage = currentPage > 1 ? currentPage - 1 : 1;
    const prevDisabled = currentPage === 1;
    const prevClasses = prevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700';

    paginationHTML += `
        <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-500 transition-colors ${prevClasses}"
            href="${prevDisabled ? '#' : buildLink(prevPage)}"
            aria-disabled="${prevDisabled}"
            data-page="${prevPage}">
            <span class="material-icons text-base">chevron_left</span>
        </a>
    `;

    // --- Lógica de Rango de Páginas (Elipsis) ---
    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    // Ajustar el rango para mantener el tamaño fijo si es posible
    if (endPage - startPage + 1 < maxPagesToShow) {
        if (startPage > 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        if (endPage < totalPages) {
            endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        }
    }

    // Primera página y Puntos suspensivos (inicio)
    if (startPage > 1) {
        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(1)}" data-page="1">1</a>
            ${startPage > 2 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
        `;
    }

    // Números de Página
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const activeClass = isActive ? 'bg-primary text-white font-semibold shadow-md' : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700';

        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${activeClass}"
                href="${buildLink(i)}"
                data-page="${i}">${i}</a>
        `;
    }

    // Puntos suspensivos (final) y Última página
    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(totalPages)}" data-page="${totalPages}">${totalPages}</a>
        `;
    }

    // --- Botón Siguiente (Next) ---
    const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;
    const nextDisabled = currentPage === totalPages;
    const nextClasses = nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700';

    paginationHTML += `
        <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-500 transition-colors ${nextClasses}"
            href="${nextDisabled ? '#' : buildLink(nextPage)}"
            aria-disabled="${nextDisabled}"
            data-page="${nextPage}">
            <span class="material-icons text-base">chevron_right</span>
        </a>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// =========================================================
// OTRAS FUNCIONES AUXILIARES DE UI
// =========================================================

/** Marca la categoría activa en el menú de navegación principal. */
function marcarCategoriaActiva(categoriaNombre) {
    const enlacesMenu = document.querySelectorAll('nav .whitespace-nowrap a');

    enlacesMenu.forEach(enlace => {
        const indicador = enlace.querySelector('span');

        enlace.classList.remove('active');
        if (indicador) {
            indicador.classList.add('scale-x-0');
            indicador.classList.remove('scale-x-100');
        }

        const url = new URL(enlace.href, window.location.origin);
        const categoriaEnEnlace = url.searchParams.get('categoria') ? decodeURIComponent(url.searchParams.get('categoria')) : null;

        let shouldBeActive = false;
        const nombreDecodificado = categoriaNombre ? decodeURIComponent(categoriaNombre) : null;

        if (categoriaEnEnlace === nombreDecodificado) {
            shouldBeActive = true;
        }

        // Caso: Si no hay categoría y es el enlace a la página de productos o index
        if (!nombreDecodificado && (enlace.pathname === '/index.html' || enlace.pathname === '/productos.html' || enlace.pathname === '/')) {
            shouldBeActive = true;
        }

        if (shouldBeActive) {
            enlace.classList.add('active');
            if (indicador) {
                indicador.classList.remove('scale-x-0');
                indicador.classList.add('scale-x-100');
            }
        }
    });
}

/** Marca la casilla de la categoría activa en el filtro lateral. */
function marcarFiltroSidebar(categoriaNombre) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-categoria]');
    // Desmarcar todos primero
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    if (categoriaNombre) {
        const categoriaDecodificada = decodeURIComponent(categoriaNombre);
        const checkbox = document.querySelector(`input[type="checkbox"][data-categoria="${categoriaDecodificada}"]`);

        if (checkbox) {
            checkbox.checked = true;
        }
    }
}


// =========================================================
// FUNCIÓN PRINCIPAL DE CARGA Y FILTRADO CON PAGINACIÓN
// =========================================================

/**
 * Carga y renderiza los productos basándose en la categoría y página de la URL.
 */
async function cargarProductosPorCategoria() {
    // 1. Inicializar el ViewSwitcher y obtener la vista guardada
    const savedView = initializeViewSwitcher();

    const urlParams = new URLSearchParams(window.location.search);
    const categoriaNombreRaw = urlParams.get('categoria');
    const categoriaNombre = categoriaNombreRaw ? decodeURIComponent(categoriaNombreRaw) : null;

    const currentPage = parseInt(urlParams.get('page')) || 1;

    const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    productGridContainer = document.getElementById('product-grid-container');
    const tituloCategoria = document.getElementById('titulo-categoria');
    const breadcrumbActivo = document.getElementById('breadcrumb-activo');
    const productosConteo = document.getElementById('productos-conteo');


    if (!productGridContainer) {
        console.error("Error: El contenedor 'product-grid-container' no se encontró en el DOM.");
        return;
    }

    productGridContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Cargando productos...</div>';

    marcarCategoriaActiva(categoriaNombre);
    marcarFiltroSidebar(categoriaNombre);

    let productos = [];
    let totalCount = 0;
    const nombreDisplay = categoriaNombre || 'Catálogo Completo';

    if (tituloCategoria) tituloCategoria.textContent = nombreDisplay;
    if (breadcrumbActivo) breadcrumbActivo.textContent = nombreDisplay;
    if (productosConteo) productosConteo.textContent = 'Buscando productos...';

    // 2. LÓGICA DE FILTRADO CLAVE: Obtener el ID de la categoría por su NOMBRE.
    let categoriaId = null;

    if (categoriaNombre) {
        // Primero, busca el ID de la categoría usando el nombre.
        let { data: categoria, error: catError } = await supabase
            .from('categoria')
            .select('id')
            .eq('nombre', categoriaNombre)
            .maybeSingle();

        if (catError || !categoria) {
            console.error('Error al obtener la categoría o no encontrada:', catError?.message || `Categoría "${categoriaNombre}" no existe.`);
            productGridContainer.innerHTML = `<div class="col-span-full text-center text-xl text-red-500 py-10">Categoría "${categoriaNombre}" no encontrada o no tiene productos.</div>`;
            if (productosConteo) productosConteo.textContent = '0 resultados';
            renderPagination(0, 1, categoriaNombre);
            return;
        }

        categoriaId = categoria.id;
    }


    // 3. Consulta a Supabase (Total Count y Rango)
    let query = supabase
        .from('producto')
        .select('*', { count: 'exact' }) // Pedir el conteo total
        .eq('visible', true)
        .order('id', { ascending: true });

    // Aplicar el filtro por ID de categoría si se encontró.
    if (categoriaId !== null) {
        query = query.eq('id_categoria', categoriaId);
    }

    let { data: productosData, error: prodError, count } = await query
        .range(from, to); // Aplicar la paginación

    totalCount = count || 0;

    if (prodError) {
        console.error('Error al cargar productos:', prodError);
        productGridContainer.innerHTML = '<div class="col-span-full text-center text-xl text-red-500 py-10">Error al cargar los productos.</div>';
        if (productosConteo) productosConteo.textContent = '0 resultados';
        renderPagination(0, 1, categoriaNombre);
        return;
    }

    productos = productosData || [];
    const productosCargados = productos.length;

    // 4. Actualizar conteo en la UI
    const startIndex = productosCargados > 0 ? from + 1 : 0;
    const endIndex = from + productosCargados;
    if (productosConteo) productosConteo.textContent = `Mostrando ${startIndex}-${endIndex} de ${totalCount} resultados`;


    productGridContainer.innerHTML = '';

    if (productos.length === 0) {
        productGridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No hay productos disponibles en "${nombreDisplay}".</div>`;
        renderPagination(0, 1, categoriaNombre);
        return;
    }

    // 5. Renderizar Productos con la nueva estructura flexible
    const productosMapeados = productos.map(data => new Producto(data));

    // Configurar clases iniciales para el renderizado (basado en la preferencia guardada)
    const cardBaseClasses = ['group', 'flex', 'rounded-xl', 'border', 'hover:shadow-lg', 'transition-all', 'duration-300', 'bg-white', 'dark:bg-surface-dark'];

    let finalCardClasses, imageClasses, contentClasses, cardBasePadding;

    if (savedView === 'list') {
        finalCardClasses = [...cardBaseClasses, ...PRODUCT_LIST_CLASSES].join(' ');
        imageClasses = IMAGE_LIST_CLASSES.join(' ');
        contentClasses = CONTENT_LIST_CLASSES.join(' ');
        cardBasePadding = 'p-4';

    } else { // default 'grid'
        finalCardClasses = [...cardBaseClasses, ...PRODUCT_GRID_CLASSES].join(' ');
        imageClasses = IMAGE_GRID_CLASSES.join(' ');
        contentClasses = CONTENT_GRID_CLASSES.join(' ');
        cardBasePadding = 'p-0';
    }

    productosMapeados.forEach((producto) => {
        try {
            const productoId = producto.id;
            const precioFormateado = producto.getPrecioFormateado();
            const estaAgotado = producto.estaAgotado();

            const deshabilitado = estaAgotado ? 'disabled' : '';
            const textoBotonIcono = estaAgotado ? 'remove_shopping_cart' : 'add_shopping_cart';
            const linkHref = `detalle_producto.html?id=${productoId}`;

            // Renderizado del Producto
            const cardHTML = `
                <div class="product-card-item ${finalCardClasses} ${cardBasePadding}">
                    
                    <div class="product-image-wrapper relative ${imageClasses}">
                        ${estaAgotado ? '<span class="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">AGOTADO</span>' : ''}
                        
                        <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10">
                            <span class="material-icons">favorite_border</span>
                        </button>
                        <div class="bg-background-light dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center overflow-hidden relative group-hover:bg-secondary/10 transition-colors">
                            <a href="${linkHref}" class="w-full h-full flex items-center justify-center">
                                <img src="${producto.imagen_url || 'imagenes/placeholder.jpg'}" alt="${producto.nombre}" 
                                    class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                            </a>
                        </div>
                    </div>
                    
                    <div class="product-content-wrapper flex flex-col flex-grow ${contentClasses}">
                        <div class="mb-2">
                            <span class="text-xs text-gray-400 font-medium">${nombreDisplay}</span> 
                            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 h-12 group-hover:text-primary transition-colors cursor-pointer">
                                <a href="${linkHref}">
                                    ${producto.nombre}
                                </a>
                            </h3>
                        </div>
                        <div class="flex items-center gap-1 mb-3">
                            <span class="text-xs text-gray-400">(N/A)</span> 
                        </div>
                        <div class="mt-auto flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-lg font-bold text-primary">Bs ${precioFormateado}</span>
                            </div>
                            <button class="agregar add-to-cart-btn bg-secondary/20 hover:bg-primary hover:text-white text-primary rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md"
                                data-product-id="${productoId}" ${deshabilitado} title="${estaAgotado ? 'Producto Agotado' : 'Agregar al Carrito'}">
                                <span class="material-icons text-xl">${textoBotonIcono}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            productGridContainer.insertAdjacentHTML('beforeend', cardHTML);

        } catch (error) {
            console.error("Error al renderizar un producto (datos no válidos):", producto, error);
        }
    });

    // 6. Generar Paginación
    renderPagination(totalCount, currentPage, categoriaNombre);

    // 7. Forzar la aplicación de la vista guardada (esto es clave para que las clases CSS se apliquen correctamente a los nuevos elementos)
    if (savedView === 'list') {
        switchToListView();
    } else {
        switchToGridView();
    }

    // 8. Añadir listeners del carrito
    agregarListenersCatalogo();
}

// =========================================================
// INICIO
// =========================================================

document.addEventListener('DOMContentLoaded', cargarProductosPorCategoria);