// js/BaseManager.js

import { supabase } from './supabaseClient.js';

export class BaseManager {
    constructor() {
        this.db = supabase;
    }

    // Método de utilidad para manejar la respuesta de Supabase
    _handleResponse({ data, error }, errorMessage) {
        if (error) {
            console.error(`Error en ${errorMessage}:`, error);
            // Puedes lanzar el error o devolver un array/objeto vacío
            throw new Error(`Fallo en la operación: ${errorMessage}`);
        }
        return data;
    }
}