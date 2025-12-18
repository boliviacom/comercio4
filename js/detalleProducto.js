import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';
import { agregarProductoPorID } from './carrito.js'; 

let recursosGaleria = [];
let indiceActual = 0;

async function cargarDetalleProducto() {
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    const container = document.getElementById('detalle-producto-container');
    const relacionadosContainer = document.getElementById('productos-relacionados-container');

    if (!productoId) return;

    try {
        let { data: productoData, error: prodError } = await supabase
            .from('producto')
            .select(`*, categoria:id_categoria (id, nombre), galeria_producto (*)`)
            .eq('id', productoId)
            .order('orden', { foreignTable: 'galeria_producto', ascending: true })
            .single();

        if (prodError || !productoData) return;

        const producto = new Producto(productoData);
        const nombreCat = productoData.categoria?.nombre || 'General';

        recursosGaleria = [
            { url: producto.imagen_url, tipo: 'imagen' },
            ...(productoData.galeria_producto || [])
        ];

        actualizarBreadcrumb(nombreCat, producto.nombre);
        renderizarInterfaz(producto, container, nombreCat);

        if (productoData.id_categoria) {
            cargarSugerencias(producto.id, productoData.id_categoria, relacionadosContainer);
        }

        setupCarouselLogic();
        configurarInteracciones(producto);

    } catch (error) {
        console.error("Error:", error);
    }
}

