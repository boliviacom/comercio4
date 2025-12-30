import { supabase } from './supabaseClient.js';
import { agregarListenersCatalogo } from './carrito.js';
import { Producto } from './models/Producto.js';

// =========================================================
// CONSTANTES Y CONFIGURACIÓN DE VISTAS
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
// 1. LÓGICA DE TOGGLES (ACORDEONES) DEL SIDEBAR
// =========================================================
function inicializarTogglesSidebar() {
    // Seleccionamos los encabezados h4 que tienen la clase cursor-pointer (títulos de filtros)
    const filterHeaders = document.querySelectorAll('aside h4.cursor-pointer');
    
    filterHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // El contenido a ocultar es el div que sigue inmediatamente al encabezado
            const content = header.nextElementSibling;
            const icon = header.querySelector('.material-icons');
            
            if (content) {
                const isHidden = content.classList.toggle('hidden');
                
                // Rotación visual y cambio de icono
                if (icon) {
                    icon.style.transform = isHidden ? 'rotate(-90deg)' : 'rotate(0deg)';
                    icon.textContent = isHidden ? 'expand_more' : 'expand_less';
                }
            }
        });
    });
}

// =========================================================
// LÓGICA DE FILTROS MÓVILES
// =========================================================
function inicializarFiltrosMoviles() {
    const sidebar = document.getElementById('filters-sidebar');
    const btnAbrir = document.getElementById('mobile-filters-button');
    const btnCerrar = document.getElementById('close-filters-button');
    const overlay = document.getElementById('filters-overlay');

    if (!btnAbrir || !sidebar) return;

    const abrirMenu = () => {
        sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    const cerrarMenu = () => {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    btnAbrir.addEventListener('click', abrirMenu);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarMenu);
    if (overlay) overlay.addEventListener('click', cerrarMenu);
}

// =========================================================
// 2. LÓGICA DE ESTRELLAS BIDIRECCIONAL (INPUT <-> ESTRELLAS)
// =========================================================
function inicializarFiltroEstrellas() {
    const starIcons = document.querySelectorAll('#rating-stars-filter .star-icon');
    const ratingInput = document.getElementById('rating-score-input');
    const btnAplicar = document.getElementById('btn-aplicar-rating');

    if (!starIcons.length || !ratingInput) return;

    // Función para pintar/despintar estrellas visualmente
    function actualizarEstrellasUI(rating) {
        const val = parseInt(rating) || 0;
        starIcons.forEach(s => {
            const sVal = parseInt(s.getAttribute('data-value'));
            if (sVal <= val) {
                s.textContent = 'star'; // Estrella rellena
                s.classList.add('text-yellow-400');
                s.classList.remove('text-gray-300');
            } else {
                s.textContent = 'star_outline'; // Estrella vacía
                s.classList.remove('text-yellow-400');
                s.classList.add('text-gray-300');
            }
        });
    }

    // A. ESCUCHA DE CLIC EN ESTRELLAS (Actualiza el Input)
    starIcons.forEach(star => {
        star.addEventListener('click', () => {
            const val = star.getAttribute('data-value');
            ratingInput.value = val;
            actualizarEstrellasUI(val);
        });
    });

    // B. ESCUCHA DE ESCRITURA EN INPUT (Actualiza las Estrellas)
    ratingInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value) || 0;
        
        // Validamos que no se pase de 5 ni sea menor a 0
        if (val > 5) { val = 5; e.target.value = 5; }
        if (val < 0) { val = 0; e.target.value = 0; }
        
        actualizarEstrellasUI(val);
    });

    // C. BOTÓN APLICAR (Actualiza la URL para filtrar)
    if (btnAplicar) {
        btnAplicar.addEventListener('click', () => {
            const val = ratingInput.value;
            const url = new URL(window.location.href);
            
            if (val && val > 0) {
                url.searchParams.set('rating', val);
            } else {
                url.searchParams.delete('rating');
            }
            
            url.searchParams.set('page', '1'); // Reiniciar a página 1
            window.location.href = url.toString();
        });
    }

    // Sincronización inicial si el filtro ya viene en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('rating')) {
        const r = urlParams.get('rating');
        ratingInput.value = r;
        actualizarEstrellasUI(r);
    }
}

