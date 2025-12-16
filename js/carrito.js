// Asegúrate de inicializar tu cliente Supabase, aunque no se usa en la lógica directa del carrito
import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';

// =========================================================
// GESTIÓN DEL CARRITO (LOCAL STORAGE)
// =========================================================

/**
 * Carga el carrito desde localStorage. Si no existe, devuelve un array vacío.
 * @returns {Array<Object>} Lista de productos en el carrito.
 */
const getCarrito = () => {
    const carritoJson = localStorage.getItem('carrito');
    return carritoJson ? JSON.parse(carritoJson) : [];
};

/**
 * Guarda el carrito en localStorage y actualiza la vista.
 * @param {Array<Object>} carrito - Lista de productos a guardar.
 */
const saveCarrito = (carrito) => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
    // Después de guardar, siempre actualizamos la interfaz
    updateCartDisplay();
};

// =========================================================
// FUNCIONES DE MANEJO DE PRODUCTOS EN EL CARRITO
// =========================================================

/**
 * Agrega un producto al carrito o incrementa su cantidad si ya existe.
 * @param {string} productoId - ID del producto a agregar.
 * @param {number} cantidad - Cantidad a agregar (por defecto 1).
 */
async function addProductToCart(productoId, cantidad = 1) {
    const id = parseInt(productoId);
    if (isNaN(id) || id <= 0) {
        console.error("ID de producto no válido:", productoId);
        return;
    }

    // 1. Buscar los datos completos del producto en la base de datos (Supabase)
    const { data: productData, error } = await supabase
        .from('producto')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !productData) {
        console.error('Error al obtener los datos del producto:', error || 'Producto no encontrado');
        return;
    }

    // Usar la clase Producto para manejar los datos
    const producto = new Producto(productData);

    // 2. Obtener el carrito actual
    let carrito = getCarrito();

    // 3. Verificar si el producto ya está en el carrito
    const itemIndex = carrito.findIndex(item => item.id === id);

    if (itemIndex > -1) {
        // El producto ya existe, incrementamos la cantidad
        carrito[itemIndex].cantidad += cantidad;
    } else {
        // El producto no existe, lo agregamos
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen_url: producto.imagen_url,
            // Guardamos el nombre de la categoría para el modal
            categoria_nombre: productData.id_categoria?.nombre || 'General',
            cantidad: cantidad,
        });
    }

    // 4. Guardar y actualizar la vista
    saveCarrito(carrito);
    console.log(`Producto ${producto.nombre} (x${cantidad}) añadido al carrito. Total items: ${carrito.length}`);
    // Se recomienda usar una notificación Toast en lugar de alert() en producción
    alert(`Se añadió ${producto.nombre} al carrito.`);
}

/**
 * Elimina un producto del carrito.
 * @param {number} id - ID del producto.
 */
function removeProductFromCart(id) {
    let carrito = getCarrito();
    carrito = carrito.filter(item => item.id !== id);
    saveCarrito(carrito);
}

/**
 * Actualiza la cantidad de un producto en el carrito.
 * @param {number} id - ID del producto.
 * @param {'increase'|'decrease'} action - Acción a realizar.
 */
function updateProductQuantity(id, action) {
    let carrito = getCarrito();
    const itemIndex = carrito.findIndex(item => item.id === id);

    if (itemIndex > -1) {
        if (action === 'increase') {
            carrito[itemIndex].cantidad++;
        } else if (action === 'decrease') {
            carrito[itemIndex].cantidad--;
            // Si la cantidad llega a 0, eliminar el producto
            if (carrito[itemIndex].cantidad <= 0) {
                removeProductFromCart(id);
                return;
            }
        }
    }
    // Llama a saveCarrito, que a su vez llama a updateCartDisplay() para refrescar todo.
    saveCarrito(carrito);
}

// =========================================================
// ACTUALIZACIÓN DE LA INTERFAZ DE USUARIO (MODAL CARRITO)
// =========================================================

/**
 * Actualiza la vista del carrito (contador en el header y el modal/sidebar).
 */
