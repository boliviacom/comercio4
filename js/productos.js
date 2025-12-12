import { supabase } from './supabaseClient.js';

// 🛑 Importar la función que añade los listeners desde 'carrito.js'
import { agregarListenersCatalogo } from './carrito.js'; 
// 🛑 Importar la clase Producto desde su nuevo archivo
import { Producto } from './models/Producto.js';

// =========================================================
// FUNCIÓN PARA MARCAR EL ENLACE ACTIVO (AJUSTADO PARA TAILWIND)
// =========================================================
function marcarCategoriaActiva(categoriaNombre) {
    // 1. Obtener todos los elementos <a> de la navegación principal.
    const enlacesMenu = document.querySelectorAll('nav .whitespace-nowrap a');

    // Manejador del estado activo para la nueva navegación
    enlacesMenu.forEach(enlace => {
        // El span indicador (la línea) es el último hijo del <a>
        const indicador = enlace.querySelector('span');

        // 2. Desactivar estado activo (línea) y clase 'active' de todos
        enlace.classList.remove('active'); 
        if (indicador) {
            // Ocultar el indicador visual por defecto (transform: scale-x-0)
            indicador.classList.add('scale-x-0'); 
            indicador.classList.remove('scale-x-100');
        }

        // 3. Obtener la categoría del enlace
        const url = new URL(enlace.href, window.location.origin);
        const categoriaEnEnlace = url.searchParams.get('categoria');
        
        let shouldBeActive = false;

        // 4. Comparar el nombre de la categoría actual con el nombre de la categoría en el enlace
        if (categoriaEnEnlace === categoriaNombre) {
            shouldBeActive = true;
        } 
        
        // El enlace a 'Inicio' debe marcarse si NO hay una categoría seleccionada.
        if (!categoriaNombre && (enlace.pathname === '/index.html' || enlace.pathname === '/')) {
             shouldBeActive = true;
        }

        // 5. Activar si corresponde
        if (shouldBeActive) {
            // Mantenemos la clase 'active' por si hay estilos antiguos
            enlace.classList.add('active'); 
            
            if (indicador) {
                // Activar la línea visual (transform: scale-x-100)
                indicador.classList.remove('scale-x-0'); 
                indicador.classList.add('scale-x-100');
            }
        }
    });
}

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
        productosContainer.innerHTML = '<h2 class="text-center text-xl text-gray-500 py-10">Selecciona una categoría.</h2>';
        return;
    }

    // LLAMAR A LA FUNCIÓN DE MARCADO
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
    
    // 2. Consultar Supabase para obtener el ID de la categoría
    let { data: categoria, error: catError } = await supabase
        .from('categoria')
        .select('id')
        .eq('nombre', categoriaNombre)
        .single(); 

    if (catError || !categoria) {
        console.error('Error al obtener la categoría:', catError);
        productosContainer.innerHTML = '<h2 class="text-center text-xl text-red-500 py-10">Categoría no encontrada.</h2>';
        return;
    }

    const categoriaId = categoria.id;

    // 3. Consultar productos por ID de categoría
    let { data: productos, error: prodError } = await supabase
        .from('producto')
        .select('*')
        .eq('id_categoria', categoriaId)
        .eq('visible', true)
        .order('id', { ascending: true });

    if (prodError) {
        console.error('Error al cargar productos:', prodError);
        productosContainer.innerHTML = '<h2 class="text-center text-xl text-red-500 py-10">Error al cargar los productos.</h2>';
        return;
    }

    productosContainer.innerHTML = ''; 

    if (productos.length === 0) {
        productosContainer.innerHTML = `<p class="text-center text-gray-500 py-10">No hay productos disponibles en ${categoriaNombre}.</p>`;
        return;
    }
    
    // 4. Mapear, renderizar y añadir listeners
    const productosMapeados = productos.map(data => new Producto(data));

    productosMapeados.forEach((producto) => {
        try {
            const productoId = producto.id; 
            const precioFormateado = producto.getPrecioFormateado(); 
            const estaAgotado = producto.estaAgotado(); 
            
            // Definir atributos y contenido condicional
            const deshabilitado = estaAgotado ? 'disabled' : '';
            const valorCantidad = estaAgotado ? '0' : '1';
            const textoBoton = estaAgotado ? 'AGOTADO' : 'AGREGAR';
            
            const linkHref = `detalle_producto.html?id=${productoId}`; 
            
            const productoDiv = document.createElement('div');
            // Nota: Aquí se asume que tienes clases CSS para 'producto' y sus sub-elementos. 
            // Si usas Tailwind, estas clases deben ser las de las tarjetas de Tailwind.
            productoDiv.classList.add('producto'); 
            
            if (estaAgotado) {
                productoDiv.classList.add('agotado');
            }
            
            productoDiv.setAttribute('data-categoria', categoriaNombre);
            productoDiv.setAttribute('data-precio', producto.precio.toFixed(2));
            
            productoDiv.innerHTML = `
                <a href="${linkHref}" class="producto-link">
                    <img src="${producto.imagen_url}" alt="${producto.nombre}">
                    <h3>${producto.nombre}</h3>
                    <p>Bs. ${precioFormateado}</p>
                    ${estaAgotado ? '<div class="agotado-tag">AGOTADO</div>' : ''} </a>
                <div class="cantidad">
                    <button class="decrementar" data-id="${productoId}" ${deshabilitado}>-</button>
                    <input type="text" class="cantidad-input" data-id="${productoId}" value="${valorCantidad}" readonly ${deshabilitado}>
                    <button class="incrementar" data-id="${productoId}" ${deshabilitado}>+</button>
                </div>
                <button class="agregar add-to-cart-btn" data-product-id="${productoId}" ${deshabilitado}>${textoBoton}</button>
            `;
            productosContainer.appendChild(productoDiv);

        } catch (error) {
            console.error("Error al renderizar un producto (datos no válidos):", producto, error);
        }
    });
    
    // 🛑 LLAMADA CLAVE: Llamar a la función para añadir los listeners aquí, después de renderizar
    agregarListenersCatalogo(); 
}

document.addEventListener('DOMContentLoaded', cargarProductosPorCategoria);