// =========================================================
// RENDERIZADO DE ESTRELLAS EN CARD
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
// LÓGICA DEL CAMBIADOR DE VISTA
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
// FILTRADO DE ETIQUETAS
// =========================================================
function renderActiveFilterBadges() {
    const tagsContainer = document.getElementById('applied-tags');
    const mainContainer = document.getElementById('active-filters-container');
    if (!tagsContainer || !mainContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    let badgesHTML = '';
    let hasFilters = false;

    const createBadge = (label, type, value = '') => {
        hasFilters = true;
        return `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 animate-fade-in">
                ${label}
                <button onclick="removeFilter('${type}', '${value}')" class="hover:text-red-500 transition-colors">
                    <span class="material-icons text-[14px]">close</span>
                </button>
            </span>
        `;
    };

    if (urlParams.has('buscar')) badgesHTML += createBadge(`Búsqueda: ${urlParams.get('buscar')}`, 'buscar');
    if (urlParams.has('minPrice')) badgesHTML += createBadge(`Mín: Bs ${urlParams.get('minPrice')}`, 'minPrice');
    if (urlParams.has('maxPrice')) badgesHTML += createBadge(`Máx: Bs ${urlParams.get('maxPrice')}`, 'maxPrice');
    if (urlParams.has('rating')) badgesHTML += createBadge(`${urlParams.get('rating')} Estrellas+`, 'rating');
    
    urlParams.getAll('subcategoria').forEach(id => {
        const checkbox = document.querySelector(`input[data-type="subcat"][value="${id}"]`);
        const nombreAMostrar = checkbox ? checkbox.getAttribute('data-nombre') : `Cargando...`;
        badgesHTML += createBadge(nombreAMostrar, 'subcategoria', id);
    });

    tagsContainer.innerHTML = badgesHTML;

    if (hasFilters) {
        mainContainer.classList.remove('hidden');
    } else {
        mainContainer.classList.add('hidden');
    }
}

window.removeFilter = function (type, value) {
    const url = new URL(window.location.href);
    if (type === 'subcategoria') {
        const current = url.searchParams.getAll('subcategoria');
        url.searchParams.delete('subcategoria');
        current.forEach(v => { if (v !== value) url.searchParams.append('subcategoria', v); });
    } else {
        url.searchParams.delete(type);
    }
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
};

// =========================================================
// FILTRADO POR CATEGORÍAS
// =========================================================
async function cargarSubcategoriasSidebar(idPadre) {
    const container = document.getElementById('categorias-filter-container');
    if (!container) return;

    const { data: subcategorias } = await supabase
        .from('categoria')
        .select('*')
        .eq('id_padre', idPadre)
        .eq('visible', true);

    if (!subcategorias || subcategorias.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 px-2">Sin subcategorías</p>';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const subcatsSeleccionadas = urlParams.getAll('subcategoria');

    container.innerHTML = subcategorias.map(sub => `
        <label class="flex items-center gap-3 cursor-pointer group px-2 py-1">
            <input type="checkbox" 
                value="${sub.id}" 
                data-type="subcat" 
                data-nombre="${sub.nombre}" 
                ${subcatsSeleccionadas.includes(sub.id.toString()) ? 'checked' : ''}
                class="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4">
            <span class="text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors">
                ${sub.nombre}
            </span>
        </label>
    `).join('');

    renderActiveFilterBadges();
}

function inicializarListenersFiltros() {
    const priceRange = document.getElementById('price-range-input');
    const priceMaxDisplay = document.getElementById('price-max-display');
    const minInput = document.getElementById('min-price');
    const maxInput = document.getElementById('max-price');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    const containerFiltros = document.getElementById('categorias-filter-container');

    if (maxInput && !document.getElementById('btn-aplicar-precio')) {
        const btnAplicar = document.createElement('button');
        btnAplicar.id = 'btn-aplicar-precio';
        btnAplicar.innerText = 'Aplicar Filtro';
        btnAplicar.className = 'w-full mt-4 py-1.5 bg-primary text-white text-xs font-bold rounded hover:opacity-90 transition-opacity';
        maxInput.parentElement.after(btnAplicar);

        btnAplicar.addEventListener('click', () => {
            const url = new URL(window.location.href);
            if (minInput.value) url.searchParams.set('minPrice', minInput.value);
            else url.searchParams.delete('minPrice');

            if (maxInput.value) url.searchParams.set('maxPrice', maxInput.value);
            else url.searchParams.delete('maxPrice');

            url.searchParams.set('page', '1');
            window.location.href = url.toString();
        });
    }

    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            if (priceMaxDisplay) priceMaxDisplay.textContent = `Bs ${e.target.value}`;
            if (maxInput) maxInput.value = e.target.value;
        });
        priceRange.addEventListener('change', (e) => {
            const url = new URL(window.location.href);
            url.searchParams.set('maxPrice', e.target.value);
            url.searchParams.set('page', '1');
            window.location.href = url.toString();
        });
    }

    if (containerFiltros) {
        containerFiltros.addEventListener('change', (e) => {
            if (e.target.dataset.type === 'subcat') {
                const url = new URL(window.location.href);
                const checkboxes = containerFiltros.querySelectorAll('input[type="checkbox"]:checked');
                url.searchParams.delete('subcategoria');
                checkboxes.forEach(cb => url.searchParams.append('subcategoria', cb.value));
                url.searchParams.set('page', '1');
                window.location.href = url.toString();
            }
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const url = new URL(window.location.href);
            const cat = url.searchParams.get('categoria');
            const search = url.searchParams.get('buscar');
            const newUrl = new URL(window.location.pathname, window.location.origin);
            if (cat) newUrl.searchParams.set('categoria', cat);
            if (search) newUrl.searchParams.set('buscar', search);
            window.location.href = newUrl.toString();
        });
    }

    renderActiveFilterBadges();
}

