import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';
import { agregarProductoPorID } from './carrito.js'; 

/**
 * Función principal que carga los datos del producto desde Supabase
 */
async function cargarDetalleProducto() {
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    const container = document.getElementById('detalle-producto-container');
    const relacionadosContainer = document.getElementById('productos-relacionados-container');

    if (!productoId) {
        if (container) container.innerHTML = '<h2 class="text-center py-20 text-xl font-bold">Producto no especificado.</h2>';
        return;
    }

    try {
        // Consultamos el producto y su categoría asociada (JOIN)
        let { data: productoData, error: prodError } = await supabase
            .from('producto')
            .select(`
                *,
                categoria:id_categoria (id, nombre)
            `)
            .eq('id', productoId)
            .single();

        if (prodError || !productoData) {
            console.error('Error al obtener producto:', prodError);
            container.innerHTML = '<h2 class="text-center py-20 text-xl font-bold">El producto no existe.</h2>';
            return;
        }

        const producto = new Producto(productoData);
        const nombreCat = productoData.categoria?.nombre || 'General';

        // 1. Actualizar el Breadcrumb con nombres reales
        actualizarBreadcrumb(nombreCat, producto.nombre);

        // 2. Renderizar la interfaz con los spans solicitados
        renderizarInterfaz(producto, container, nombreCat);

        // 3. Cargar sugerencias
        if (productoData.id_categoria) {
            cargarSugerencias(producto.id, productoData.id_categoria, relacionadosContainer);
        }

        // 4. Configurar listeners de botones (cantidad y carrito)
        configurarInteracciones(producto);

    } catch (error) {
        console.error("Error crítico en el detalle:", error);
    }
}

/**
 * Actualiza el breadcrumb usando el nombre para el enlace de categoría
 */
function actualizarBreadcrumb(catNombre, prodNombre) {
    const linkCat = document.getElementById('breadcrumb-categoria-link');
    const spanProd = document.getElementById('breadcrumb-producto-nombre');

    if (linkCat) {
        linkCat.textContent = catNombre;
        // Se envía el NOMBRE a productos.html para que el filtro funcione correctamente
        linkCat.href = `productos.html?categoria=${encodeURIComponent(catNombre)}`;
    }
    if (spanProd) {
        spanProd.textContent = prodNombre;
    }
}

/**
 * Genera el HTML dinámico inyectando los spans de confianza debajo del botón
 */
function renderizarInterfaz(producto, container, nombreCat) {
    const agotado = producto.estaAgotado();
    const precioFmt = producto.getPrecioFormateado();

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div class="relative bg-white dark:bg-surface-dark rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 group">
                <img src="${producto.imagen_url}" alt="${producto.nombre}" 
                     class="w-full aspect-square object-contain p-8 group-hover:scale-105 transition-transform duration-700">
                ${agotado ? `
                    <div class="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <span class="bg-red-600 text-white px-8 py-2 rounded-full font-bold text-xl uppercase tracking-widest">Agotado</span>
                    </div>
                ` : ''}
            </div>

            <div class="flex flex-col space-y-6">
                <div>
                    <span class="text-primary font-bold uppercase tracking-[0.2em] text-sm">${nombreCat}</span>
                    <h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mt-2 leading-tight">${producto.nombre}</h1>
                </div>

                <div class="bg-secondary/10 dark:bg-gray-800/50 p-6 rounded-3xl border border-secondary/20">
                    <div class="flex items-baseline gap-2">
                        <span class="text-5xl font-black text-primary">Bs. ${precioFmt}</span>
                    </div>
                    <p class="text-sm mt-2 ${agotado ? 'text-red-500' : 'text-gray-500'} font-medium">
                        Stock disponible: ${producto.stock} unidades
                    </p>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mt-6">
                        <div class="flex items-center border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 h-14 overflow-hidden">
                            <button id="btn-menos" class="px-5 h-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-xl">-</button>
                            <span id="cant-num" class="w-12 text-center font-bold text-xl">1</span>
                            <button id="btn-mas" class="px-5 h-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-xl">+</button>
                        </div>
                        <button id="btn-add-cart" 
                                class="flex-grow bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed" 
                                ${agotado ? 'disabled' : ''}>
                            ${agotado ? 'SIN EXISTENCIAS' : 'AÑADIR AL CARRITO'}
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span class="material-icons text-primary text-xl">verified_user</span>
                            </div>
                            <div>
                                <span class="block text-sm font-bold text-gray-900 dark:text-white leading-tight">Calidad Garantizada</span>
                                <span class="text-[11px] text-gray-500 dark:text-gray-400"></span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span class="material-icons text-primary text-xl">lock</span>
                            </div>
                            <div>
                                <span class="block text-sm font-bold text-gray-900 dark:text-white leading-tight">Pago Seguro</span>
                                <span class="text-[11px] text-gray-500 dark:text-gray-400"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-4">
                    <h3 class="text-xl font-bold mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                        <span class="material-icons text-primary">description</span> Descripción
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed text-lg italic">
                        ${producto.descripcion || 'Este producto no cuenta con una descripción detallada todavía.'}
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Lógica de botones de cantidad y envío al carrito
 */
function configurarInteracciones(producto) {
    const btnMas = document.getElementById('btn-mas');
    const btnMenos = document.getElementById('btn-menos');
    const displayCant = document.getElementById('cant-num');
    const btnAdd = document.getElementById('btn-add-cart');

    if (!btnAdd) return;

    btnMas.onclick = () => {
        let cantidad = parseInt(displayCant.textContent);
        if (cantidad < producto.stock) {
            displayCant.textContent = cantidad + 1;
        }
    };

    btnMenos.onclick = () => {
        let cantidad = parseInt(displayCant.textContent);
        if (cantidad > 1) {
            displayCant.textContent = cantidad - 1;
        }
    };

    btnAdd.onclick = async () => {
        const cantidadFinal = parseInt(displayCant.textContent);
        const exito = await agregarProductoPorID(producto.id, cantidadFinal);

        if (exito) {
            // Efecto visual de éxito en el botón
            const textoOriginal = btnAdd.innerHTML;
            btnAdd.innerHTML = `<span class="material-icons">check_circle</span> ¡AGREGADO!`;
            btnAdd.classList.replace('bg-primary', 'bg-green-600');

            setTimeout(() => {
                btnAdd.innerHTML = textoOriginal;
                btnAdd.classList.replace('bg-green-600', 'bg-primary');
                displayCant.textContent = "1";
            }, 2500);
        }
    };
}

/**
 * Renderiza productos de la misma categoría
 */
async function cargarSugerencias(pid, cid, container) {
    const { data } = await supabase
        .from('producto')
        .select('*')
        .eq('id_categoria', cid)
        .neq('id', pid)
        .eq('visible', true)
        .limit(4);

    if (!data || data.length === 0) return;

    container.innerHTML = `
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Productos Relacionados</h2>
            <a href="productos.html" class="text-primary hover:text-primary-dark font-bold flex items-center gap-1 group">
                Ver todo <span class="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </a>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            ${data.map(p => `
                <a href="detalle_producto.html?id=${p.id}" class="group block bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all">
                    <div class="aspect-square rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden mb-4">
                        <img src="${p.imagen_url}" class="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500">
                    </div>
                    <h4 class="font-bold text-gray-900 dark:text-white truncate text-sm">${p.nombre}</h4>
                    <p class="text-primary font-bold mt-1">Bs. ${p.precio.toFixed(2)}</p>
                </a>
            `).join('')}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', cargarDetalleProducto);