const updateCartDisplay = () => {
    const carrito = getCarrito();
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    // Recálculo del subtotal
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    // --- Selectores del Header ---
    const cartCountSpan = document.querySelector('header .shopping_cart + span');
    if (cartCountSpan) {
        cartCountSpan.textContent = totalItems;
    }

    // Selector del precio total en el header
    const headerCartLink = document.querySelector('header .shopping_cart').closest('a');
    const cartPriceSpan = headerCartLink ? headerCartLink.querySelector('.xl\\:flex:last-child .text-sm:last-child') : null;
    if (cartPriceSpan) {
        cartPriceSpan.textContent = `Bs. ${subtotal.toFixed(2)}`;
    }

    // --- Selectores del Modal ---
    const listContainer = document.querySelector('#cart-modal .flow-root ul');
    // Selector robusto para el subtotal del modal
    const subtotalModal = document.querySelector('#cart-modal .border-t .justify-between p:last-child');

    if (listContainer && subtotalModal) {
        listContainer.innerHTML = carrito.map(item => `
            <li class="flex py-6" data-id="${item.id}">
                <div
                    class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-gray-700 flex items-center justify-center">
                    ${item.imagen_url ? `<img src="${item.imagen_url}" alt="${item.nombre}" class="object-cover w-full h-full"/>` : `<span class="material-symbols-outlined text-primary/30 text-5xl">package_2</span>`}
                </div>
                <div class="ml-4 flex flex-1 flex-col">
                    <div>
                        <div
                            class="flex justify-between text-base font-medium text-gray-900 dark:text-white">
                            <h3>
                                <a href="detalle_producto.html?id=${item.id}">${item.nombre}</a>
                            </h3>
                            <p class="ml-4">Bs ${(item.precio * item.cantidad).toFixed(2)}</p>
                        </div>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">${item.categoria_nombre || 'General'}</p>
                    </div>
                    <div class="flex flex-1 items-end justify-between text-sm">
                        <div class="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
                            <button class="cart-update-btn px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-md" data-id="${item.id}" data-action="decrease">-</button>
                            <span class="px-2 text-gray-900 dark:text-white font-medium">${item.cantidad}</span>
                            <button class="cart-update-btn px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md" data-id="${item.id}" data-action="increase">+</button>
                        </div>
                        <div class="flex">
                            <button class="cart-remove-btn font-medium text-red-500 hover:text-red-700 flex items-center gap-1 text-xs" data-id="${item.id}" type="button">
                                <span class="material-icons text-sm">delete_outline</span>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        `).join('');

        // Si el carrito está vacío, muestra un mensaje y pone el subtotal a 0.00
        if (carrito.length === 0) {
            listContainer.innerHTML = '<li class="text-center text-gray-500 py-10">Tu carrito está vacío.</li>';
            subtotalModal.textContent = 'Bs 0.00';
        } else {
            // Actualización del subtotal dentro del modal
            subtotalModal.textContent = `Bs ${subtotal.toFixed(2)}`;
        }

        // Re-adjuntar listeners para los nuevos botones (es clave después de innerHTML)
        addModalListeners();
    }
};

/**
 * Añade listeners a los botones de eliminar y actualizar cantidad dentro del modal del carrito.
 */
function addModalListeners() {
    // 1. Listener para eliminar producto
    document.querySelectorAll('#cart-modal .cart-remove-btn').forEach(button => {
        // Usamos remove/add para prevenir duplicados, aunque con innerHTML se reemplazan, es una buena práctica.
        const handler = (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            removeProductFromCart(id);
        };
        button.removeEventListener('click', handler);
        button.addEventListener('click', handler);
    });

    // 2. Listener para actualizar cantidad
    document.querySelectorAll('#cart-modal .cart-update-btn').forEach(button => {
        const handler = (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const action = e.currentTarget.dataset.action;
            updateProductQuantity(id, action);
        };
        button.removeEventListener('click', handler);
        button.addEventListener('click', handler);
    });
}


// =========================================================
// LISTENERS PRINCIPALES DEL CATÁLOGO
// =========================================================

/**
 * Añade los listeners de click a todos los botones 'Añadir al Carrito' 
 * que se cargaron dinámicamente en el catálogo (index.html o productos.html).
 * Esta función es la que se exporta y usa en otros JS.
 */
const agregarListenersCatalogo = () => {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');

    addToCartButtons.forEach(button => {
        // Remover cualquier listener previo para evitar duplicados, esencial para recargas dinámicas
        button.removeEventListener('click', handleAddToCartClick);
        // Añadir el nuevo listener
        button.addEventListener('click', handleAddToCartClick);
    });

    // Solo si estamos en una página de catálogo/productos donde se usa el control de cantidad junto al botón
    if (document.querySelector('.cantidad-input')) {
        addProductPageQuantityListeners();
    }
};

/**
 * Maneja el evento click del botón 'Añadir al Carrito'.
 */
function handleAddToCartClick(e) {
    e.preventDefault();
    const productId = e.currentTarget.dataset.productId;
    let quantity = 1;

    // Buscar el input de cantidad asociado
    const quantityInput = e.currentTarget.closest('.producto, .flex-col, .product-card-detail')?.querySelector('.cantidad-input');

    if (quantityInput) {
        quantity = parseInt(quantityInput.value) || 1;
    }

    if (productId) {
        addProductToCart(productId, quantity);
    } else {
        console.error("ID de producto no encontrado en el botón de carrito.");
    }
}


/**
 * Añade listeners a los botones de cantidad en la vista de catálogo (solo cambia el input local).
 */
function addProductPageQuantityListeners() {
    document.querySelectorAll('.incrementar').forEach(button => {
        button.removeEventListener('click', handleIncrementClick);
        button.addEventListener('click', handleIncrementClick);
    });

    document.querySelectorAll('.decrementar').forEach(button => {
        button.removeEventListener('click', handleDecrementClick);
        button.addEventListener('click', handleDecrementClick);
    });
}

function handleIncrementClick(e) {
    const id = e.currentTarget.dataset.id;
    // Buscamos el input por su clase y data-id
    const input = document.querySelector(`.cantidad-input[data-id="${id}"]`);
    if (input) {
        let current = parseInt(input.value);
        input.value = (current + 1).toString();
    }
}

function handleDecrementClick(e) {
    const id = e.currentTarget.dataset.id;
    // Buscamos el input por su clase y data-id
    const input = document.querySelector(`.cantidad-input[data-id="${id}"]`);
    if (input) {
        let current = parseInt(input.value);
        if (current > 1) {
            input.value = (current - 1).toString();
        }
    }
}


// =========================================================
// INICIALIZACIÓN
// =========================================================

// Inicializar la vista del carrito al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCartDisplay();
});

// Exportar la función clave para ser usada en productmanager.js y productos.js
export { agregarListenersCatalogo, getCarrito, addProductToCart as agregarProductoPorID};