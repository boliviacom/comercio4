export class Localidad {
    constructor(id, nombre, idMunicipio) {
        if (!id || !nombre || !idMunicipio) {
            throw new Error("El ID, nombre e ID de Municipio son requeridos para Localidad.");
        }
        this.id_localidad = id;
        this.nombre = nombre;
        this.id_municipio = idMunicipio;
    }
}