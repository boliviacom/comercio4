import { OrdenDetalle } from './OrdenDetalle.js';

export class Orden {
    /**
     * @param {number} id - Clave primaria (BIGINT de Supabase).
     * @param {string} id_usuario - UUID del usuario que realizó la orden.
     * @param {string} fecha - Timestamp de creación.
     * @param {number} total - Precio total de la orden.
     * @param {string} metodo_pago - Tipo de pago (ej: 'tarjeta', 'efectivo').
     * @param {string} estado - Estado de la orden (ej: 'pendiente', 'enviado').
     * @param {boolean} visible - Si la orden es visible para el cliente.
     * @param {number} id_direccion - Clave foránea a la dirección de envío.
     * @param {OrdenDetalle[]} [detalles=[]] - Opcional: Lista de detalles de la orden.
     */
    constructor(id, id_usuario, fecha, total, metodo_pago, estado, visible, id_direccion, detalles = []) {
        if (!id || !id_usuario || !total || !metodo_pago || !id_direccion) {
            throw new Error("Datos esenciales faltantes para la clase Orden.");
        }
        this.id = id;
        this.id_usuario = id_usuario;
        this.fecha = new Date(fecha);
        this.total = parseFloat(total);
        this.metodo_pago = metodo_pago;
        this.estado = estado;
        this.visible = visible;
        this.id_direccion = id_direccion;
        this.detalles = detalles; // Array de objetos OrdenDetalle
    }
    
    // Método de utilidad de ejemplo
    get formattedTotal() {
        return `$${this.total.toFixed(2)}`;
    }
}