function renderizarInterfaz(producto, container, nombreCat) {
    const agotado = producto.estaAgotado();
    const precioFmt = producto.getPrecioFormateado();
    const primerRecurso = recursosGaleria[0];

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start px-4 md:px-0">
            
            <div class="flex flex-col gap-4 md:gap-6 w-full max-w-2xl mx-auto lg:max-w-none">
                <div class="relative w-full bg-[#FAFAFA] dark:bg-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-700 aspect-square flex items-center justify-center shadow-sm">
                    <div id="main-gallery-display" class="w-full h-full flex items-center justify-center p-4 md:p-8">
                        ${renderizarRecurso(primerRecurso.url, primerRecurso.tipo, 'w-full h-full object-contain')}
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between gap-2 md:gap-4">
                        <button id="prev-media" class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow hover:bg-primary hover:text-white transition-all active:scale-90">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        
                        <div id="thumbnails-preview" class="flex gap-2 overflow-x-auto scrollbar-hide py-2 snap-x">
                            ${recursosGaleria.map((rec, i) => `
                                <div class="thumb-item w-14 h-14 md:w-20 md:h-20 rounded-xl border-2 transition-all flex-shrink-0 overflow-hidden cursor-pointer snap-center ${i === 0 ? 'border-primary' : 'border-transparent'}" data-index="${i}">
                                    ${rec.tipo === 'video' 
                                        ? `<video src="${rec.url}#t=0.1" class="w-full h-full object-cover"></video>` 
                                        : `<img src="${rec.url}" class="w-full h-full object-cover">`
                                    }
                                </div>
                            `).join('')}
                        </div>

                        <button id="next-media" class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow hover:bg-primary hover:text-white transition-all active:scale-90">
                            <span class="material-icons">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex flex-col space-y-4 md:space-y-6">
                <div class="text-center lg:text-left">
                    <span class="text-primary font-bold uppercase tracking-widest text-xs md:text-sm">${nombreCat}</span>
                    <h1 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mt-2 leading-tight">
                        ${producto.nombre}
                    </h1>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800/50 p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div class="flex flex-col items-center lg:items-start mb-4">
                        <span class="text-4xl md:text-5xl font-black text-primary">Bs. ${precioFmt}</span>
                        <span class="text-sm font-bold mt-2 ${agotado ? 'text-red-500' : 'text-gray-500'}">
                            ${agotado ? '¡AGOTADO!' : `Stock disponible: ${producto.stock} unidades`}
                        </span>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mt-6">
                        <div class="flex items-center justify-between border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 h-14 overflow-hidden w-full sm:w-auto">
                            <button id="btn-menos" class="px-6 h-full hover:text-primary transition-colors font-bold text-xl">-</button>
                            <span id="cant-num" class="w-10 text-center font-bold text-xl">1</span>
                            <button id="btn-mas" class="px-6 h-full hover:text-primary transition-colors font-bold text-xl">+</button>
                        </div>
                        <button id="btn-add-cart" class="flex-grow bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl h-14 transition-all shadow-lg active:scale-95 disabled:opacity-50" ${agotado ? 'disabled' : ''}>
                            AÑADIR AL CARRITO
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div class="flex items-center gap-2 md:gap-3">
                            <span class="material-icons text-primary text-xl md:text-2xl">verified_user</span>
                            <span class="text-[10px] md:text-xs font-bold uppercase">Calidad Garantizada</span>
                        </div>
                        <div class="flex items-center gap-2 md:gap-3">
                            <span class="material-icons text-primary text-xl md:text-2xl">lock</span>
                            <span class="text-[10px] md:text-xs font-bold uppercase">Pago Seguro</span>
                        </div>
                    </div>
                </div>

                <div class="px-2 lg:px-0">
                    <h3 class="text-lg font-bold mb-2 flex items-center gap-2">
                        <span class="material-icons text-primary">notes</span> Descripción
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 italic leading-relaxed text-sm md:text-base">
                        ${producto.descripcion || 'Sin descripción.'}
                    </p>
                </div>
            </div>
        </div>
    `;
}

// ... (Las funciones setupCarouselLogic, renderizarRecurso, configurarInteracciones, 
//      actualizarBreadcrumb y cargarSugerencias se mantienen igual que en la respuesta anterior)

function setupCarouselLogic() {
    const btnPrev = document.getElementById('prev-media');
    const btnNext = document.getElementById('next-media');
    const display = document.getElementById('main-gallery-display');
    const thumbs = document.querySelectorAll('.thumb-item');

    const update = (idx) => {
        indiceActual = idx;
        const rec = recursosGaleria[indiceActual];
        display.innerHTML = renderizarRecurso(rec.url, rec.tipo, 'w-full h-full object-contain animate-fadeIn');
        thumbs.forEach((t, i) => t.classList.toggle('border-primary', i === idx));
        
        // Auto-scroll de la miniatura seleccionada
        const selectedThumb = thumbs[idx];
        if (selectedThumb) {
            selectedThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    if(btnNext) btnNext.onclick = () => update((indiceActual + 1) % recursosGaleria.length);
    if(btnPrev) btnPrev.onclick = () => update((indiceActual - 1 + recursosGaleria.length) % recursosGaleria.length);
    thumbs.forEach(t => t.onclick = () => update(parseInt(t.dataset.index)));
}

function renderizarRecurso(url, tipo, clases) {
    return tipo === 'video' 
        ? `<video src="${url}" class="${clases}" autoplay muted loop playsinline></video>` 
        : `<img src="${url}" class="${clases}">`;
}

function configurarInteracciones(producto) {
    const btnMas = document.getElementById('btn-mas');
    const btnMenos = document.getElementById('btn-menos');
    const displayCant = document.getElementById('cant-num');
    const btnAdd = document.getElementById('btn-add-cart');

    btnMas.onclick = () => {
        let n = parseInt(displayCant.innerText);
        if (n < producto.stock) displayCant.innerText = (n + 1).toString();
    };

    btnMenos.onclick = () => {
        let n = parseInt(displayCant.innerText);
        if (n > 1) displayCant.innerText = (n - 1).toString();
    };

    btnAdd.onclick = async () => {
        const cantidad = parseInt(displayCant.innerText);
        const exito = await agregarProductoPorID(producto.id, cantidad);
        if (exito) {
            displayCant.innerText = "1";
            const originalText = btnAdd.innerText;
            btnAdd.innerText = "¡AÑADIDO!";
            btnAdd.classList.add('bg-green-600');
            setTimeout(() => {
                btnAdd.innerText = originalText;
                btnAdd.classList.remove('bg-green-600');
            }, 2000);
        }
    };
}

function actualizarBreadcrumb(catNombre, prodNombre) {
    const linkCat = document.getElementById('breadcrumb-categoria-link');
    const spanProd = document.getElementById('breadcrumb-producto-nombre');
    if (linkCat) {
        linkCat.textContent = catNombre;
        linkCat.href = `productos.html?categoria=${encodeURIComponent(catNombre)}`;
    }
    if (spanProd) spanProd.textContent = prodNombre;
}

async function cargarSugerencias(pid, cid, container) {
    const { data } = await supabase.from('producto').select('*').eq('id_categoria', cid).neq('id', pid).limit(4);
    if (!data || !container) return;
    container.innerHTML = `
        <h2 class="text-xl md:text-2xl font-bold mb-6 px-4 md:px-0">Productos Relacionados</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
            ${data.map(p => `
                <a href="detalle_producto.html?id=${p.id}" class="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
                    <img src="${p.imagen_url}" class="w-full aspect-square object-contain mb-2">
                    <h4 class="font-bold truncate text-xs md:text-sm">${p.nombre}</h4>
                    <p class="text-primary font-bold text-sm">Bs. ${p.precio.toFixed(2)}</p>
                </a>
            `).join('')}
        </div>`;
}

document.addEventListener('DOMContentLoaded', cargarDetalleProducto);