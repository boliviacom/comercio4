// js/detalleProducto.js

import { supabase } from './supabaseClient.js';
import { Producto } from './models/Producto.js';
import { agregarProductoPorID } from './carrito.js';

// =========================================================
// FUNCIÓN PRINCIPAL DE CARGA
// =========================================================

/**
 * Función que carga los detalles de un producto (por ID de URL) y los renderiza en la página,
 * y luego carga y renderiza productos relacionados.
 */
async function cargarDetalleProducto() {
    // 1. Obtener el ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    const container = document.getElementById('detalle-producto-container');
    // El contenedor principal del carrusel, ubicado en el HTML
    const relacionadosContainer = document.getElementById('productos-relacionados-container');

    if (!productoId) {
        container.innerHTML = '<h2>Producto no especificado.</h2>';
        actualizarBreadcrumb('Error', null);
        return;
    }

    try {
        // 2. Consulta a Supabase para obtener el producto principal (incluye el join de categoría)
        let { data: productoData, error: prodError } = await supabase
            .from('producto')
            .select(`
                *,
                categoria (id, nombre) 
            `)
            .eq('id', productoId)
            .single();

        if (prodError || !productoData) {
            console.error('Error al cargar el producto:', prodError);
            container.innerHTML = '<h2>Producto no encontrado o error de conexión.</h2>';
            actualizarBreadcrumb('Error', null);
            return;
        }

        // 3. Procesar y Renderizar Producto Principal
        const producto = new Producto(productoData);
        const categoriaNombre = producto.categoria_nombre;
        const categoriaId = productoData.categoria.id; // ID para buscar relacionados

        actualizarBreadcrumb(categoriaNombre, producto.nombre);
        renderizarDetalle(producto, container);

        // 4. Cargar y Renderizar Productos Relacionados en carrusel
        if (categoriaId) {
            await cargarYRenderizarRelacionados(producto.id, categoriaId, relacionadosContainer);
        }

        // 5. Agregar Listeners de Interacción
        agregarListenersModalZoom();

        if (producto.habilitar_formulario) {
            agregarListenersModalFormulario();
        }

        if (producto.mostrar_precio) {
            agregarListenersDetalleProducto(producto);
        }

    } catch (error) {
        console.error("Error general al cargar los detalles:", error);
        container.innerHTML = '<h2>Ocurrió un error inesperado al cargar el producto.</h2>';
    }
}

// =========================================================
// FUNCIÓN DE CARGA Y RENDERIZADO DE PRODUCTOS RELACIONADOS (CARRUSEL)
// =========================================================

/**
 * Carga productos de la misma categoría (excluyendo el producto actual) y los renderiza en un carrusel.
 * @param {number} currentProductId - ID del producto actual para excluirlo.
 * @param {number} categoriaId - ID de la categoría a consultar.
 * @param {HTMLElement} container - Contenedor donde se inyectará el HTML.
 */
