import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';
import { agregarProductoPorID } from './carrito.js';

let recursosGaleria = [];
let indiceActual = 0;

/**
 * INICIALIZACIÓN PRINCIPAL
 */
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

        asegurarEstilosYModal();
        actualizarBreadcrumb(nombreCat, producto.nombre);
        renderizarInterfaz(producto, container, nombreCat);

        if (productoData.id_categoria) {
            cargarSugerencias(producto.id, productoData.id_categoria, relacionadosContainer);
        }

        setupCarouselLogic();
        configurarInteracciones(producto);
        agregarListenersModalZoom();

    } catch (error) {
        console.error("Error cargando producto:", error);
    }
}

/**
 * ESTILOS Y MODAL
 */
function asegurarEstilosYModal() {
    if (!document.getElementById('zoom-styles')) {
        const style = document.createElement('style');
        style.id = 'zoom-styles';
        style.innerHTML = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
            .cursor-zoom-in { cursor: zoom-in; }
            .modal-activo { display: flex !important; opacity: 1 !important; }
            
            #main-gallery-display { 
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                overflow: hidden; 
            }

            .zoom-imagen { transition: transform 0.2s ease-out; }

            #modal-zoom-container { 
                transition: opacity 0.3s ease; 
                display: none; 
                background: rgba(0,0,0,0.95);
                backdrop-filter: blur(8px);
            }

            .video-container-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: black;
            }

            .play-overlay { 
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                display: flex; 
                align-items: center; 
                justify-content: center; 
                cursor: pointer; 
                z-index: 10;
            }

            .play-icon { 
                font-size: 80px !important; 
                color: white; 
                opacity: 0.9;
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.5)); 
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            .play-overlay:hover .play-icon {
                transform: scale(1.1);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('modal-zoom-container')) {
        const modalHTML = `
            <div id="modal-zoom-container" class="fixed inset-0 z-[100] items-center justify-center opacity-0">
                <button id="cerrar-modal" class="absolute top-6 right-6 text-white hover:text-primary transition-all z-[110]">
                    <span class="material-icons text-5xl">close</span>
                </button>
                <div class="relative w-[90%] h-[85%] flex items-center justify-center overflow-hidden">
                    <img id="modalImagen" src="" alt="Zoom" class="max-w-full max-h-full object-contain zoom-imagen cursor-move">
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

/**
 * LÓGICA DE DETECCIÓN DE VIDEO MULTIPLATAFORMA
 */
function obtenerInfoVideo(url) {
    if (!url) return { tipo: 'desconocido', thumb: '' };

    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch) return { tipo: 'youtube', id: ytMatch[1], thumb: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) return { tipo: 'vimeo', id: vimeoMatch[1], thumb: `https://vumbnail.com/${vimeoMatch[1]}.jpg` };

    // Facebook
    if (url.includes('facebook.com')) {
        return { tipo: 'facebook', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' };
    }

    // Instagram
    if (url.includes('instagram.com')) {
        return { tipo: 'instagram', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' };
    }

    // TikTok
    if (url.includes('tiktok.com')) {
        return { tipo: 'tiktok', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' };
    }

    // Archivo Local (.mp4, etc)
    const esArchivo = url.match(/\.(mp4|webm|ogg|mov)$/i);
    return { tipo: 'local', thumb: url, esArchivo: !!esArchivo };
}

/**
 * RENDERIZADO DE RECURSOS
 */
function renderizarRecurso(url, tipo, clases) {
    if (tipo === 'video') {
        const info = obtenerInfoVideo(url);
        if (info.esArchivo) {
            return `<video src="${url}" class="${clases}" controls playsinline preload="metadata"></video>`;
        } else {
            const dataVideo = info.id || info.url;
            return `
                <div class="video-container-wrapper group" onclick="cargarIframeExterno(this, '${info.tipo}', '${dataVideo}')">
                    <img src="${info.thumb}" class="${clases} opacity-60 group-hover:opacity-80 transition-opacity object-cover">
                    <div class="play-overlay">
                        <span class="material-icons play-icon">play_circle_filled</span>
                    </div>
                </div>`;
        }
    }
    return `<img src="${url}" class="${clases}">`;
}

/**
 * CARGADOR DE IFRAMES EXTERNOS
 */
window.cargarIframeExterno = function (contenedor, tipo, info) {
    let html = '';
    const encodedUrl = encodeURIComponent(info);

    switch (tipo) {
        case 'youtube':
            html = `<iframe src="https://www.youtube.com/embed/${info}?autoplay=1" class="w-full h-full border-0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
            break;
        case 'vimeo':
            html = `<iframe src="https://player.vimeo.com/video/${info}?autoplay=1" class="w-full h-full border-0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
            break;
        case 'facebook':
            html = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&t=0&autoplay=1" class="w-full h-full border-0" scrolling="no" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
            break;
        case 'instagram':
            let instaUrl = info.endsWith('/') ? info : info + '/';
            html = `<iframe src="${instaUrl}embed" class="w-full h-full border-0" scrolling="no" allowtransparency="true"></iframe>`;
            break;
        case 'tiktok':
            const videoId = info.split('/video/')[1]?.split('?')[0];
            html = `<iframe src="https://www.tiktok.com/embed/v2/${videoId}" class="w-full h-full border-0" allowfullscreen></iframe>`;
            break;
        default:
            html = `<p class="text-white">Plataforma no soportada</p>`;
    }

    contenedor.innerHTML = html;
};

/**
 * RENDERIZADO INTERFAZ
 */
function renderizarInterfaz(producto, container, nombreCat) {
    const agotado = producto.estaAgotado();
    const precioFmt = producto.getPrecioFormateado();
    const primerRecurso = recursosGaleria[0];

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start px-4 md:px-0">
            <div class="flex flex-col gap-4 md:gap-6 w-full max-w-2xl mx-auto lg:max-w-none">
                <div class="relative w-full bg-[#FAFAFA] dark:bg-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-700 aspect-square flex items-center justify-center shadow-sm">
                    <div id="main-gallery-display">
                        ${renderizarRecurso(primerRecurso.url, primerRecurso.tipo, 'w-full h-full object-contain zoom-imagen ' + (primerRecurso.tipo === 'imagen' ? 'cursor-zoom-in' : ''))}
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between gap-2 md:gap-4">
                        <button id="prev-media" class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow hover:bg-primary hover:text-white transition-all active:scale-90">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        
                        <div id="thumbnails-preview" class="flex gap-2 overflow-x-auto scrollbar-hide py-2 snap-x w-full">
                            ${recursosGaleria.map((rec, i) => {
        const info = rec.tipo === 'video' ? obtenerInfoVideo(rec.url) : { thumb: rec.url };
        const thumbImg = (rec.tipo === 'video' && !info.esArchivo) ? info.thumb : rec.url;
        return `
                                    <div class="thumb-item w-14 h-14 md:w-20 md:h-20 rounded-xl border-2 transition-all flex-shrink-0 overflow-hidden cursor-pointer snap-center ${i === 0 ? 'border-primary' : 'border-transparent'}" data-index="${i}">
                                        ${rec.tipo === 'video' && info.esArchivo
                ? `<video src="${rec.url}#t=0.5" class="w-full h-full object-cover"></video>`
                : `<img src="${thumbImg}" class="w-full h-full object-cover ${rec.tipo === 'video' ? 'brightness-75' : ''}">`
            }
                                    </div>`;
    }).join('')}
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
                    <h1 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mt-2 leading-tight">${producto.nombre}</h1>
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
                </div>

                <div class="px-2 lg:px-0">
                    <h3 class="text-lg font-bold mb-2 flex items-center gap-2"><span class="material-icons text-primary">notes</span> Descripción</h3>
                    <p class="text-gray-600 dark:text-gray-400 italic leading-relaxed text-sm md:text-base">${producto.descripcion || 'Sin descripción.'}</p>
                </div>
            </div>
        </div>
    `;
}

function setupCarouselLogic() {
    const btnPrev = document.getElementById('prev-media');
    const btnNext = document.getElementById('next-media');
    const display = document.getElementById('main-gallery-display');
    const thumbs = document.querySelectorAll('.thumb-item');

    const update = (idx) => {
        indiceActual = idx;
        const rec = recursosGaleria[indiceActual];
        display.innerHTML = renderizarRecurso(rec.url, rec.tipo, 'w-full h-full object-contain animate-fadeIn zoom-imagen ' + (rec.tipo === 'imagen' ? 'cursor-zoom-in' : ''));

        thumbs.forEach((t, i) => {
            t.classList.toggle('border-primary', i === idx);
            t.classList.toggle('border-transparent', i !== idx);
            if (i === idx) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
        agregarListenersModalZoom();
    };

    if (btnNext) btnNext.onclick = () => update((indiceActual + 1) % recursosGaleria.length);
    if (btnPrev) btnPrev.onclick = () => update((indiceActual - 1 + recursosGaleria.length) % recursosGaleria.length);
    thumbs.forEach(t => t.onclick = () => update(parseInt(t.dataset.index)));
}

function agregarListenersModalZoom() {
    const imagenes = document.querySelectorAll(".zoom-imagen");
    const modal = document.getElementById("modal-zoom-container");
    const modalImagen = document.getElementById("modalImagen");
    const cerrarBtn = document.getElementById("cerrar-modal");

    if (!modal || !modalImagen || !cerrarBtn || imagenes.length === 0) return;
    const esMovil = window.matchMedia("(max-width: 768px)").matches;

    imagenes.forEach(img => {
        if (img.tagName === "VIDEO" || img.closest('.video-container-wrapper')) return;

        if (!esMovil) {
            img.addEventListener("mousemove", (e) => {
                const { left, top, width, height } = img.getBoundingClientRect();
                const x = ((e.clientX - left) / width) * 100;
                const y = ((e.clientY - top) / height) * 100;
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = "scale(1.5)";
            });
            img.addEventListener("mouseleave", () => img.style.transform = "scale(1)");
        }

        img.onclick = () => {
            modalImagen.src = img.src;
            modal.classList.add('modal-activo');
            modalImagen.style.transform = "scale(1)";
        };
    });

    const cerrar = () => modal.classList.remove('modal-activo');
    cerrarBtn.onclick = cerrar;
    modal.onclick = (e) => { if (e.target === modal) cerrar(); };
}

function configurarInteracciones(producto) {
    const btnMas = document.getElementById('btn-mas');
    const btnMenos = document.getElementById('btn-menos');
    const displayCant = document.getElementById('cant-num');
    const btnAdd = document.getElementById('btn-add-cart');

    if (btnMas) btnMas.onclick = () => {
        let n = parseInt(displayCant.innerText);
        if (n < producto.stock) displayCant.innerText = (n + 1).toString();
    };
    if (btnMenos) btnMenos.onclick = () => {
        let n = parseInt(displayCant.innerText);
        if (n > 1) displayCant.innerText = (n - 1).toString();
    };
    if (btnAdd) {
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
                </a>`).join('')}
        </div>`;
}

document.addEventListener('DOMContentLoaded', cargarDetalleProducto);