import { supabase } from './supabaseClient.js';

/**
 * 🎨 Plantilla de la tarjeta de producto.
 */
const productCardTemplate = (product) => {
    const categoryName = product.id_categoria?.nombre || 'General'; 
    const finalPrice = product.precio ? product.precio.toFixed(2) : '0.00';
    const linkHref = `detalle_producto.html?id=${product.id}`; 
    const showPrice = product.mostrar_precio;
    
    const imageUrl = (product.imagen_url && typeof product.imagen_url === 'string' && product.imagen_url.trim() !== '') 
        ? product.imagen_url 
        : 'PLACEHOLDER_ICON';

    let placeholderIcon = 'nutrition'; 
    switch (categoryName.toLowerCase()) {
        case 'verduras':
            placeholderIcon = 'eco';
            break;
        case 'lácteos & huevos':
            placeholderIcon = 'egg_alt';
            break;
        case 'panadería':
            placeholderIcon = 'bakery_dining';
            break;
        default:
            placeholderIcon = 'nutrition';
    }

    const starsHtml = `
        <span class="text-yellow-400 text-xs flex">
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm">star</span>
            <span class="material-icons text-sm text-gray-300">star</span>
        </span>
        <span class="text-xs text-gray-400">(4.0)</span> 
    `;
    
    return `
        <div class="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group flex flex-col">
            <div class="relative p-4 flex-shrink-0">
                <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10">
                    <span class="material-icons">favorite_border</span>
                </button>
                <div class="bg-background-light dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center overflow-hidden relative">
                    ${imageUrl === 'PLACEHOLDER_ICON' 
                        ? `<span class="material-symbols-outlined text-primary/30 text-8xl group-hover:scale-105 transition-transform duration-500">${placeholderIcon}</span>`
                        : `<img src="${imageUrl}" alt="${product.nombre}" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>`}
                </div>
            </div>
            
            <div class="px-4 pb-4 flex flex-col flex-grow">
                <div class="mb-2">
                    <span class="text-xs text-gray-400 font-medium">${categoryName}</span>
                    <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 h-12 group-hover:text-primary transition-colors cursor-pointer"
                        onclick="window.location.href='${linkHref}'">
                        ${product.nombre}
                    </h3>
                </div>
                <div class="flex items-center gap-1 mb-3">
                    ${starsHtml}
                </div>
                <div class="mt-auto flex items-center justify-between">
                    ${showPrice 
                        ? `<div class="flex flex-col">
                            <span class="text-lg font-bold text-primary">$${finalPrice}</span>
                        </div>
                        <button data-product-id="${product.id}"
                            class="add-to-cart-btn bg-secondary/20 hover:bg-primary hover:text-white text-primary rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300">
                            <span class="material-icons text-xl">add_shopping_cart</span>
                        </button>`
                        : `<span class="text-sm font-semibold text-gray-600">Consultar Precio</span>`}
                    
                </div>
            </div>
        </div>
    `;
};


/**
 * 📦 Carga y renderiza los productos en la sección "Nuevos Ingresos".
 */
async function loadNewArrivals() {
    const container = document.querySelector('.lg\\:col-span-3 .grid'); 

    if (!container) {
        console.warn("Contenedor de 'Nuevos Ingresos' no encontrado.");
        return;
    }

    try {
        // ⭐ CAMBIO CLAVE: order('id', { ascending: true }) y limit(10)
        let { data: products, error } = await supabase
            .from('producto')
            .select('*, id_categoria(nombre)') 
            .eq('visible', true) 
            .order('id', { ascending: true }) // Ordena por ID ascendente (los primeros productos)
            .limit(10); // Limita la consulta a 10 productos

        if (error) {
            console.error('Error al cargar los productos:', error.message);
            container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Error al cargar productos.</p>';
            return;
        }

        if (!products || products.length === 0) {
            console.warn('Supabase retornó 0 productos para mostrar.');
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">No hay productos disponibles.</p>';
            return;
        }

        // Línea de depuración: Muestra los 10 (o menos) productos en la consola
        console.log('✅ PRODUCTOS OBTENIDOS DE SUPABASE (Primeros 10):');
        console.table(products.map(p => ({
            ID: p.id,
            Nombre: p.nombre,
            Categoria: p.id_categoria?.nombre,
            Precio: `$${p.precio}`,
            URL_Imagen: p.imagen_url, 
            Stock: p.stock
        })));

        const productsHtml = products.map(productCardTemplate).join('');
        container.innerHTML = productsHtml;

    } catch (e) {
        console.error('Excepción al cargar productos:', e);
        container.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Ocurrió un error inesperado.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadNewArrivals);

export { loadNewArrivals };