// =========================================================
// LÓGICA DE ORDENAMIENTO
// =========================================================
function obtenerConfiguracionOrden(opcion) {
    switch (opcion) {
        case 'Precio: Menor a Mayor': return { columna: 'precio', opciones: { ascending: true } };
        case 'Precio: Mayor a Menor': return { columna: 'precio', opciones: { ascending: false } };
        case 'Lo más nuevo': return { columna: 'producto_id', opciones: { ascending: false } };
        default: return { columna: 'producto_id', opciones: { ascending: true } };
    }
}

function configurarSelectorOrden() {
    const selectorOrden = document.querySelector('select.form-select');
    if (!selectorOrden) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('orden')) selectorOrden.value = urlParams.get('orden');

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
    const minPrice = urlParams.get('minPrice');
    const maxPrice = urlParams.get('maxPrice');
    const rating = urlParams.get('rating');
    const subcats = urlParams.getAll('subcategoria');

    const buildLink = (page) => {
        let params = new URLSearchParams();
        if (categoriaNombre) params.set('categoria', categoriaNombre);
        if (buscar) params.set('buscar', buscar);
        if (ordenActual) params.set('orden', ordenActual);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (rating) params.set('rating', rating);
        subcats.forEach(s => params.append('subcategoria', s));
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
// FUNCIÓN PRINCIPAL DE CARGA
// =========================================================
async function cargarProductosPorCategoria() {
    const savedView = initializeViewSwitcher();
    configurarSelectorOrden();
    inicializarListenersFiltros();
    inicializarFiltrosMoviles();
    inicializarFiltroEstrellas();
    inicializarTogglesSidebar(); // Llamada añadida para activar los acordeones

    const urlParams = new URLSearchParams(window.location.search);
    const categoriaNombreRaw = urlParams.get('categoria');
    const categoriaNombre = categoriaNombreRaw ? decodeURIComponent(categoriaNombreRaw) : null;
    const terminoBusqueda = urlParams.get('buscar');
    const ordenUrl = urlParams.get('orden') || 'Más Relevantes';

    const minPrice = urlParams.get('minPrice');
    const maxPrice = urlParams.get('maxPrice');
    const ratingMin = urlParams.get('rating');
    const subcatsSeleccionadas = urlParams.getAll('subcategoria');

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
    if (terminoBusqueda) nombreDisplay = `Resultados para: "${terminoBusqueda}"`;

    if (tituloCategoria) tituloCategoria.textContent = nombreDisplay;
    if (breadcrumbActivo) breadcrumbActivo.textContent = nombreDisplay;

    if (minPrice) document.getElementById('min-price').value = minPrice;
    if (maxPrice) {
        document.getElementById('max-price').value = maxPrice;
        if (document.getElementById('price-range-input')) document.getElementById('price-range-input').value = maxPrice;
        if (document.getElementById('price-max-display')) document.getElementById('price-max-display').textContent = `Bs ${maxPrice}`;
    }

    let idsParaFiltrar = [];
    if (categoriaNombre) {
        let { data: categoria } = await supabase.from('categoria').select('id').eq('nombre', categoriaNombre).maybeSingle();
        if (categoria) {
            await cargarSubcategoriasSidebar(categoria.id);
            if (subcatsSeleccionadas.length > 0) {
                idsParaFiltrar = subcatsSeleccionadas;
            } else {
                const { data: hijas } = await supabase.from('categoria').select('id').eq('id_padre', categoria.id);
                idsParaFiltrar = hijas.map(h => h.id);
                idsParaFiltrar.push(categoria.id);
            }
        }
    }

    let query = supabase.from('v_producto_estadisticas').select('*', { count: 'exact' }).eq('visible', true);

    if (idsParaFiltrar.length > 0) query = query.in('id_categoria', idsParaFiltrar);
    if (terminoBusqueda) query = query.ilike('nombre', `%${terminoBusqueda}%`);
    if (minPrice) query = query.gte('precio', parseFloat(minPrice));
    if (maxPrice) query = query.lte('precio', parseFloat(maxPrice));
    if (ratingMin) query = query.gte('promedio_estrellas', parseFloat(ratingMin));

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
            </div>`;
        productGridContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    renderPagination(totalCount, currentPage, categoriaNombre);
    if (savedView === 'list') switchToListView(); else switchToGridView();
    agregarListenersCatalogo();
}

document.addEventListener('DOMContentLoaded', cargarProductosPorCategoria);