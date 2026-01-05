import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';
import { agregarProductoPorID } from './carrito.js';

let recursosGaleria = [];
let indiceActual = 0;

// =========================================================
// CONSTANTES DE CONFIGURACIÓN
// =========================================================
const NOMBRE_MARCA = "Geek"; 

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
            .select(`
                *, 
                categoria:id_categoria (
                    id, 
                    nombre, 
                    id_padre,
                    padre:id_padre (id, nombre)
                ), 
                galeria_producto (*)
            `)
            .eq('id', productoId)
            .order('orden', { foreignTable: 'galeria_producto', ascending: true })
            .single();

        if (prodError || !productoData) return;

        const producto = new Producto(productoData);
        
        // ACTUALIZACIÓN DEL TÍTULO DEL DOCUMENTO (Pestaña del navegador)
        // Formato: Marca - Nombre del Producto
        document.title = `${NOMBRE_MARCA} - ${producto.nombre}`;

        const subcategoria = productoData.categoria;
        const categoriaPadre = subcategoria?.padre;
        const nombreSub = subcategoria?.nombre || 'General';
        const nombrePadre = categoriaPadre?.nombre || null;

        recursosGaleria = [
            { url: producto.imagen_url, tipo: 'imagen' },
            ...(productoData.galeria_producto || [])
        ];

        asegurarEstilosYModal();
        actualizarBreadcrumb(nombrePadre, nombreSub, producto.nombre);
        renderizarInterfaz(producto, container, nombreSub);
        cargarResenasYCalificaciones(productoId);

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
 * BREADCRUMB CON CATEGORÍA PADRE
 */
function actualizarBreadcrumb(padreNombre, subNombre, prodNombre) {
    const linkPadre = document.getElementById('breadcrumb-categoria-padre-link');
    const itemPadre = document.getElementById('breadcrumb-padre-item');
    const linkSub = document.getElementById('breadcrumb-categoria-link');
    const spanProd = document.getElementById('breadcrumb-producto-nombre');

    if (itemPadre && linkPadre) {
        if (padreNombre) {
            linkPadre.textContent = padreNombre;
            linkPadre.href = `productos.html?categoria=${encodeURIComponent(padreNombre)}`;
            itemPadre.classList.remove('hidden');
        } else {
            itemPadre.classList.add('hidden');
        }
    }

    if (linkSub) {
        linkSub.textContent = subNombre;
        linkSub.href = `productos.html?categoria=${encodeURIComponent(subNombre)}`;
    }

    if (spanProd) spanProd.textContent = prodNombre;
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
            #main-gallery-display { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .zoom-imagen { transition: transform 0.2s ease-out; transform-origin: center; }
            #modal-zoom-container { transition: opacity 0.3s ease; display: none; background: rgba(0,0,0,0.95); backdrop-filter: blur(8px); }
            .video-container-wrapper { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: black; cursor: pointer; }
            .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; pointer-events: none; }
            .play-icon { font-size: 80px !important; color: white; opacity: 0.9; filter: drop-shadow(0 0 15px rgba(0,0,0,0.5)); transition: transform 0.2s ease; }
            .video-container-wrapper:hover .play-icon { transform: scale(1.1); opacity: 1; }
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
                    <img id="modalImagen" src="" alt="Zoom" class="max-w-full max-h-full object-contain zoom-imagen">
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

/**
 * DETECCIÓN DE VIDEO
 */
