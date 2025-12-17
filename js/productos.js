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

    if (gridViewButton) gridViewButton.addEventListener('click', switchToGridView);
    if (listViewButton) listViewButton.addEventListener('click', switchToListView);

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
// FUNCIÓN PARA GENERAR LOS CONTROLES DE PAGINACIÓN
// =========================================================

function renderPagination(totalCount, currentPage, categoriaNombre) {
    const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-controls');

    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    const maxPagesToShow = 5; 
    const halfMax = Math.floor(maxPagesToShow / 2);

    const buildLink = (page) => {
        let href = 'productos.html?';
        const urlParams = new URLSearchParams(window.location.search);
        
        if (categoriaNombre) {
            href += `categoria=${encodeURIComponent(categoriaNombre)}&`;
        }
        
        const buscar = urlParams.get('buscar');
        if (buscar) {
            href += `buscar=${encodeURIComponent(buscar)}&`;
        }
        
        href += `page=${page}`;
        return href;
    };

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

    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    if (endPage - startPage + 1 < maxPagesToShow) {
        if (startPage > 1) startPage = Math.max(1, endPage - maxPagesToShow + 1);
        if (endPage < totalPages) endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(1)}" data-page="1">1</a>
            ${startPage > 2 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const activeClass = isActive ? 'bg-primary text-white font-semibold shadow-md' : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700';

        paginationHTML += `
            <a class="h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${activeClass}"
                href="${buildLink(i)}"
                data-page="${i}">${i}</a>
        `;
    }

    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span class="h-10 w-10 flex items-center justify-center text-gray-400">...</span>' : ''}
            <a class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                href="${buildLink(totalPages)}" data-page="${totalPages}">${totalPages}</a>
        `;
    }

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

/** CORRECCIÓN: Marca la categoría activa evitando que todas se activen en búsquedas */
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
// FUNCIÓN PRINCIPAL DE CARGA Y FILTRADO CON PAGINACIÓN
// =========================================================

async function cargarProductosPorCategoria() {
    const savedView = initializeViewSwitcher();

    const urlParams = new URLSearchParams(window.location.search);
    const categoriaNombreRaw = urlParams.get('categoria');
    const categoriaNombre = categoriaNombreRaw ? decodeURIComponent(categoriaNombreRaw) : null;
    const terminoBusqueda = urlParams.get('buscar');

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

    let productos = [];
    let totalCount = 0;
    
    let nombreDisplay = categoriaNombre || 'Catálogo Completo';
    if (terminoBusqueda) {
        nombreDisplay = `Resultados para: "${terminoBusqueda}"`;
    }

    if (tituloCategoria) tituloCategoria.textContent = nombreDisplay;
    if (breadcrumbActivo) breadcrumbActivo.textContent = nombreDisplay;
    if (productosConteo) productosConteo.textContent = 'Buscando productos...';

    let categoriaId = null;
    if (categoriaNombre) {
        let { data: categoria } = await supabase
            .from('categoria')
            .select('id')
            .eq('nombre', categoriaNombre)
            .maybeSingle();
        if (categoria) categoriaId = categoria.id;
    }

    let query = supabase
        .from('producto')
        .select('*', { count: 'exact' })
        .eq('visible', true)
        .order('id', { ascending: true });

    if (categoriaId !== null) {
        query = query.eq('id_categoria', categoriaId);
    }

    if (terminoBusqueda) {
        query = query.ilike('nombre', `%${terminoBusqueda}%`);
    }

    let { data: productosData, error: prodError, count } = await query.range(from, to);

    totalCount = count || 0;

    if (prodError) {
        productGridContainer.innerHTML = '<div class="col-span-full text-center text-xl text-red-500 py-10">Error al cargar los productos.</div>';
        return;
    }

    productos = productosData || [];
    const productosCargados = productos.length;
    const startIndex = productosCargados > 0 ? from + 1 : 0;
    const endIndex = from + productosCargados;
    if (productosConteo) productosConteo.textContent = `Mostrando ${startIndex}-${endIndex} de ${totalCount} resultados`;

    productGridContainer.innerHTML = '';

    if (productos.length === 0) {
        productGridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No se encontraron productos.</div>`;
        renderPagination(0, 1, categoriaNombre);
        return;
    }

    const productosMapeados = productos.map(data => new Producto(data));
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

    productosMapeados.forEach((producto) => {
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
                    <div class="flex items-center gap-1 mb-3">
                        <span class="text-xs text-gray-400">(N/A)</span> 
                    </div>
                    <div class="mt-auto flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-lg font-bold text-primary">Bs ${producto.getPrecioFormateado()}</span>
                        </div>
                        <button class="agregar add-to-cart-btn bg-secondary/20 hover:bg-primary hover:text-white text-primary rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md"
                            data-product-id="${producto.id}" ${estaAgotado ? 'disabled' : ''} title="${estaAgotado ? 'Producto Agotado' : 'Agregar al Carrito'}">
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