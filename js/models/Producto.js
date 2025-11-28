// js/models/Producto.js (CÓDIGO CORREGIDO)

export class Producto {
    /**
     * @param {Object} data - Objeto de datos del producto, incluyendo el join de 'categoria' si existe.
     */
    constructor(data) {
        // Mapea las propiedades de la respuesta de Supabase (data)
        this.id = data.id;
        this.nombre = data.nombre;
        this.descripcion = data.descripcion;
        this.imagen_url = data.imagen_url;

        // Aseguramos que el precio sea un número flotante, con un valor por defecto de 0
        this.precio = parseFloat(data.precio) || 0;
        // Aseguramos que el stock sea un entero, con un valor por defecto de 0
        this.stock = parseInt(data.stock) || 0;

        this.id_categoria = data.id_categoria;
        this.visible = data.visible;
        this.mostrar_precio = data.mostrar_precio ?? true;
        this.habilitar_whatsapp = data.habilitar_whatsapp ?? false;
        this.habilitar_formulario = data.habilitar_formulario ?? false;

        // === LA CORRECCIÓN CLAVE PARA EL BREADCRUMB ===
        // Supabase anida la categoría en 'data.categoria'
        if (data.categoria && data.categoria.nombre) {
            this.categoria_nombre = data.categoria.nombre;
        } else {
            this.categoria_nombre = 'Sin Categoría';
        }
        // ===========================================
    }

    estaAgotado() {
        return this.stock <= 0;
    }

    getPrecioFormateado() {
        // Tu función para formatear el precio
        return this.precio.toFixed(2).replace('.', ',');
    }
}