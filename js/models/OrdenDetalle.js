export class OrdenDetalle {
    /**
     * @param {number} id - Clave primaria (BIGINT de Supabase).
     * @param {number} id_orden - Clave foránea a la orden.
     * @param {number} id_producto - Clave foránea al producto.
     * @param {number} cantidad - Cantidad comprada.
     * @param {number} precio_unitario - Precio del producto en el momento de la compra.
     * @param {string} [nombre_producto] - Opcional: Nombre si se trae con JOIN.
     */
    constructor(id, id_orden, id_producto, cantidad, precio_unitario, nombre_producto = 'N/D') {
        if (!id || !id_orden || !id_producto || !cantidad || !precio_unitario) {
            throw new Error("Datos esenciales faltantes para la clase OrdenDetalle.");
        }
        this.id = id;
        this.id_orden = id_orden;
        this.id_producto = id_producto;
        this.cantidad = parseInt(cantidad);
        this.precio_unitario = parseFloat(precio_unitario);
        this.nombre_producto = nombre_producto;
    }

    // Método de utilidad de ejemplo
    get subtotal() {
        return this.cantidad * this.precio_unitario;
    }
}