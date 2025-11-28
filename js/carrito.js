// =========================================================
// LÓGICA DE APERTURA Y CIERRE DEL CARRITO
// =========================================================
document.querySelector(".cart img").addEventListener("click", () => {
    document.querySelector(".cart-container").classList.toggle("active");
});

document.querySelector(".close-cart").addEventListener("click", () => {
    document.querySelector(".cart-container").classList.remove("active");
});

let carrito = [];

// 🚀 Cargar carrito desde `localStorage` al abrir cualquier página
function cargarCarritoDesdeLocalStorage() {
    let carritoGuardado = localStorage.getItem("carrito");
    if (carritoGuardado) {
        try {
            carrito = JSON.parse(carritoGuardado);
        } catch (error) {
            console.error("Error al cargar el carrito:", error);
            carrito = [];
        }
    } else {
        carrito = [];
    }
    actualizarCarrito();
}

// Guardar carrito en `localStorage`
function guardarCarritoEnLocalStorage() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

// =========================================================
// LÓGICA DE PRODUCTOS DE CATÁLOGO (USANDO .producto)
// =========================================================

// 🔹 Detectar clic en los botones "AGREGAR" de los productos de catálogo
export function agregarListenersCatalogo() {
    document.querySelectorAll(".agregar").forEach((boton) => {
        boton.addEventListener("click", () => {
            // Buscamos el contenedor padre con la clase '.producto'
            let producto = boton.closest(".producto");

            if (!producto) return;

            // 🛑 CORRECCIÓN/OPTIMIZACIÓN: Leer el data-id directamente del botón (ya es string)
            let id = boton.getAttribute("data-id");
            let nombre = producto.querySelector("h3").textContent;
            // El precio se lee del atributo data-precio del contenedor .producto
            let precio = parseFloat(producto.getAttribute("data-precio"));

            // Usamos el input de cantidad asociado al producto
            let cantidadInput = producto.querySelector(".cantidad-input");
            let cantidad = parseInt(cantidadInput.value);

            let imagen = producto.querySelector("img").src;

            // Llamamos a la función unificada de agregar
            agregarProductoPorID(id, cantidad, nombre, precio, imagen);

            // Reiniciar la cantidad en el input del catálogo a 1 después de agregar
            cantidadInput.value = 1;
        });
    });

    // Añadir listeners para los botones de incrementar/decrementar del catálogo
    document.querySelectorAll(".incrementar").forEach(boton => {
        boton.addEventListener("click", () => {
            const input = boton.closest(".cantidad").querySelector(".cantidad-input");
            // Asegúrate de no exceder el stock (aunque esto requeriría consultar Supabase aquí)
            input.value = parseInt(input.value) + 1;
        });
    });

    document.querySelectorAll(".decrementar").forEach(boton => {
        boton.addEventListener("click", () => {
            const input = boton.closest(".cantidad").querySelector(".cantidad-input");
            let cantidad = parseInt(input.value);
            if (cantidad > 1) {
                input.value = cantidad - 1;
            }
        });
    });
}

// 🛑 FUNCIÓN UNIFICADA DE AGREGAR PRODUCTO (EXPORTADA)
// USADA POR catálogo (productos.js) y detalle de producto (detalleProducto.js)
export async function agregarProductoPorID(id, cantidad, nombre = null, precio = null, imagen = null) {

    // ✅ CORRECCIÓN CLAVE: Convertir el ID de entrada a string para asegurar la consistencia.
    const idString = String(id);

    // 🛑 CORRECCIÓN CLAVE: Buscamos el producto en el carrito por ID, asegurando que
    // AMBOS IDs (el nuevo y los existentes) sean tratados como strings.
    let existe = carrito.find(item => String(item.id) === idString);

    if (existe) {
        // El producto ya está, SUMAMOS la cantidad.
        existe.cantidad += cantidad;
    } else if (nombre && precio) {
        // Es un producto nuevo, lo agregamos, usando el ID ya convertido a string.
        carrito.push({ id: idString, nombre, precio, cantidad, imagen });
    } else {
        console.error("No se puede agregar el producto: faltan datos (nombre o precio).");
        return false;
    }

    guardarCarritoEnLocalStorage();
    actualizarCarrito();

    // Muestra el carrito
    document.querySelector(".cart-container").classList.add("active");

    return true;
}


// =========================================================
// LÓGICA DEL CARRITO (RENDERIZADO Y MANIPULACIÓN)
// =========================================================

