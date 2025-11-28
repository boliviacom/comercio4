// js/GeoManager.js
import { supabase } from './supabaseClient.js';

export class GeoManager {
    constructor() {
        this.supabase = supabase;
    }

    /**
     * Obtiene la lista de departamentos.
     */
    async getDepartamentos() {
        const { data, error } = await this.supabase
            .from('departamento')
            .select('id_departamento, nombre')
            .order('nombre', { ascending: true });

        if (error) throw new Error('Error al cargar departamentos: ' + error.message);
        return data;
    }

    /**
     * Obtiene los municipios dado un id_departamento.
     */
    async getMunicipiosByDepartamento(idDepartamento) {
        const { data, error } = await this.supabase
            .from('municipio')
            .select('id_municipio, nombre')
            .eq('id_departamento', idDepartamento)
            .order('nombre', { ascending: true });

        if (error) throw new Error('Error al cargar municipios: ' + error.message);
        return data;
    }

    /**
     * Obtiene las localidades dado un id_municipio.
     */
    async getLocalidadesByMunicipio(idMunicipio) {
        const { data, error } = await this.supabase
            .from('localidad')
            .select('id_localidad, nombre')
            .eq('id_municipio', idMunicipio)
            .order('nombre', { ascending: true });

        if (error) throw new Error('Error al cargar localidades: ' + error.message);
        return data;
    }

    /**
     * Obtiene las zonas dado un id_localidad (opcional).
     */
    async getZonasByLocalidad(idLocalidad) {
        const { data, error } = await this.supabase
            .from('zona')
            .select('id_zona, nombre')
            .eq('id_localidad', idLocalidad)
            .order('nombre', { ascending: true });

        if (error) throw new Error('Error al cargar zonas: ' + error.message);
        return data;
    }
}