function obtenerInfoVideo(url) {
    if (!url) return { tipo: 'desconocido', thumb: '' };
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch) return { tipo: 'youtube', id: ytMatch[1], thumb: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) return { tipo: 'vimeo', id: vimeoMatch[1], thumb: `https://vumbnail.com/${vimeoMatch[1]}.jpg` };
    if (url.includes('facebook.com')) return { tipo: 'facebook', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' };
    if (url.includes('instagram.com')) return { tipo: 'instagram', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' };
    if (url.includes('tiktok.com')) return { tipo: 'tiktok', url: url, thumb: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' };
    
    const esArchivo = url.match(/\.(mp4|webm|ogg|mov)$/i);
    return { tipo: 'local', thumb: url, esArchivo: !!esArchivo };
}

function renderizarRecurso(url, tipo, clases) {
    if (tipo === 'video') {
        const info = obtenerInfoVideo(url);
        if (info.esArchivo) {
            return `<video src="${url}#t=0.1" class="${clases}" controls playsinline preload="metadata"></video>`;
        } else {
            const dataVideo = info.id || info.url;
            return `
                <div class="video-container-wrapper group" onclick="cargarIframeExterno(this, '${info.tipo}', '${dataVideo}')">
                    <img src="${info.thumb}" class="${clases} opacity-60 object-cover">
                    <div class="play-overlay"><span class="material-icons play-icon">play_circle_filled</span></div>
                </div>`;
        }
    }
    return `<img src="${url}" class="${clases} zoom-imagen cursor-zoom-in">`;
}

window.cargarIframeExterno = function (contenedor, tipo, info) {
    let html = '';
    const encodedUrl = encodeURIComponent(info);
    if (tipo === 'youtube') html = `<iframe src="https://www.youtube.com/embed/${info}?autoplay=1" class="w-full h-full border-0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    else if (tipo === 'vimeo') html = `<iframe src="https://player.vimeo.com/video/${info}?autoplay=1" class="w-full h-full border-0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    else if (tipo === 'facebook') html = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&t=0&autoplay=1" class="w-full h-full border-0" scrolling="no" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    else if (tipo === 'instagram') html = `<iframe src="${info.endsWith('/') ? info : info + '/'}embed" class="w-full h-full border-0" scrolling="no" allowtransparency="true"></iframe>`;
    else if (tipo === 'tiktok') html = `<iframe src="https://www.tiktok.com/embed/v2/${info.split('/video/')[1]?.split('?')[0]}" class="w-full h-full border-0" allowfullscreen></iframe>`;
    contenedor.innerHTML = html;
};

/**
 * INTERFAZ
 */
function renderizarInterfaz(producto, container, nombreCat) {
    const agotado = producto.estaAgotado();
    const precioFmt = producto.getPrecioFormateado();
    const primerRecurso = recursosGaleria[0];

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start px-4 md:px-0">
            <div class="flex flex-col gap-4 md:gap-6 w-full max-w-2xl mx-auto lg:max-w-none">
                <div class="relative w-full bg-[#FAFAFA] dark:bg-gray-800 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-700 aspect-square flex items-center justify-center shadow-sm">
                    <div id="main-gallery-display">
                        ${renderizarRecurso(primerRecurso.url, primerRecurso.tipo, 'w-full h-full object-contain animate-fadeIn')}
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <button id="prev-media" class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow hover:bg-primary hover:text-white transition-all"><span class="material-icons">chevron_left</span></button>
                    <div id="thumbnails-preview" class="flex gap-2 overflow-x-auto scrollbar-hide py-2 snap-x w-full">
                        ${recursosGaleria.map((rec, i) => {
                            const info = rec.tipo === 'video' ? obtenerInfoVideo(rec.url) : { thumb: rec.url, esArchivo: false };
                            let thumbContent = '';
                            if (rec.tipo === 'video' && info.esArchivo) {
                                thumbContent = `<video src="${rec.url}#t=0.1" class="w-full h-full object-cover" preload="metadata"></video>`;
                            } else {
                                const thumbImg = (rec.tipo === 'video' && !info.esArchivo) ? info.thumb : rec.url;
                                thumbContent = `<img src="${thumbImg}" class="w-full h-full object-cover">`;
                            }
                            return `
                                <div class="thumb-item relative w-20 h-20 rounded-xl border-2 transition-all shrink-0 overflow-hidden cursor-pointer snap-center ${i === 0 ? 'border-primary' : 'border-transparent'}" data-index="${i}">
                                    ${thumbContent}
                                    ${rec.tipo === 'video' ? '<div class="absolute inset-0 bg-black/30 flex items-center justify-center"><span class="material-icons text-white text-xl">play_circle</span></div>' : ''}
                                </div>`;
                        }).join('')}
                    </div>
                    <button id="next-media" class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow hover:bg-primary hover:text-white transition-all"><span class="material-icons">chevron_right</span></button>
                </div>
            </div>
            <div class="flex flex-col space-y-6">
                <div class="text-center lg:text-left">
                    <span class="text-primary font-bold uppercase tracking-widest text-sm">${nombreCat}</span>
                    <div id="promedio-estrellas-display" class="mt-1 flex justify-center lg:justify-start"></div>
                    <h1 class="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mt-2">${producto.nombre}</h1>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <span class="text-5xl font-black text-primary">Bs. ${precioFmt}</span>
                    <p class="text-sm font-bold mt-2 ${agotado ? 'text-red-500' : 'text-gray-500'}">${agotado ? '¡AGOTADO!' : `Stock: ${producto.stock} unidades`}</p>
                    <div class="flex gap-4 mt-6">
                        <div class="flex items-center border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 h-14 overflow-hidden">
                            <button id="btn-menos" class="px-6 h-full hover:text-primary font-bold text-xl">-</button>
                            <span id="cant-num" class="w-10 text-center font-bold text-xl">1</span>
                            <button id="btn-mas" class="px-6 h-full hover:text-primary font-bold text-xl">+</button>
                        </div>
                        <button id="btn-add-cart" class="flex-grow bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl h-14 shadow-lg active:scale-95 disabled:opacity-50" ${agotado ? 'disabled' : ''}>AÑADIR AL CARRITO</button>
                    </div>
                </div>
                <div>
                    <h3 class="text-lg font-bold mb-2 flex items-center gap-2"><span class="material-icons text-primary">notes</span> Descripción</h3>
                    <p class="text-gray-600 dark:text-gray-400 italic leading-relaxed">${producto.descripcion || 'Sin descripción.'}</p>
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
        display.innerHTML = renderizarRecurso(rec.url, rec.tipo, 'w-full h-full object-contain animate-fadeIn');
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

    imagenes.forEach(img => {
        if (img.tagName === 'IMG') {
            img.addEventListener("mousemove", (e) => {
                const { left, top, width, height } = img.getBoundingClientRect();
                const x = ((e.clientX - left) / width) * 100;
                const y = ((e.clientY - top) / height) * 100;
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = "scale(1.5)";
            });
            img.addEventListener("mouseleave", () => img.style.transform = "scale(1)");
            img.onclick = () => { modalImagen.src = img.src; modal.classList.add('modal-activo'); };
        }
    });

    document.getElementById("cerrar-modal").onclick = () => modal.classList.remove('modal-activo');
}

function configurarInteracciones(producto) {
    const btnMas = document.getElementById('btn-mas');
    const btnMenos = document.getElementById('btn-menos');
    const displayCant = document.getElementById('cant-num');
    if (btnMas) btnMas.onclick = () => { let n = parseInt(displayCant.innerText); if (n < producto.stock) displayCant.innerText = (n + 1).toString(); };
    if (btnMenos) btnMenos.onclick = () => { let n = parseInt(displayCant.innerText); if (n > 1) displayCant.innerText = (n - 1).toString(); };
    const btnAdd = document.getElementById('btn-add-cart');
    if (btnAdd) btnAdd.onclick = () => agregarProductoPorID(producto.id, parseInt(displayCant.innerText));
}

async function cargarSugerencias(pid, cid, container) {
    const { data } = await supabase.from('producto').select('*').eq('id_categoria', cid).neq('id', pid).limit(4);
    if (!data || !container) return;
    container.innerHTML = `<h2 class="text-xl font-bold mb-6">Relacionados</h2><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${data.map(p => `
        <a href="detalle_producto.html?id=${p.id}" class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 shadow-sm">
            <img src="${p.imagen_url}" class="w-full aspect-square object-contain mb-2">
            <h4 class="font-bold truncate text-sm">${p.nombre}</h4>
            <p class="text-primary font-bold text-sm">Bs. ${p.precio.toFixed(2)}</p>
        </a>`).join('')}</div>`;
}

async function cargarResenasYCalificaciones(productoId) {
    const resenasContainer = document.getElementById('comments-section-layout');
    const badgeCalificacion = document.getElementById('promedio-estrellas-display');
    if (!resenasContainer) return;

    try {
        const { data: calificaciones } = await supabase.from('calificacion').select('*').eq('id_producto', productoId);
        const { data: comentarios } = await supabase.from('comentario_producto').select('*, usuario:id_usuario(primer_nombre, apellido_paterno)').eq('id_producto', productoId).order('fecha_creacion', { ascending: false });

        const totalVotos = calificaciones?.length || 0;
        let promedio = 0;
        const conteo = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        if (totalVotos > 0) {
            calificaciones.forEach(c => conteo[c.puntuacion]++);
            promedio = (calificaciones.reduce((acc, c) => acc + c.puntuacion, 0) / totalVotos).toFixed(1);
        }

        resenasContainer.innerHTML = `
            <div class="lg:col-span-4 flex flex-col gap-6">
                <div class="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-100 text-center">
                    <h3 class="text-6xl font-black text-gray-900 dark:text-white mb-2">${promedio}</h3>
                    <div class="flex justify-center text-yellow-400 mb-2">${generarEstrellasHTML(Math.round(promedio))}</div>
                    <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Basado en ${totalVotos} reseñas</p>
                </div>
                <div class="space-y-3 px-2">
                    ${[5, 4, 3, 2, 1].map(num => {
                        const porc = totalVotos > 0 ? (conteo[num] / totalVotos) * 100 : 0;
                        return `
                            <div class="flex items-center gap-4 text-xs font-bold text-gray-500">
                                <span class="w-2">${num}</span><span class="material-icons text-yellow-400 text-sm">star</span>
                                <div class="flex-grow h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div class="h-full bg-primary" style="width: ${porc}%"></div></div>
                                <span class="w-8 text-right">${Math.round(porc)}%</span>
                            </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="lg:col-span-8 flex flex-col gap-4">
                ${!comentarios || comentarios.length === 0 ? '<p class="text-center text-gray-400 py-10 italic">No hay comentarios todavía.</p>' : comentarios.map(c => {
                    const u = c.usuario;
                    const iniciales = u ? `${u.primer_nombre[0]}${u.apellido_paterno[0]}`.toUpperCase() : 'U';
                    const puntuacion = calificaciones.find(cal => cal.id_usuario === c.id_usuario)?.puntuacion || 5;
                    return `
                        <div class="bg-white dark:bg-gray-800/20 p-6 rounded-2xl border border-gray-100 flex gap-4">
                            <div class="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-primary font-bold shrink-0">${iniciales}</div>
                            <div class="flex-grow">
                                <div class="flex justify-between items-center mb-1">
                                    <h4 class="font-bold text-gray-900 dark:text-white text-sm">${u ? u.primer_nombre + ' ' + u.apellido_paterno : 'Usuario'}</h4>
                                    <span class="text-[10px] text-gray-400 font-medium">${calcularHaceCuanto(c.fecha_creacion)}</span>
                                </div>
                                <div class="flex text-yellow-400 text-[10px] mb-2">${generarEstrellasHTML(puntuacion)}</div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm italic">"${c.contenido}"</p>
                            </div>
                        </div>`;
                }).join('')}
                <button class="text-primary font-bold text-sm mt-4 hover:underline self-center">Cargar más comentarios ▾</button>
            </div>`;

        if (badgeCalificacion) badgeCalificacion.innerHTML = totalVotos > 0 ? `<div class="flex items-center gap-1.5 bg-yellow-400/10 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/20"><span class="material-icons text-sm">star</span>${promedio}</div>` : '';
    } catch (e) { console.error(e); }
}

function generarEstrellasHTML(cant) {
    let h = ''; for (let i = 1; i <= 5; i++) h += `<span class="material-icons" style="font-size:inherit">${i <= cant ? 'star' : 'star_border'}</span>`;
    return h;
}

function calcularHaceCuanto(f) {
    const d = Math.floor((new Date() - new Date(f)) / 86400000);
    if (d === 0) return 'Hoy'; if (d === 1) return 'Hace 1 día'; if (d < 7) return `Hace ${d} días`;
    return `Hace ${Math.floor(d / 7)} semanas`;
}

document.addEventListener('DOMContentLoaded', cargarDetalleProducto);