function actualizarCarrito() {
    let contenedor = document.querySelector(".cart-items");
    contenedor.innerHTML = "";

    let total = 0;
    let totalProductos = 0;

    carrito.forEach((producto) => {
        let div = document.createElement("div");
        div.classList.add("cart-item");

        let nombreCorto = producto.nombre.length > 30 ? producto.nombre.substring(0, 30) + "..." : producto.nombre;
        let subtotal = (producto.precio * producto.cantidad).toFixed(2).replace(".", ",");
        totalProductos += producto.cantidad;

        div.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <span>${nombreCorto}</span>
            <div class="cantidad">
                <button class="decrementar-carrito" data-id="${producto.id}">-</button>
                <span>${producto.cantidad}</span>
                <button class="incrementar-carrito" data-id="${producto.id}">+</button>
            </div>
            <span class="subtotal">Bs. ${subtotal}</span>
            <button class="eliminar" data-id="${producto.id}">
                <img src="https://img.icons8.com/ios-filled/50/trash.png" alt="Eliminar">
            </button>
        `;
        contenedor.appendChild(div);

        total += producto.precio * producto.cantidad;
    });

    let cartCount = document.querySelector(".cart-count");
    cartCount.textContent = totalProductos > 0 ? totalProductos : "";
    cartCount.style.display = totalProductos > 0 ? "flex" : "none";

    document.querySelector(".total-price").textContent = `Total: Bs. ${total.toFixed(2).replace(".", ",")}`;

    guardarCarritoEnLocalStorage();

    // 🛑 Listener para ELIMINAR
    document.querySelectorAll(".eliminar").forEach((boton) => {
        boton.addEventListener("click", () => {
            const idEliminar = boton.getAttribute("data-id");
            let item = boton.closest(".cart-item");

            item.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
            item.style.opacity = "0";
            item.style.transform = "scale(0.8)";

            setTimeout(() => {
                // Aseguramos que el ID del carrito y el ID a eliminar sean strings para la comparación
                carrito = carrito.filter(item => String(item.id) !== idEliminar);
                actualizarCarrito();
            }, 300);
        });
    });

    // 🛑 Listener para INCREMENTAR
    document.querySelectorAll(".incrementar-carrito").forEach((boton) => {
        boton.addEventListener("click", () => {
            const idIncrementar = boton.getAttribute("data-id");
            // Aseguramos que el ID del carrito sea string para la búsqueda
            let itemIndex = carrito.findIndex(item => String(item.id) === idIncrementar);
            if (itemIndex > -1) {
                carrito[itemIndex].cantidad++;
                actualizarCarrito();
            }
        });
    });

    // 🛑 Listener para DECREMENTAR
    document.querySelectorAll(".decrementar-carrito").forEach((boton) => {
        boton.addEventListener("click", () => {
            const idDecrementar = boton.getAttribute("data-id");
            // Aseguramos que el ID del carrito sea string para la búsqueda
            let itemIndex = carrito.findIndex(item => String(item.id) === idDecrementar);

            if (itemIndex > -1 && carrito[itemIndex].cantidad > 1) {
                carrito[itemIndex].cantidad--;
                actualizarCarrito();
            }
        });
    });
}


// 🛒 Vaciar carrito
document.querySelector(".vaciar-carrito").addEventListener("click", () => {
    carrito = [];
    localStorage.removeItem("carrito");
    actualizarCarrito();
    alert("¡Carrito vacío! Puedes empezar una nueva compra.");
});


// 🔹 Cerrar carrito cuando se toca fuera de la ventana, pero NO si se hace clic en botones internos
document.addEventListener("click", (event) => {
    const cartContainer = document.querySelector(".cart-container");
    const cartIcon = document.querySelector(".cart img");

    if (cartContainer && cartIcon) { // Verificar si los elementos existen
        // Comprobar si el clic no está en el contenedor del carrito, ni en el ícono
        // ni en ninguno de los botones de acción dentro del carrito.
        if (!cartContainer.contains(event.target) &&
            !cartIcon.contains(event.target) &&
            !event.target.classList.contains("incrementar-carrito") &&
            !event.target.classList.contains("decrementar-carrito") &&
            !event.target.classList.contains("eliminar") &&
            !event.target.classList.contains("vaciar-carrito") &&
            !event.target.classList.contains("finalizar-compra") &&
            !event.target.closest(".eliminar")) {
            cartContainer.classList.remove("active");
        }
    }
});

// 🚀 Cargar el carrito cuando se abre cualquier página
cargarCarritoDesdeLocalStorage();