async function cargarYRenderizarRelacionados(currentProductId, categoriaId, container) {
    if (!container) return;

    try {
        let { data: relacionadosData, error: relError } = await supabase
            .from('producto')
            .select(`id, nombre, imagen_url, precio, visible, stock, mostrar_precio`)
            .eq('id_categoria', categoriaId)
            .neq('id', currentProductId) // Excluir el producto actual
            .eq('visible', true)         // Solo productos visibles
            .limit(10);                   // Limitar la cantidad para el carrusel

        if (relError || relacionadosData.length === 0) {
            container.innerHTML = ''; // Ocultar si no hay relacionados
            return;
        }

        // 1. Generar HTML para los productos
        let relacionadosHTML = relacionadosData.map(prod => {
            const prodInstance = new Producto(prod);
            const precioDisplay = prodInstance.mostrar_precio ? `<p class="relacionado-precio">Bs. ${prodInstance.getPrecioFormateado()}</p>` : '';
            const agotadoClass = prodInstance.estaAgotado() ? 'agotado' : '';

            return `
                <a href="detalle_producto.html?id=${prod.id}" class="relacionado-card ${agotadoClass}">
                    <img src="${prod.imagen_url}" alt="${prod.nombre}">
                    <h4 class="relacionado-nombre">${prod.nombre}</h4>
                    ${precioDisplay}
                    ${prodInstance.estaAgotado() ? '<span class="relacionado-agotado">AGOTADO</span>' : ''}
                </a>
            `;
        }).join('');

        // 2. Inyectar el HTML con la estructura del carrusel
        container.innerHTML = `
            <h3 class="titulo-relacionados">Productos Relacionados</h3>
            <div class="carousel-container">
                <button class="carousel-nav prev" aria-label="Anterior">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="carousel-track-container">
                    <div class="carousel-track">
                        ${relacionadosHTML}
                    </div>
                </div>
                <button class="carousel-nav next" aria-label="Siguiente">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        // 3. Agregar listeners para el carrusel
        agregarListenersCarrusel(container);


    } catch (error) {
        console.error("Error inesperado en cargarYRenderizarRelacionados:", error);
        container.innerHTML = '<p class="error-relacionados">Error inesperado.</p>';
    }
}

// =========================================================
// LÓGICA DEL CARRUSEL
// =========================================================

/**
 * Inicializa la lógica de navegación del carrusel (movimiento y visibilidad de botones).
 * @param {HTMLElement} container - El contenedor principal de los productos relacionados.
 */
function agregarListenersCarrusel(container) {
    const track = container.querySelector('.carousel-track');
    const prevButton = container.querySelector('.carousel-nav.prev');
    const nextButton = container.querySelector('.carousel-nav.next');
    const cards = Array.from(track.children);

    if (cards.length === 0 || !track || !prevButton || !nextButton) return;

    let currentPosition = 0;
    // Ancho de la tarjeta + gap (20px, según el CSS)
    const getCardWidth = () => cards[0].offsetWidth + (parseFloat(window.getComputedStyle(track).gap) || 20);

    const updateCarousel = () => {
        const trackWidth = track.scrollWidth;
        const containerWidth = track.clientWidth;
        const maxScroll = trackWidth - containerWidth;

        // La posición no puede ser negativa ni exceder el máximo de scroll
        currentPosition = Math.max(0, Math.min(currentPosition, maxScroll));

        track.style.transform = `translateX(-${currentPosition}px)`;

        // Mostrar/Ocultar botones de navegación (usando una pequeña tolerancia)
        prevButton.style.display = currentPosition <= 5 ? 'none' : 'flex';
        nextButton.style.display = currentPosition >= maxScroll - 5 ? 'none' : 'flex';
    };

    const moveCarousel = (direction) => {
        const cardWidth = getCardWidth();
        let scrollAmount = cardWidth * 3; // Mover 3 tarjetas a la vez

        // Ajuste para móviles (mover menos)
        if (window.innerWidth <= 768) {
            scrollAmount = cardWidth * 1;
        }

        if (direction === 'next') {
            currentPosition += scrollAmount;
        } else {
            currentPosition -= scrollAmount;
        }

        updateCarousel();
    };


    // Necesario un pequeño timeout para que el DOM mida bien los anchos después de renderizar
    setTimeout(updateCarousel, 100);

    // Navegación
    prevButton.addEventListener('click', () => moveCarousel('prev'));
    nextButton.addEventListener('click', () => moveCarousel('next'));

    // Ajustar el carrusel al cambiar el tamaño de la ventana
    window.addEventListener('resize', () => {
        currentPosition = 0; // Reiniciar la posición para recalcular y evitar bugs visuales
        setTimeout(updateCarousel, 100);
    });

}

// =========================================================
// FUNCIONES DE SOPORTE (SIN CAMBIOS RESPECTO AL CÓDIGO ANTERIOR)
// =========================================================

/**
 * Actualiza el breadcrumb (migas de pan) con el nombre de la categoría y el producto.
 * @param {string} categoriaNombre - Nombre de la categoría.
 * @param {string} productoNombre - Nombre del producto.
 */
function actualizarBreadcrumb(categoriaNombre, productoNombre) {
    const categoriaLink = document.getElementById('breadcrumb-categoria-link');
    const productoSpan = document.getElementById('breadcrumb-producto-nombre');

    if (categoriaLink) {
        categoriaLink.textContent = categoriaNombre;
        categoriaLink.href = `productos.html?categoria=${encodeURIComponent(categoriaNombre)}`;
    }

    if (productoSpan) {
        productoSpan.textContent = productoNombre || 'Producto';
    }
}

/**
 * Genera y aplica el HTML para mostrar el detalle completo del producto.
 * * @param {Producto} producto - Instancia de la clase Producto.
 * @param {HTMLElement} container - Contenedor donde se inyectará el HTML.
 */
function renderizarDetalle(producto, container) {
    const precioFormateado = producto.getPrecioFormateado();
    const estaAgotado = producto.estaAgotado();

    const mostrarPrecio = producto.mostrar_precio;
    const habilitarWhatsapp = producto.habilitar_whatsapp;
    const habilitarFormulario = producto.habilitar_formulario;

    const deshabilitado = estaAgotado ? 'disabled' : '';
    const valorInicial = estaAgotado ? '0' : '1';
    const textoBoton = estaAgotado ? 'AGOTADO' : 'AGREGAR';
    const claseAgotado = estaAgotado ? 'agotado' : '';

    let cartAndPriceBlock = '';
    if (mostrarPrecio) {
        const stockIndicador = estaAgotado
            ? '<p class="info-pro-stock agotado-stock">Stock: Agotado</p>'
            : `<p class="info-pro-stock">Stock: ${producto.stock} unidades</p>`;

        cartAndPriceBlock = `
            <p class="info-pro-precio" data-precio="${producto.precio.toFixed(2)}">Bs. ${precioFormateado}</p>
            ${stockIndicador}

            <div class="info-pro-acciones">
                <button class="info-pro-decrementar" ${deshabilitado}>-</button>
                <span class="info-pro-valor">${valorInicial}</span>
                <button class="info-pro-incrementar" ${deshabilitado}>+</button>
            </div>
            <button class="info-pro-agregar" data-id="${producto.id}" ${deshabilitado}>${textoBoton}</button>
        `;
    }

    let whatsappButton = '';
    const whatsappLink = `https://wa.me/591XXXXXXXX?text=${encodeURIComponent(`Hola, me interesa el producto: ${producto.nombre} (ID: ${producto.id})`)}`;

    if (habilitarWhatsapp) {
        whatsappButton = `<a href="${whatsappLink}" target="_blank" class="info-pro-whatsapp btn-whatsapp"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>`;
    }

    let formButton = '';
    if (habilitarFormulario) {
        formButton = `<button class="info-pro-solicitar" data-id="${producto.id}" data-nombre="${producto.nombre}">Comenta Sobre el Producto</button>`;
    }

    container.innerHTML = `
        <div class="info-pro-contenedor ${claseAgotado}" data-id="${producto.id}">
            <div class="info-pro-imagen">
                <img src="${producto.imagen_url}" alt="${producto.nombre}" class="zoom-imagen">
                ${estaAgotado ? '<div class="agotado-tag">AGOTADO</div>' : ''}
            </div>

            <div id="modal" class="modal">
                <span class="cerrar" id="cerrar-modal">&times;</span>
                <div class="modal-contenido">
                    <img class="modal-imagen" id="modalImagen" src="" alt="Zoom del producto">
                </div>
            </div>

            <div class="info-pro-informacion">
                <h2 class="info-pro-nombre">${producto.nombre}</h2>
                
                ${cartAndPriceBlock}
                ${whatsappButton}
                ${formButton}

            </div>
            <div class="info-pro-descripcion">
                <h3 class="titulo-descripcion">Descripción</h3>
                <p class="texto-descripcion">${producto.descripcion}</p>
            </div>
        </div>
    `;
}

function agregarListenersModalFormulario() {
    const solicitarBtn = document.querySelector('.info-pro-solicitar');
    const modal = document.getElementById('info-form-modal');
    const closeBtn = document.getElementById('close-form-modal');
    const formProductId = document.getElementById('form-product-id');
    const formModalTitle = document.getElementById('form-modal-title');
    const infoForm = document.getElementById('solicitud-info-form');

    if (!solicitarBtn || !modal || !closeBtn || !formProductId || !formModalTitle || !infoForm) {
        // console.warn("Faltan elementos HTML para inicializar el formulario de solicitud de información.");
        return;
    }

    const closeModal = () => {
        modal.classList.remove('activo');
        infoForm.reset();
        formModalTitle.textContent = `Solicitar Información`;
    };

    solicitarBtn.addEventListener('click', () => {
        const productoId = solicitarBtn.getAttribute('data-id');
        const productoNombre = solicitarBtn.getAttribute('data-nombre');

        formProductId.value = productoId;
        formModalTitle.textContent = `Comentar Sobre: ${productoNombre}`;

        modal.classList.add('activo');
    });

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    infoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productId = formProductId.value;
        const nombre = document.getElementById('nombre-completo').value;
        const email = document.getElementById('correo-electronico').value;
        const comentario = document.getElementById('comentario').value;

        try {
            const { error } = await supabase.from('solicitudes_info').insert({
                product_id: productId,
                nombre_solicitante: nombre,
                email: email,
                comentario: comentario,
            });

            if (error) {
                console.error('Error al enviar la solicitud:', error);
                alert('❌ Error al enviar la solicitud. Por favor, inténtalo de nuevo.');
            } else {
                alert('✅ Solicitud enviada con éxito. Te contactaremos pronto.');
                closeModal();
            }
        } catch (err) {
            console.error('Error de conexión o inesperado:', err);
            alert('❌ Ocurrió un error inesperado al procesar tu solicitud.');
        }
    });
}

