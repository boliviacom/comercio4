// js/main.js

import { supabase } from './supabaseClient.js';

// Función de formato integrada 
const firstLetterUppercase = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// 🛑 PARÁMETROS FIJOS (DEBEN COINCIDIR CON EL CSS)
const SLIDE_WIDTH_REM = 12;   // Ancho fijo de la tarjeta
const SLIDE_GAP_REM = 3;      // Espacio fijo entre tarjetas

const slideTemplate = (data) => {
    const linkHref = `detalle_producto.html?id=${data.id}`; 
    
    return `
        <div class="slide producto-carrusel-item" data-id="${data.id}">
            <a href="${linkHref}" class="slide__link">
                <img src="${data.imagen_url}" alt="${data.nombre}" class="carrusel-img">
                <p class="product__name product__name--fixed">${firstLetterUppercase(data.nombre)}</p>
            </a>
        </div>
    `;
};

/**
 * Carga productos, los duplica, renderiza y calcula las variables CSS
 * para la animación infinita y fluida.
 */
async function cargarCarruselProductos() {
    const slideTrack = document.querySelector(".slide__track");
    const sliderContainer = document.getElementById('carrusel-productos-infinito'); 

    if (!slideTrack || !sliderContainer) {
        console.warn("Contenedor de carrusel no encontrado. Verifique el ID/Clase.");
        return;
    }

    // 1. Obtención de Productos
    let { data: productos, error } = await supabase
        .from('producto')
        .select('id, nombre, imagen_url') 
        .eq('visible', true);

    if (error || !productos.length) {
        console.error('Error al cargar productos:', error);
        sliderContainer.innerHTML = '<p style="text-align:center;">No hay productos para el carrusel.</p>';
        return;
    }
    
    // 2. Aleatorización y Duplicación (2x para el bucle infinito)
    const productosAleatorios = [...productos].sort(() => 0.5 - Math.random());
    const listaCompleta = [...productosAleatorios, ...productosAleatorios];
    
    const numProductosOriginales = productosAleatorios.length;
    const numProductosTotal = listaCompleta.length;

    // 3. Renderizado
    const carruselCards = listaCompleta
        .map(data => slideTemplate(data))
        .join("");
        
    slideTrack.innerHTML = carruselCards;

    // 4. Cálculo y Aplicación de Variables CSS
    
    const itemFullWidth = SLIDE_WIDTH_REM + SLIDE_GAP_REM; 
    const totalWidthRem = (itemFullWidth * numProductosTotal) - SLIDE_GAP_REM;
    const translationDistanceRem = (itemFullWidth * numProductosOriginales) - SLIDE_GAP_REM;

    // Aplicar las variables CSS Custom Property
    slideTrack.style.setProperty('width', `${totalWidthRem}rem`);
    sliderContainer.style.setProperty('--scroll-distance', `-${translationDistanceRem}rem`); 
    
    // Ajustar la duración de la animación para mantener una velocidad constante
    const newDuration = Math.max(40, numProductosOriginales * 3.5);
    sliderContainer.style.setProperty('--animation-duration', `${newDuration}s`);
}

document.addEventListener('DOMContentLoaded', cargarCarruselProductos);
