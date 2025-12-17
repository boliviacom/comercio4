import { supabase } from './supabaseClient.js';

// 1. Referencias exactas a tu HTML
const searchInput = document.getElementById('search-input');
const resultsModal = document.getElementById('search-results-modal');
const clearBtn = document.getElementById('clear-search');
const productsContainer = document.getElementById('suggested-products');
const catsContainer = document.getElementById('suggested-categories');
const brandsContainer = document.getElementById('suggested-brands');

// REVISIÓN DE ID: Cambiamos 'search-button' por 'btn-search-main'
const searchButton = document.getElementById('btn-search-main');

let debounceTimer;

/** 🚀 Motor de búsqueda global */
function activarBusqueda() {
    const termino = searchInput.value.trim();
    if (termino.length > 0) {
        window.location.href = `productos.html?buscar=${encodeURIComponent(termino)}`;
    }
}

// --- CONFIGURACIÓN DE EVENTOS ---

if (searchInput) {
    // Sugerencias en tiempo real
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

        clearTimeout(debounceTimer);
        if (query.length > 2) {
            debounceTimer = setTimeout(() => performSearch(query), 300);
        } else {
            if (resultsModal) resultsModal.classList.add('hidden');
        }
    });

    // Escuchar tecla ENTER
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            activarBusqueda();
        }
    });
}

// Escuchar clic en la lupa (con el ID correcto)
if (searchButton) {
    searchButton.addEventListener('click', activarBusqueda);
}

// Botón Limpiar (X)
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        resultsModal.classList.add('hidden');
        clearBtn.classList.add('hidden');
        searchInput.focus();
    });
}

// --- LÓGICA DE BÚSQUEDA Y RENDERIZADO (Se mantiene igual) ---

async function performSearch(term) {
    try {
        const { data, error } = await supabase
            .from('producto')
            .select(`
                id, 
                nombre, 
                precio,
                imagen_url,
                visible,
                categoria:id_categoria (nombre)
            `)
            .ilike('nombre', `%${term}%`)
            .eq('visible', true)
            .limit(6);

        if (error) throw error;
        renderResults(data, term);
    } catch (error) {
        console.error("Error en el buscador:", error.message);
    }
}

function renderResults(products, term) {
    if (!productsContainer || !catsContainer || !resultsModal) return;

    productsContainer.innerHTML = '';
    catsContainer.innerHTML = '';

    if (!products || products.length === 0) {
        resultsModal.classList.add('hidden');
        return;
    }

    products.forEach(p => {
        const regex = new RegExp(`(${term})`, 'gi');
        const highlighted = p.nombre.replace(regex, '<span class="font-bold text-gray-900 dark:text-white">$1</span>');

        const item = document.createElement('a');
        item.href = `detalle_producto.html?id=${p.id}`;
        item.className = "px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 group";

        item.innerHTML = `
            <div class="flex items-center">
                <span class="material-icons text-gray-400 text-lg mr-3">search</span>
                <span>${highlighted}</span>
            </div>
            <span class="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Ver producto
            </span>
        `;
        productsContainer.appendChild(item);
    });

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

    resultsModal.classList.remove('hidden');
}

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    const container = document.getElementById('search-container');
    if (container && !container.contains(e.target) && resultsModal) {
        resultsModal.classList.add('hidden');
    }
});