function agregarListenersDetalleProducto(producto) {
    const decrementarBtn = document.querySelector('.info-pro-decrementar');
    const incrementarBtn = document.querySelector('.info-pro-incrementar');
    const cantidadSpan = document.querySelector('.info-pro-valor');
    const agregarBtn = document.querySelector('.info-pro-agregar');

    if (!decrementarBtn || !incrementarBtn || !cantidadSpan || !agregarBtn) {
        return;
    }

    const estaAgotado = agregarBtn.disabled;

    if (!estaAgotado) {
        // 1. Decrementar
        decrementarBtn.addEventListener('click', () => {
            let cantidad = parseInt(cantidadSpan.textContent);
            if (cantidad > 1) {
                cantidad -= 1;
                cantidadSpan.textContent = cantidad;
            }
        });

        // 2. Incrementar
        incrementarBtn.addEventListener('click', () => {
            let cantidad = parseInt(cantidadSpan.textContent);
            cantidad += 1;
            cantidadSpan.textContent = cantidad;
        });
    }

    // --- Lógica del Botón AGREGAR ---
    agregarBtn.addEventListener('click', async () => {
        if (estaAgotado) {
            return;
        }

        const id = String(producto.id);
        const nombre = producto.nombre;
        const precio = producto.precio;
        const imagen = producto.imagen_url;
        const cantidad = parseInt(cantidadSpan.textContent);

        if (cantidad > 0) {
            const exito = await agregarProductoPorID(id, cantidad, nombre, precio, imagen);

            if (exito) {
                // Notificación o acción de éxito
                cantidadSpan.textContent = "1";
            } else {
                console.error("Error al agregar producto al carrito.");
            }
        }
    });
}

