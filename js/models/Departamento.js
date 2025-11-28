export class Departamento {
    constructor(id, nombre) {
        if (!id || !nombre) {
            throw new Error("El ID y el nombre son requeridos para Departamento.");
        }
        this.id_departamento = id;
        this.nombre = nombre;
    }
}