// js/OrderManager.js
import { supabase } from './supabaseClient.js';

export class OrderManager {
    constructor() {
        this.supabase = supabase;
    }

    /**
     * Crea la orden principal y los detalles de la orden en una sola transacción simulada.
     */
    async createOrder(orderData, itemsData) {
        let orderId = null;
        
        try {
            // 1. Insertar la Orden Principal
            const { data: orderResult, error: orderError } = await this.supabase
                .from('orden')
                .insert([orderData])
                .select('id'); // ✅ CLAVE PRIMARIA de la tabla 'orden'

            if (orderError) throw orderError;
            
            // 2. RECUPERAR EL ID CORRECTO
            // Usar 'id'
            orderId = orderResult[0].id; 
            
            // 3. Preparar los Detalles de la Orden
            const orderDetails = itemsData.map(item => ({
                id_orden: orderId, // ✅ Usar 'id_orden' (FK en orden_detalle)
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario
            }));

            // 4. Insertar los Detalles
            const { error: detailsError } = await this.supabase
                .from('orden_detalle') // ✅ Usar el nombre real de la tabla
                .insert(orderDetails);

            if (detailsError) throw detailsError;

            // Retorna el ID de la orden para la factura
            return { success: true, orderId: orderId };

        } catch (error) {
            console.error("Error en la transacción de orden:", error);
            throw new Error(`Fallo al crear la orden. Mensaje: ${error.message}`);
        }
    }
}