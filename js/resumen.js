// js/resumen.js
import { AuthManager } from './authManager.js';

// 1. INICIALIZACIÓN
const authManager = new AuthManager();
let carrito = [];

// Elementos del DOM
const resumenContenedor = document.getElementById('contenedor-resumen');
const btnEnviarWhatsApp = document.getElementById('btn-enviar-cotizacion');

/**
 * 2. CARGA DEL CARRITO
 */
function cargarCarrito() {
    const carritoJson = localStorage.getItem('carrito');
    carrito = carritoJson ? JSON.parse(carritoJson) : [];
    mostrarResumenCarrito();
}

/**
 * 3. RENDERIZADO DE LA VISTA (Sin Categorías)
 */
function mostrarResumenCarrito() {
    if (!resumenContenedor) return;
    resumenContenedor.innerHTML = "";

    if (carrito.length === 0) {
        resumenContenedor.innerHTML = `
            <div class="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <span class="material-icons text-6xl text-gray-300 mb-4">shopping_basket</span>
                <p class="text-gray-500 dark:text-gray-400 text-xl font-medium">Tu carrito está vacío</p>
                <a href="index.html" class="mt-4 inline-flex items-center text-primary font-bold hover:underline">
                    <span class="material-icons mr-1">arrow_back</span> Explorar productos
                </a>
            </div>`;
        return;
    }

    carrito.forEach((item, index) => {
        const itemHTML = `
            <div class="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
                <div class="flex items-center gap-6 flex-grow w-full">
                    <a href="detalle_producto.html?id=${item.id}" class="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-700 overflow-hidden group">
                        ${item.imagen_url 
                            ? `<img src="${item.imagen_url}" alt="${item.nombre}" class="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"/>` 
                            : `<span class="material-symbols-outlined text-primary/40 text-5xl">package_2</span>`}
                    </a>
                    
                    <div class="flex-grow">
                        <a href="detalle_producto.html?id=${item.id}" class="inline-block group">
                            <h3 class="font-bold text-gray-900 dark:text-white text-lg leading-tight group-hover:text-primary transition-colors">
                                ${item.nombre}
                            </h3>
                        </a>
                        
                        <p class="text-primary font-extrabold mt-2 text-lg italic">
                            Bs ${parseFloat(item.precio).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div class="flex flex-col items-center gap-3 w-full md:w-auto">
                    <div class="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-inner">
                        <button onclick="cambiarCantidad(${index}, -1)" class="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <span class="material-icons text-lg">remove</span>
                        </button>
                        <input class="w-12 text-center border-0 bg-transparent p-0 text-gray-900 dark:text-white font-bold focus:ring-0" 
                               type="number" value="${item.cantidad}" readonly />
                        <button onclick="cambiarCantidad(${index}, 1)" class="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <span class="material-icons text-lg">add</span>
                        </button>
                    </div>
                    <button onclick="eliminarDelResumen(${index})" class="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest transition-colors">
                        <span class="material-icons text-sm">delete_outline</span> Eliminar
                    </button>
                </div>
            </div>
        `;
        resumenContenedor.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// 4. FUNCIONES DE ACTUALIZACIÓN
window.cambiarCantidad = (index, delta) => {
    carrito[index].cantidad += delta;
    if (carrito[index].cantidad < 1) carrito[index].cantidad = 1;
    actualizarEstado();
};

window.eliminarDelResumen = (index) => {
    if(confirm("¿Estás seguro de eliminar este producto?")) {
        carrito.splice(index, 1);
        actualizarEstado();
    }
};

function actualizarEstado() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
    mostrarResumenCarrito();
}

/**
 * 5. LÓGICA DE ENVÍO POR WHATSAPP
 */
function enviarWhatsApp(e) {
    if(e) e.preventDefault();

    const nombre = document.getElementById('cliente-nombre')?.value.trim();
    const apellido = document.getElementById('cliente-apellido')?.value.trim();
    const correo = document.getElementById('cliente-correo')?.value.trim();
    const ciudad = document.getElementById('cliente-ciudad')?.value.trim();
    const empresa = document.getElementById('cliente-empresa')?.value.trim();

    if (!nombre || !apellido || !correo) {
        alert("Por favor, completa los campos obligatorios (*)");
        return;
    }

    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    let mensaje = `*📦 NUEVA SOLICITUD DE COTIZACIÓN - GEEK NATURAL*\n\n`;
    mensaje += `*DATOS DEL CLIENTE:*\n`;
    mensaje += `👤 *Nombre:* ${nombre} ${apellido}\n`;
    mensaje += `📍 *Ciudad:* ${ciudad || 'No especificada'}\n`;
    mensaje += `📧 *Email:* ${correo}\n`;
    if(empresa) mensaje += `🏢 *Empresa:* ${empresa}\n`;
    
    mensaje += `\n*🛒 DETALLE DEL PEDIDO:*\n`;
    mensaje += `----------------------------\n`;

    let totalGlobal = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        mensaje += `• ${item.nombre}\n`;
        mensaje += `   Cant: ${item.cantidad} x Bs ${item.precio} = *Bs ${subtotal.toFixed(2)}*\n`;
        totalGlobal += subtotal;
    });

    mensaje += `----------------------------\n`;
    mensaje += `*💰 TOTAL ESTIMADO: Bs ${totalGlobal.toFixed(2)}*\n\n`;
    mensaje += `_Por favor, contactarme para coordinar el pago y la entrega._`;

    const numeroTienda = "59170000000"; 
    const url = `https://wa.me/${numeroTienda}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// 6. EVENTOS INICIALES
document.addEventListener('DOMContentLoaded', () => {
    cargarCarrito();
    if (btnEnviarWhatsApp) {
        btnEnviarWhatsApp.addEventListener('click', enviarWhatsApp);
    }
});