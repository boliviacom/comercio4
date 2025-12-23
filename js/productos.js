import { supabase } from './supabaseClient.js';
import { agregarListenersCatalogo } from './carrito.js';
import { Producto } from './models/Producto.js';

// =========================================================
// CONSTANTES Y CONFIGURACIÓN DE VISTAS (Tailwind CSS Classes)
// =========================================================
const PRODUCTS_PER_PAGE = 15;

const GRID_VIEW_CLASSES = ['grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-6'];
const LIST_VIEW_CONTAINER_CLASSES = ['space-y-6']; 

const PRODUCT_GRID_CLASSES = ['flex-col', 'shadow-sm', 'border-gray-100', 'dark:border-gray-700'];
const PRODUCT_LIST_CLASSES = [
    'flex-row',
    'gap-6',
    'items-center',
    'border-gray-200',
    'dark:border-gray-700',
    'shadow-md'
];

const IMAGE_GRID_CLASSES = ['p-4'];
const IMAGE_LIST_CLASSES = ['p-4', 'w-32', 'sm:w-40', 'md:w-48', 'flex-shrink-0'];

const CONTENT_GRID_CLASSES = ['px-4', 'pb-4'];
const CONTENT_LIST_CLASSES = ['px-4', 'pb-4', 'flex-grow']; 

let productGridContainer, gridViewButton, listViewButton;

// =========================================================
// NUEVA FUNCIÓN: RENDERIZADO DE ESTRELLAS
// =========================================================
function renderStars(promedio) {
    const rating = parseFloat(promedio) || 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = Math.max(0, 5 - fullStars - halfStar);
    
    return `
        <div class="flex text-yellow-400 items-center">
            ${'<span class="material-icons text-sm">star</span>'.repeat(fullStars)}
            ${'<span class="material-icons text-sm">star_half</span>'.repeat(halfStar)}
            ${'<span class="material-icons text-sm text-gray-300 dark:text-gray-600">star_outline</span>'.repeat(emptyStars)}
        </div>
    `;
}

// =========================================================
// LÓGICA DEL CAMBIADOR DE VISTA (GRID/LISTA)
// =========================================================

function getProductElements() {
    return productGridContainer.querySelectorAll('.product-card-item');
}

