export class Zona {
    constructor(id, nombre, idLocalidad) {
        if (!id || !nombre || !idLocalidad) {
            throw new Error("El ID, nombre e ID de Localidad son requeridos para Zona.");
        }
        this.id_zona = id;
        this.nombre = nombre;
        this.id_localidad = idLocalidad;
    }
}