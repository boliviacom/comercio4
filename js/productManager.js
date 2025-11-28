// js/productManager.js

import { supabase } from './supabaseClient.js';

export class ProductManager {
    async searchProductsByName(searchTerm) {
        if (!searchTerm || searchTerm.length < 3) {
            return [];
        }

        // 🛑 CORRECCIÓN CLAVE: Cambiar 'productos' a 'producto' (singular)
        const { data, error } = await supabase
            .from('producto') // AHORA ES 'producto'
            .select('nombre, imagen_url, id')
            .ilike('nombre', `%${searchTerm}%`)
            .limit(8);

        if (error) {
            console.error('Error buscando productos:', error);
            return [];
        }

        return data;
    }
}