// Asegúrate de inicializar tu cliente Supabase
import { supabase } from './supabaseClient.js';
// 🛑 Importar la función que añade los listeners desde 'carrito.js'
import { agregarListenersCatalogo } from './carrito.js';
// 🛑 CAMBIO CLAVE: Importar la clase Producto desde su nuevo archivo
import { Producto } from './models/Producto.js';

// =========================================================
// FUNCIÓN PARA MARCAR EL ENLACE ACTIVO
// =========================================================
function marcarCategoriaActiva(categoriaNombre) {
    // 1. Obtener todos los elementos <a> dentro de la clase 'menu1'
    const enlacesMenu = document.querySelectorAll('.menu1 a');

    // 2. Recorrer los enlaces
    enlacesMenu.forEach(enlace => {
        // Primero, eliminar la clase 'active' de todos (por si acaso)
        enlace.classList.remove('active');

        // 3. Obtener el valor del parámetro 'categoria' de cada enlace
        const url = new URL(enlace.href);
        const categoriaEnEnlace = url.searchParams.get('categoria');

        // 4. Comparar el nombre de la categoría actual con el nombre de la categoría en el enlace
        if (categoriaEnEnlace === categoriaNombre) {
            // Si coinciden, añadir la clase 'active' al enlace
            enlace.classList.add('active');
        }
    });
}

// =========================================================
// FUNCIÓN PRINCIPAL: Cargar Productos por Categoría
// =========================================================

async function cargarProductosPorCategoria() {
    // 1. Obtener la categoría de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaNombre = urlParams.get('categoria');

    const productosContainer = document.getElementById('productos-listado');

    if (!productosContainer) {
        console.error("Error: El contenedor 'productos-listado' no se encontró en el DOM.");
        return;
    }

    if (!categoriaNombre) {
        productosContainer.innerHTML = '<h2>Selecciona una categoría.</h2>';
        return;
    }

    // LLAMAR A LA NUEVA FUNCIÓN AQUÍ
    marcarCategoriaActiva(categoriaNombre);

    // Opcional: Mostrar el nombre de la categoría en el título principal
    const tituloCategoria = document.getElementById('titulo-categoria');
    if (tituloCategoria) {
        tituloCategoria.textContent = categoriaNombre;
        tituloCategoria.classList.add('titulo-categoria');
    }

    // Actualizar el Breadcrumb
    const breadcrumbActivo = document.getElementById('breadcrumb-activo');
    if (breadcrumbActivo) {
        breadcrumbActivo.textContent = categoriaNombre;
    }

    const breadcrumbLink = document.getElementById('breadcrumb-categoria-link');
    if (breadcrumbLink) {
        breadcrumbLink.setAttribute('href', 'productos.html');
    }

    // 2. Consultar Supabase para obtener el ID de la categoría
    let { data: categoria, error: catError } = await supabase
        .from('categoria')
        .select('id')
        .eq('nombre', categoriaNombre)
        .single();

    if (catError || !categoria) {
        console.error('Error al obtener la categoría:', catError);
        productosContainer.innerHTML = '<h2>Categoría no encontrada.</h2>';
        return;
    }

    const categoriaId = categoria.id;

    // 3. Consultar Supabase para obtener los productos de esa categoría
    let { data: productos, error: prodError } = await supabase
        .from('producto')
        .select('*')
        .eq('id_categoria', categoriaId)
        .eq('visible', true)
        .order('id', { ascending: true });

    if (prodError) {
        console.error('Error al cargar productos:', prodError);
        productosContainer.innerHTML = '<h2>Error al cargar los productos.</h2>';
        return;
    }

    productosContainer.innerHTML = '';

    if (productos.length === 0) {
        productosContainer.innerHTML = `<p>No hay productos disponibles en ${categoriaNombre}.</p>`;
        return;
    }

    // 4. Renderizar productos
    // CAMBIO CLAVE: Mapeamos los datos crudos a una lista de objetos Producto
    const productosMapeados = productos.map(data => new Producto(data));

    productosMapeados.forEach((producto) => {
        try {
            // Ahora usamos los métodos y propiedades robustas de la clase Producto
            const productoId = producto.id;
            const precioFormateado = producto.getPrecioFormateado();
            const estaAgotado = producto.estaAgotado();

            // Variables de configuración (deben venir del objeto Producto)
            const mostrarPrecio = producto.mostrar_precio;
            const habilitarWhatsapp = producto.habilitar_whatsapp;
            const habilitarFormulario = producto.habilitar_formulario;

            // Definir atributos y contenido condicional
            const deshabilitado = estaAgotado ? 'disabled' : '';
            const valorCantidad = estaAgotado ? '0' : '1';
            const textoBoton = estaAgotado ? 'AGOTADO' : 'AGREGAR';

            // 🛑 CORRECCIÓN: El enlace SIEMPRE debe ir a la página de detalle
            const linkHref = `detalle_producto.html?id=${productoId}`;

            // --- Lógica Condicional de Botones ---
            let cartBlock = '';
            let whatsappButton = '';
            let formButton = '';

            // 1. Bloque de Precio/Carrito (Solo si mostrar_precio es true)
            if (mostrarPrecio) {
                cartBlock = `
                    <p class="precio-catalogo">Bs. ${precioFormateado}</p>
                    <div class="cantidad">
                        <button class="decrementar" data-id="${productoId}" ${deshabilitado}>-</button>
                        <input type="text" class="cantidad-input" data-id="${productoId}" value="${valorCantidad}" readonly ${deshabilitado}>
                        <button class="incrementar" data-id="${productoId}" ${deshabilitado}>+</button>
                    </div>
                    <button class="agregar" data-id="${productoId}" ${deshabilitado}>${textoBoton}</button>
                `;
            }

            // 2. Botón de WhatsApp (Solo si habilitar_whatsapp es true)
            if (habilitarWhatsapp) {
                // Usamos la clase CSS 'btn-whatsapp' para que aplique el estilo de Font Awesome y el gap
                const whatsappLink = `https://wa.me/591XXXXXXXX?text=${encodeURIComponent(`Hola, me interesa el producto: ${producto.nombre} (ID: ${producto.id})`)}`;
                whatsappButton = `<a href="${whatsappLink}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>`;
            }

            // 3. Botón de Formulario (Solo si habilitar_formulario es true)
            if (habilitarFormulario) {
                // Usamos la clase CSS 'info-pro-solicitar' para mantener el estilo consistente
                formButton = `<button class="info-pro-solicitar" data-id="${productoId}" data-nombre="${producto.nombre}">Comenta Sobre el Producto</button>`;
            }

            // ------------------------------------

            const productoDiv = document.createElement('div');
            productoDiv.classList.add('producto');

            // CORRECCIÓN: Solo añade la clase si el producto está agotado.
            if (estaAgotado) {
                productoDiv.classList.add('agotado');
            }

            productoDiv.setAttribute('data-categoria', categoriaNombre);
            // Usamos la propiedad 'precio' limpia de la clase Producto
            productoDiv.setAttribute('data-precio', producto.precio.toFixed(2));

            productoDiv.innerHTML = `
                <a href="${linkHref}" class="producto-link">
                    <img src="${producto.imagen_url}" alt="${producto.nombre}">
                    <h3>${producto.nombre}</h3>
                </a>
                
                <div class="producto-acciones">
                    ${cartBlock}
                    ${whatsappButton}
                    ${formButton}
                </div>
                ${estaAgotado ? '<div class="agotado-tag">AGOTADO</div>' : ''}
            `;
            productosContainer.appendChild(productoDiv);

        } catch (error) {
            console.error("Error al renderizar un producto (datos no válidos):", producto, error);
        }
    });

    // Llamar a la función para añadir los listeners de cantidad y carrito
    agregarListenersCatalogo();

    // 🟢 NUEVO: Inicializar los listeners para abrir el modal de solicitud de información
    inicializarListenersModalFormularioCatalogo();
}

