// js/DirectionManager.js
import { supabase } from './supabaseClient.js';

export class DirectionManager {
    constructor() {
        this.supabase = supabase;
    }

    /**
     * Crea una nueva dirección en la base de datos.
     * @param {object} direccionData - Datos de la dirección a guardar.
     */
    async createDirection(direccionData) {
        const { data, error } = await this.supabase
            .from('direccion')
            .insert(direccionData)
            // Retorna el registro insertado (necesitamos el id_direccion)
            .select('id_direccion'); 

        if (error) throw new Error('Error al crear dirección: ' + error.message);
        return data;
    }
}