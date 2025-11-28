export class Municipio {
    constructor(id, nombre, idDepartamento) {
        if (!id || !nombre || !idDepartamento) {
            throw new Error("El ID, nombre e ID de Departamento son requeridos para Municipio.");
        }
        this.id_municipio = id;
        this.nombre = nombre;
        this.id_departamento = idDepartamento;
    }
}