function agregarListenersModalZoom() {
    const imagenes = document.querySelectorAll(".zoom-imagen");
    const modal = document.getElementById("modal");
    const modalImagen = document.getElementById("modalImagen");
    const cerrarModal = document.getElementById("cerrar-modal");

    if (!modal || !modalImagen || !cerrarModal || imagenes.length === 0) {
        return;
    }

    let tiempoSalida;
    const esPantallaPequena = window.matchMedia("(max-width: 768px)").matches;

    // Zoom dinámico en imágenes normales (Solo en pantallas grandes)
    if (!esPantallaPequena) {
        imagenes.forEach(img => {
            img.addEventListener("mousemove", (event) => {
                clearTimeout(tiempoSalida);
                const { left, top, width, height } = img.getBoundingClientRect();
                const margen = 20;

                if (
                    event.clientX > left + margen &&
                    event.clientX < left + width - margen &&
                    event.clientY > top + margen &&
                    event.clientY < top + height - margen
                ) {
                    const x = ((event.clientX - left) / width) * 100;
                    const y = ((event.clientY - top) / height) * 100;

                    img.style.transform = "scale(1.5)";
                    img.style.transformOrigin = `${x}% ${y}%`;
                }
            });

            img.addEventListener("mouseleave", () => {
                tiempoSalida = setTimeout(() => {
                    img.style.transform = "scale(1)";
                    img.style.transformOrigin = "center";
                }, 100);
            });
        });
    }

    // Abrir modal (funciona en todas las pantallas)
    imagenes.forEach(img => {
        img.addEventListener("click", () => {
            modal.classList.add("activo");
            modalImagen.src = img.src;
            modalImagen.style.transform = "scale(1)";
        });
    });

    // Cerrar modal
    cerrarModal.addEventListener("click", () => {
        modal.classList.remove("activo");
    });

    // Cerrar clickeando fuera de la imagen
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.remove("activo");
        }
    });

    // Cerrar con Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("activo")) {
            modal.classList.remove("activo");
        }
    });

    // Zoom dinámico en imagen dentro del modal (Solo en pantallas grandes)
    if (!esPantallaPequena) {
        modalImagen.addEventListener("mousemove", (event) => {
            const { left, top, width, height } = modalImagen.getBoundingClientRect();

            const x = ((event.clientX - left) / width) * 100;
            const y = ((event.clientY - top) / height) * 100;

            modalImagen.style.transform = "scale(2)";
            modalImagen.style.transformOrigin = `${x}% ${y}%`;
        });

        modalImagen.addEventListener("mouseleave", () => {
            tiempoSalida = setTimeout(() => {
                modalImagen.style.transform = "scale(1)";
                modalImagen.style.transformOrigin = "center";
            }, 100);
        });
    }
}

// =========================================================

// Inicia el proceso de carga al cargar el script
cargarDetalleProducto();