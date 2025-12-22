import { supabase } from './supabaseClient.js';

// 1. Referencias al DOM
const searchInput = document.getElementById('search-input');
const resultsModal = document.getElementById('search-results-modal');
const clearBtn = document.getElementById('clear-search');
const productsContainer = document.getElementById('suggested-products');
const catsContainer = document.getElementById('suggested-categories');
const searchButton = document.getElementById('btn-search-main');

// 2. Variables de control para velocidad y eficiencia
const searchCache = new Map();
let abortController = null;

/** 🚀 Redirección a la página de resultados completa */
function activarBusqueda() {
    const termino = searchInput.value.trim();
    if (termino.length > 0) {
        window.location.href = `productos.html?buscar=${encodeURIComponent(termino)}`;
    }
}

// --- CONFIGURACIÓN DE EVENTOS EN TIEMPO REAL ---

if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        // Control visual del botón de limpiar
        if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

        // Si hay menos de 2 letras, ocultamos el modal y no buscamos
        if (query.length < 2) {
            if (resultsModal) resultsModal.classList.add('hidden');
            return;
        }

        // A. PRIORIDAD CACHÉ: Si ya existe el resultado, mostrarlo CERO milisegundos
        if (searchCache.has(query)) {
            renderResults(searchCache.get(query), query);
            return;
        }

        // B. CANCELAR PETICIÓN PREVIA: Si el usuario sigue escribiendo, anulamos la petición anterior
        if (abortController) abortController.abort();
        abortController = new AbortController();

        // C. BUSCAR INMEDIATAMENTE
        await performSearch(query, abortController.signal);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') activarBusqueda();
    });
}

// Botón de lupa
if (searchButton) {
    searchButton.addEventListener('click', activarBusqueda);
}

// Botón Limpiar (X)
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        if (resultsModal) resultsModal.classList.add('hidden');
        clearBtn.classList.add('hidden');
        searchInput.focus();
    });
}

// --- MOTOR DE BÚSQUEDA ---

async function performSearch(term, signal) {
    try {
        const { data, error } = await supabase
            .from('producto')
            .select(`
                id, 
                nombre, 
                precio,
                imagen_url,
                categoria:id_categoria (nombre)
            `)
            .ilike('nombre', `%${term}%`)
            .eq('visible', true)
            .limit(6)
            .abortSignal(signal); // Vincula la petición a la señal de cancelación

        if (error) {
            // Si el error es por cancelación nuestra, no hacer nada
            if (error.name === 'AbortError') return;
            throw error;
        }

        // Guardar en caché para que la próxima vez sea instantáneo
        searchCache.set(term, data);
        renderResults(data, term);

    } catch (error) {
        if (error.message !== 'Fetch is aborted') {
            console.error("Error en búsqueda real-time:", error.message);
        }
    }
}

/** 🎨 RENDERIZADO DE ALTO RENDIMIENTO */
function renderResults(products, term) {
    if (!productsContainer || !catsContainer || !resultsModal) return;

    // Limpiar rápido
    productsContainer.innerHTML = '';
    catsContainer.innerHTML = '';

    if (!products || products.length === 0) {
        resultsModal.classList.add('hidden');
        return;
    }

    // Usamos fragmentos para minimizar el impacto en el navegador
    const productFragment = document.createDocumentFragment();

    products.forEach(p => {
        const regex = new RegExp(`(${term})`, 'gi');
        const highlighted = p.nombre.replace(regex, '<span class="font-bold text-gray-900 dark:text-white">$1</span>');

        const item = document.createElement('a');
        item.href = `detalle_producto.html?id=${p.id}`;
        item.className = "px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 group transition-all duration-150";

        item.innerHTML = `
            <div class="flex items-center">
                <span class="material-icons text-gray-400 text-lg mr-3">search</span>
                <span>${highlighted}</span>
            </div>
            <span class="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                Ver producto
            </span>
        `;
        productFragment.appendChild(item);
    });

    productsContainer.appendChild(productFragment);

    // Renderizado de categorías únicas encontradas
    const uniqueCategories = [...new Set(products.map(p => p.categoria?.nombre))].filter(Boolean);
    uniqueCategories.forEach(catName => {
        const li = document.createElement('li');
        li.className = "mb-1";
        li.innerHTML = `
            <a href="productos.html?categoria=${encodeURIComponent(catName)}" 
               class="block px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-primary/5 rounded transition-all">
                ${catName}
            </a>
        `;
        catsContainer.appendChild(li);
    });

    // Mostrar el modal inmediatamente
    resultsModal.classList.remove('hidden');
}

// Cerrar el modal al hacer clic en cualquier lugar fuera del contenedor
document.addEventListener('click', (e) => {
    const container = document.getElementById('search-container');
    if (container && !container.contains(e.target) && resultsModal) {
        resultsModal.classList.add('hidden');
    }
});