function updateButtonAppearance(activeButton, inactiveButton) {
    if (!activeButton || !inactiveButton) return;
    activeButton.classList.remove('hover:bg-white', 'dark:hover:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
    activeButton.classList.add('bg-white', 'dark:bg-gray-600', 'text-primary', 'shadow-sm');
    inactiveButton.classList.remove('bg-white', 'dark:bg-gray-600', 'text-primary', 'shadow-sm');
    inactiveButton.classList.add('hover:bg-white', 'dark:hover:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
}

function switchToGridView() {
    if (!productGridContainer) return;
    productGridContainer.classList.remove(...LIST_VIEW_CONTAINER_CLASSES);
    productGridContainer.classList.add(...GRID_VIEW_CLASSES);

    getProductElements().forEach(productEl => {
        const imageWrapper = productEl.querySelector('.product-image-wrapper');
        const contentWrapper = productEl.querySelector('.product-content-wrapper');

        productEl.classList.remove(...PRODUCT_LIST_CLASSES);
        productEl.classList.add(...PRODUCT_GRID_CLASSES);
        productEl.classList.remove('p-4'); 
        productEl.classList.add('p-0');     

        if (imageWrapper) {
            imageWrapper.classList.remove(...IMAGE_LIST_CLASSES);
            imageWrapper.classList.add(...IMAGE_GRID_CLASSES);
        }
        if (contentWrapper) {
            contentWrapper.classList.remove(...CONTENT_LIST_CLASSES);
            contentWrapper.classList.add(...CONTENT_GRID_CLASSES);
        }
    });

    updateButtonAppearance(gridViewButton, listViewButton);
    localStorage.setItem('productView', 'grid');
}

function switchToListView() {
    if (!productGridContainer) return;
    productGridContainer.classList.remove(...GRID_VIEW_CLASSES);
    productGridContainer.classList.add(...LIST_VIEW_CONTAINER_CLASSES);

    getProductElements().forEach(productEl => {
        const imageWrapper = productEl.querySelector('.product-image-wrapper');
        const contentWrapper = productEl.querySelector('.product-content-wrapper');

        productEl.classList.remove(...PRODUCT_GRID_CLASSES);
        productEl.classList.add(...PRODUCT_LIST_CLASSES);
        productEl.classList.remove('p-0'); 
        productEl.classList.add('p-4');     

        if (imageWrapper) {
            imageWrapper.classList.remove(...IMAGE_GRID_CLASSES);
            imageWrapper.classList.add(...IMAGE_LIST_CLASSES);
        }
        if (contentWrapper) {
            contentWrapper.classList.remove(...CONTENT_GRID_CLASSES);
            contentWrapper.classList.add(...CONTENT_LIST_CLASSES);
        }
    });

    updateButtonAppearance(listViewButton, gridViewButton);
    localStorage.setItem('productView', 'list');
}

function initializeViewSwitcher() {
    productGridContainer = document.getElementById('product-grid-container');
    gridViewButton = document.getElementById('grid-view-button');
    listViewButton = document.getElementById('list-view-button');

    if (gridViewButton && !gridViewButton.dataset.listener) {
        gridViewButton.addEventListener('click', switchToGridView);
        gridViewButton.dataset.listener = 'true';
    }
    if (listViewButton && !listViewButton.dataset.listener) {
        listViewButton.addEventListener('click', switchToListView);
        listViewButton.dataset.listener = 'true';
    }

    const savedView = localStorage.getItem('productView') || 'grid';

    if (productGridContainer) {
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
// LÓGICA DE ORDENAMIENTO
// =========================================================

function obtenerConfiguracionOrden(opcion) {
    switch (opcion) {
        case 'Precio: Menor a Mayor':
            return { columna: 'precio', opciones: { ascending: true } };
        case 'Precio: Mayor a Menor':
            return { columna: 'precio', opciones: { ascending: false } };
        case 'Lo más nuevo':
            return { columna: 'producto_id', opciones: { ascending: false } };
        default:
            return { columna: 'producto_id', opciones: { ascending: true } };
    }
}

function configurarSelectorOrden() {
    const selectorOrden = document.querySelector('select.form-select');
    if (!selectorOrden) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('orden')) {
        selectorOrden.value = urlParams.get('orden');
    }

    if (!selectorOrden.dataset.listener) {
        selectorOrden.addEventListener('change', () => {
            const url = new URL(window.location.href);
            url.searchParams.set('orden', selectorOrden.value);
            url.searchParams.set('page', '1');
            window.location.href = url.toString();
        });
        selectorOrden.dataset.listener = 'true';
    }
}

// =========================================================
// PAGINACIÓN
// =========================================================

function renderPagination(totalCount, currentPage, categoriaNombre) {
    const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-controls');

    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ordenActual = urlParams.get('orden');
    const buscar = urlParams.get('buscar');

    const buildLink = (page) => {
        let params = new URLSearchParams();
        if (categoriaNombre) params.set('categoria', categoriaNombre);
        if (buscar) params.set('buscar', buscar);
        if (ordenActual) params.set('orden', ordenActual);
        params.set('page', page);
        return `productos.html?${params.toString()}`;
    };

    let paginationHTML = '';
    const maxPagesToShow = 5; 
    const halfMax = Math.floor(maxPagesToShow / 2);

    const prevPage = currentPage > 1 ? currentPage - 1 : 1;
    const prevDisabled = currentPage === 1;
    const prevClasses = prevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700';

    paginationHTML += `
        <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-500 transition-colors ${prevClasses}"
            href="${prevDisabled ? '#' : buildLink(prevPage)}"
            aria-disabled="${prevDisabled}">
            <span class="material-icons text-base">chevron_left</span>
        </a>
    `;

    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    if (endPage - startPage + 1 < maxPagesToShow) {
        if (startPage > 1) startPage = Math.max(1, endPage - maxPagesToShow + 1);
        if (endPage < totalPages) endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(1)}">1</a>
            ${startPage > 2 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const activeClass = isActive ? 'bg-primary text-white font-semibold shadow-md' : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700';

        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${activeClass}"
                href="${buildLink(i)}">${i}</a>
        `;
    }

    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(totalPages)}">${totalPages}</a>
        `;
    }

    const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;
    const nextDisabled = currentPage === totalPages;
    const nextClasses = nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700';

    paginationHTML += `
        <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-500 transition-colors ${nextClasses}"
            href="${nextDisabled ? '#' : buildLink(nextPage)}"
            aria-disabled="${nextDisabled}">
            <span class="material-icons text-base">chevron_right</span>
        </a>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// =========================================================
// FUNCIONES AUXILIARES DE UI
// =========================================================

function marcarCategoriaActiva(categoriaNombre) {
    const enlacesMenu = document.querySelectorAll('nav .whitespace-nowrap a');
    const urlParams = new URLSearchParams(window.location.search);
    const estaBuscando = urlParams.has('buscar');

    enlacesMenu.forEach(enlace => {
        const indicador = enlace.querySelector('span');
        enlace.classList.remove('active');
        if (indicador) {
            indicador.classList.add('scale-x-0');
            indicador.classList.remove('scale-x-100');
        }

        if (estaBuscando) return; 

        const url = new URL(enlace.href, window.location.origin);
        const categoriaEnEnlace = url.searchParams.get('categoria') ? decodeURIComponent(url.searchParams.get('categoria')) : null;
        let shouldBeActive = false;
        const nombreDecodificado = categoriaNombre ? decodeURIComponent(categoriaNombre) : null;

        if (categoriaEnEnlace === nombreDecodificado && nombreDecodificado !== null) {
            shouldBeActive = true;
        }

        if (!nombreDecodificado && !estaBuscando && (enlace.pathname === '/index.html' || enlace.pathname === '/productos.html' || enlace.pathname === '/')) {
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

function marcarFiltroSidebar(categoriaNombre) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-categoria]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    if (categoriaNombre) {
        const categoriaDecodificada = decodeURIComponent(categoriaNombre);
        const checkbox = document.querySelector(`input[type="checkbox"][data-categoria="${categoriaDecodificada}"]`);
        if (checkbox) checkbox.checked = true;
    }
}

// =========================================================
// FUNCIÓN PRINCIPAL DE CARGA (ACTUALIZADA CON VISTA)
// =========================================================

async function cargarProductosPorCategoria() {
    const savedView = initializeViewSwitcher();
    configurarSelectorOrden();

    const urlParams = new URLSearchParams(window.location.search);
    const categoriaNombreRaw = urlParams.get('categoria');
    const categoriaNombre = categoriaNombreRaw ? decodeURIComponent(categoriaNombreRaw) : null;
    const terminoBusqueda = urlParams.get('buscar');
    const ordenUrl = urlParams.get('orden') || 'Más Relevantes';

    const currentPage = parseInt(urlParams.get('page')) || 1;
    const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    productGridContainer = document.getElementById('product-grid-container');
    const tituloCategoria = document.getElementById('titulo-categoria');
    const breadcrumbActivo = document.getElementById('breadcrumb-activo');
    const productosConteo = document.getElementById('productos-conteo');

    if (!productGridContainer) return;

    productGridContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Cargando productos...</div>';

    marcarCategoriaActiva(categoriaNombre);
    marcarFiltroSidebar(categoriaNombre);

    let nombreDisplay = categoriaNombre || 'Catálogo Completo';
    if (terminoBusqueda) {
        nombreDisplay = `Resultados para: "${terminoBusqueda}"`;
    }

    if (tituloCategoria) tituloCategoria.textContent = nombreDisplay;
    if (breadcrumbActivo) breadcrumbActivo.textContent = nombreDisplay;

    let categoriaId = null;
    if (categoriaNombre) {
        let { data: categoria } = await supabase.from('categoria').select('id').eq('nombre', categoriaNombre).maybeSingle();
        if (categoria) categoriaId = categoria.id;
    }

    // MEJORA: Consultar la VISTA en lugar de la tabla directa
    let query = supabase.from('v_producto_estadisticas').select('*', { count: 'exact' }).eq('visible', true);

    if (categoriaId !== null) query = query.eq('id_categoria', categoriaId);
    if (terminoBusqueda) query = query.ilike('nombre', `%${terminoBusqueda}%`);

    const configOrden = obtenerConfiguracionOrden(ordenUrl);
    query = query.order(configOrden.columna, configOrden.opciones);

    let { data: productos, error: prodError, count } = await query.range(from, to);

    if (prodError) {
        productGridContainer.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Error al cargar.</div>';
        return;
    }

    const totalCount = count || 0;
    if (productosConteo) {
        const startIndex = productos.length > 0 ? from + 1 : 0;
        productosConteo.textContent = `Mostrando ${startIndex}-${from + productos.length} de ${totalCount} resultados`;
    }

    productGridContainer.innerHTML = '';

    if (productos.length === 0) {
        productGridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No se encontraron productos.</div>`;
        renderPagination(0, 1, categoriaNombre);
        return;
    }

    const cardBaseClasses = ['group', 'flex', 'rounded-xl', 'border', 'hover:shadow-lg', 'transition-all', 'duration-300', 'bg-white', 'dark:bg-surface-dark'];
    let finalCardClasses, imageClasses, contentClasses, cardBasePadding;
    
    if (savedView === 'list') {
        finalCardClasses = [...cardBaseClasses, ...PRODUCT_LIST_CLASSES].join(' ');
        imageClasses = IMAGE_LIST_CLASSES.join(' ');
        contentClasses = CONTENT_LIST_CLASSES.join(' ');
        cardBasePadding = 'p-4';
    } else {
        finalCardClasses = [...cardBaseClasses, ...PRODUCT_GRID_CLASSES].join(' ');
        imageClasses = IMAGE_GRID_CLASSES.join(' ');
        contentClasses = CONTENT_GRID_CLASSES.join(' ');
        cardBasePadding = 'p-0';
    }

    productos.forEach((data) => {
        // Mapeamos ID de la vista (producto_id) al objeto Producto
        const producto = new Producto({ ...data, id: data.producto_id });
        const estaAgotado = producto.estaAgotado();
        
        const cardHTML = `
            <div class="product-card-item ${finalCardClasses} ${cardBasePadding}">
                <div class="product-image-wrapper relative ${imageClasses}">
                    ${estaAgotado ? '<span class="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">AGOTADO</span>' : ''}
                    <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10">
                        <span class="material-icons">favorite_border</span>
                    </button>
                    <div class="bg-background-light dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center overflow-hidden relative group-hover:bg-secondary/10 transition-colors">
                        <a href="detalle_producto.html?id=${producto.id}" class="w-full h-full flex items-center justify-center">
                            <img src="${producto.imagen_url || 'imagenes/placeholder.jpg'}" alt="${producto.nombre}" 
                                class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        </a>
                    </div>
                </div>
                <div class="product-content-wrapper flex flex-col flex-grow ${contentClasses}">
                    <div class="mb-2">
                        <span class="text-xs text-gray-400 font-medium">${nombreDisplay}</span> 
                        <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 h-12 group-hover:text-primary transition-colors cursor-pointer">
                            <a href="detalle_producto.html?id=${producto.id}">${producto.nombre}</a>
                        </h3>
                    </div>

                    <div class="flex items-center gap-1.5 mb-3">
                        ${renderStars(data.promedio_estrellas)}
                        <span class="text-xs font-bold text-gray-600 dark:text-gray-300">${data.promedio_estrellas}</span>
                        <span class="text-[10px] text-gray-400">(${data.total_calificaciones})</span> 
                    </div>

                    <div class="mt-auto flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-lg font-bold text-primary">Bs ${producto.getPrecioFormateado()}</span>
                        </div>
                        <button class="agregar add-to-cart-btn bg-secondary/20 hover:bg-primary hover:text-white text-primary rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md"
                            data-product-id="${producto.id}" ${estaAgotado ? 'disabled' : ''}>
                            <span class="material-icons text-xl">${estaAgotado ? 'remove_shopping_cart' : 'add_shopping_cart'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        productGridContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    renderPagination(totalCount, currentPage, categoriaNombre);
    if (savedView === 'list') switchToListView(); else switchToGridView();
    agregarListenersCatalogo();
}

document.addEventListener('DOMContentLoaded', cargarProductosPorCategoria);