// =========================================================
// LÓGICA DE LISTENERS DEL MODAL DE SOLICITUD DE INFORMACIÓN (PARA EL CATÁLOGO)
// =========================================================

/**
 * Agrega listeners a todos los botones "Solicitar Información" del catálogo para
 * abrir el modal con la información específica del producto.
 */
function inicializarListenersModalFormularioCatalogo() {
    // Busca todos los botones de solicitud de información que se han renderizado
    const solicitarBtns = document.querySelectorAll('.info-pro-solicitar');
    const modal = document.getElementById('info-form-modal');
    const closeBtn = document.getElementById('close-form-modal');
    const formProductId = document.getElementById('form-product-id');
    const formModalTitle = document.getElementById('form-modal-title');
    const infoForm = document.getElementById('solicitud-info-form');

    if (!modal || !closeBtn || !formProductId || !formModalTitle || !infoForm) {
        console.warn("Faltan elementos HTML para inicializar el formulario de solicitud de información en el catálogo.");
        return;
    }

    // --- Función para cerrar el modal ---
    const closeModal = () => {
        modal.classList.remove('activo');
        infoForm.reset();
        formModalTitle.textContent = `Solicitar Información`;
    };

    // --- Lógica para abrir el modal al hacer clic en cualquier botón del catálogo ---
    solicitarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const productoId = btn.getAttribute('data-id');
            const productoNombre = btn.getAttribute('data-nombre');

            formProductId.value = productoId;
            formModalTitle.textContent = `Solicitar Info: ${productoNombre}`;

            modal.classList.add('activo');
        });
    });

    // --- Lógica para cerrar el modal ---
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // --- Lógica para enviar el formulario a Supabase ---
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

// =========================================================
// INICIO DE LA APLICACIÓN
// =========================================================
cargarProductosPorCategoria();