// Asegúrate de inicializar tu cliente Supabase, aunque no se usa en la lógica directa del carrito
// Por si acaso, si la clase Producto requiere alguna conexión, la importamos.
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
 * Guarda el carrito en localStorage.
 * @param {Array<Object>} carrito - Lista de productos a guardar.
 */
const saveCarrito = (carrito) => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
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

    // Crear una instancia de la clase Producto para usar sus propiedades y lógica
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
            // Aquí puedes añadir cualquier otro dato esencial para la visualización del carrito
            categoria_nombre: producto.id_categoria?.nombre || 'General',
            cantidad: cantidad,
        });
    }

    // 4. Guardar y actualizar la vista
    saveCarrito(carrito);
    console.log(`Producto ${producto.nombre} (x${cantidad}) añadido al carrito. Total items: ${carrito.length}`);
    alert(`Se añadió ${producto.nombre} al carrito.`); // Notificación simple
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
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    // 1. Actualizar el contador en el header
    const cartCountSpan = document.querySelector('header .shopping_cart + span');
    if (cartCountSpan) {
        cartCountSpan.textContent = totalItems;
    }

    // 2. Actualizar el precio total en el header
    const cartPriceSpan = document.querySelector('header .shopping_cart').closest('a').querySelector('.xl\\:flex:last-child .text-sm:last-child');
    if (cartPriceSpan) {
        cartPriceSpan.textContent = `$${subtotal.toFixed(2)}`;
    }

    // 3. Actualizar el contenido del modal (Esto es más complejo y requerirá una plantilla)
    const listContainer = document.querySelector('#cart-modal .flow-root ul');
    const subtotalModal = document.querySelector('#cart-modal .justify-between p:last-child');

    if (listContainer) {
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

        // Si el carrito está vacío, muestra un mensaje
        if (carrito.length === 0) {
            listContainer.innerHTML = '<li class="text-center text-gray-500 py-10">Tu carrito está vacío.</li>';
            subtotalModal.textContent = 'Bs 0.00';
        } else {
            subtotalModal.textContent = `Bs ${subtotal.toFixed(2)}`;
        }

        // Re-añadir listeners para eliminar/cambiar cantidad DENTRO del modal
        addModalListeners();
    }
};

/**
 * Añade listeners a los botones de eliminar y actualizar cantidad dentro del modal del carrito.
 */
function addModalListeners() {
    // Listener para eliminar producto
    document.querySelectorAll('.cart-remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            removeProductFromCart(id);
        });
    });

    // Listener para actualizar cantidad
    document.querySelectorAll('.cart-update-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const action = e.currentTarget.dataset.action;
            updateProductQuantity(id, action);
        });
    });
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
                return; // Salir de la función para evitar el saveCarrito duplicado
            }
        }
    }
    saveCarrito(carrito);
}

// =========================================================
// LISTENERS PRINCIPALES DEL CATÁLOGO
// =========================================================

/**
 * Añade los listeners de click a todos los botones 'Añadir al Carrito' 
 * que se cargaron dinámicamente en el catálogo (index.html o productos.html).
 */
const agregarListenersCatalogo = () => {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');

    console.log(`Intentando añadir listeners a ${addToCartButtons.length} botones de carrito.`);

    addToCartButtons.forEach(button => {
        // Remover cualquier listener previo para evitar duplicados
        button.removeEventListener('click', handleAddToCartClick);

        // Añadir el nuevo listener
        button.addEventListener('click', handleAddToCartClick);
    });

    // También añadimos listeners a los botones de incrementar/decrementar en productos.js
    // Solo si estamos en productos.html
    const isProductPage = document.getElementById('productos-listado');
    if (isProductPage) {
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

    // Intentar encontrar el input de cantidad asociado si existe (esto es más común en productos.html)
    const quantityInput = e.currentTarget.closest('.producto')?.querySelector('.cantidad-input');

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
 * Añade listeners a los botones de cantidad en la vista de catálogo (usada en productos.js).
 */
function addProductPageQuantityListeners() {
    document.querySelectorAll('.incrementar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const input = document.querySelector(`.cantidad-input[data-id="${id}"]`);
            if (input) {
                let current = parseInt(input.value);
                input.value = (current + 1).toString();
            }
        });
    });

    document.querySelectorAll('.decrementar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const input = document.querySelector(`.cantidad-input[data-id="${id}"]`);
            if (input) {
                let current = parseInt(input.value);
                if (current > 1) {
                    input.value = (current - 1).toString();
                }
            }
        });
    });
}


// =========================================================
// INICIALIZACIÓN
// =========================================================

// Inicializar la vista del carrito al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCartDisplay();
});

// Exportar la función clave para ser usada en productmanager.js y productos.js
export { agregarListenersCatalogo };