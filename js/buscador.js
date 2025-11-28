import { ProductManager } from './productManager.js';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById('searchBar'); 
    const searchModal = document.getElementById('searchModal'); 
    const resultsList = document.getElementById('resultsList'); 
    
    // Salir si los elementos no están presentes en el HTML
    if (!searchInput || !searchModal || !resultsList) return;
    
    const productManager = new ProductManager(); 
    let searchTimeout; // Para manejar el debounce

    /**
     * Dibuja los resultados en la lista y controla la visibilidad del modal.
     * @param {Array} products - Lista de objetos producto {nombre, imagen_url, id}.
     */
    function renderResults(products) {
        resultsList.innerHTML = ''; 
        
        // Determinar si hay resultados para mostrar
        if (products.length > 0) {
            products.forEach(product => {
                const item = document.createElement('li');
                item.classList.add('search-result-item');
                
                // Construir la URL de redirección a la página de detalle
                const productDetailURL = `detalle_producto.html?id=${product.id}`; 
                
                item.onclick = (e) => {
                    e.preventDefault(); 
                    
                    // 1. Limpiar el input
                    searchInput.value = ''; 
                    
                    // 2. Ocultar el modal
                    searchModal.classList.add('hidden');
                    
                    // 3. Redirigir a la página de detalle
                    window.location.href = productDetailURL;
                };

                // Estructura del resultado (debe coincidir con tu CSS/HTML)
                item.innerHTML = `
                    <img src="${product.imagen_url || 'imagenes/placeholder.png'}" alt="${product.nombre}" class="result-img">
                    <p class="result-name">${product.nombre}</p>
                `;
                resultsList.appendChild(item);
            });
            searchModal.classList.remove('hidden'); // Mostrar modal con resultados

        } else if (searchInput.value.trim().length >= 3) {
            // Mostrar modal con mensaje de "No resultados"
            const li = document.createElement("li");
            li.textContent = "No se encontraron resultados.";
            li.classList.add("no-results");
            resultsList.appendChild(li);
            searchModal.classList.remove('hidden'); 

        } else {
            // Ocultar modal si el término es muy corto o vacío
             searchModal.classList.add('hidden');
        }
    }

    /**
     * Maneja la entrada de usuario con debounce (retraso de 300ms).
     */
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();

        clearTimeout(searchTimeout); 
        
        // Ocultar si el término es muy corto
        if (searchTerm.length < 3) {
            searchModal.classList.add('hidden'); 
            return;
        }

        // Aplicar debounce: esperar 300ms antes de enviar la consulta a Supabase
        searchTimeout = setTimeout(async () => {
            const products = await productManager.searchProductsByName(searchTerm); 
            renderResults(products);
        }, 300);
    });
    
    // Ocultar el modal al hacer clic en cualquier lugar fuera del input y el modal
    document.addEventListener('click', (e) => {
        const isClickInside = searchInput.contains(e.target) || searchModal.contains(e.target);
        
        if (!isClickInside) {
            searchModal.classList.add('hidden');
        }
    });

    // Ocultar el modal al presionar ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchModal.classList.add('hidden');
        }
    });
});