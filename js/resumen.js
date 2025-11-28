// js/resumen.js

import { supabase } from './supabaseClient.js';
import { GeoManager } from './geoManager.js';
import { DirectionManager } from './DirectionManager.js';
import { OrderManager } from './OrderManager.js';
import { AuthManager } from './authManager.js';

// ------------------------------------------------------------------
// 1. INICIALIZACIÓN DE MANAGERS Y ELEMENTOS
// ------------------------------------------------------------------

const authManager = new AuthManager();
const geoManager = new GeoManager();
const directionManager = new DirectionManager();
const orderManager = new OrderManager();

// Estado Local del Carrito
let carrito = [];

// Elementos del DOM
const resumenContenedor = document.getElementById("listaCarrito");
const totalElemento = document.getElementById("totalFinal");

const selectDepartamento = document.getElementById('id_departamento');
const selectMunicipio = document.getElementById('id_municipio');
const selectLocalidad = document.getElementById('id_localidad');
const selectZona = document.getElementById('id_zona');

const inputPrimerNombre = document.getElementById('nombre'); // Nombre Completo (input único)
const inputCI = document.getElementById('ci');
const inputCelular = document.getElementById('celular');
const inputEmail = document.getElementById('email');

const btnFinalizarCompra = document.querySelector('.pago-finalizar');

// Variables de estado
let selectedPaymentMethod = '';
let usuarioActual = null;


// ------------------------------------------------------------------
// 2. LÓGICA DEL CARRITO
// ------------------------------------------------------------------

function cargarCarrito() {
    carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    return carrito;
}

function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

function calcularTotal() {
    return carrito.reduce((acc, prod) => acc + prod.precio * prod.cantidad, 0);
}

// Funciones globales (necesarias para los onclick del HTML)
window.obtenerItemsDelCarrito = () => carrito;
window.calcularTotal = () => calcularTotal();
window.vaciarCarrito = () => {
    localStorage.removeItem("carrito");
    carrito = [];
    alert("Carrito vacío. Redirigiendo al inicio.");
    window.location.href = 'index.html';
};

function actualizarTotalUI() {
    const total = calcularTotal();
    if (totalElemento) {
        totalElemento.textContent = `Bs. ${total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
    }
}

function mostrarResumenCarrito() {
    cargarCarrito();

    if (!resumenContenedor) return;

    resumenContenedor.innerHTML = "";

    if (carrito.length === 0) {
        resumenContenedor.innerHTML = "<p class='pago-empty-cart'>El carrito está vacío. Añade productos para comprar.</p>";
        if (totalElemento) totalElemento.textContent = "Bs. 0,00";
        if (btnFinalizarCompra) btnFinalizarCompra.disabled = true;

        if (document.readyState === 'complete' && window.location.pathname.includes('modulo_pago.html')) {
            alert("Tu carrito está vacío. Redirigiendo al catálogo.");
            window.location.href = "index.html";
        }
        return;
    }

    if (btnFinalizarCompra) btnFinalizarCompra.disabled = false;

    carrito.forEach((producto, index) => {
        const item = document.createElement("div");
        item.classList.add("pago-cart-item");

        item.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="pago-img">
            <div class="pago-item-detalles">
                <h4>${producto.nombre}</h4>
                <p>Precio: Bs. ${producto.precio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
                <div class="pago-controles">
                    <button class="menos" data-index="${index}">-</button>
                    <span>${producto.cantidad}</span>
                    <button class="mas" data-index="${index}">+</button>
                    <button class="eliminar" data-index="${index}">🗑</button>
                </div>
                <p>Subtotal: Bs. ${(producto.precio * producto.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
        `;
        resumenContenedor.appendChild(item);
    });

    actualizarTotalUI();
}

// Listener para la manipulación del carrito
if (resumenContenedor) {
    resumenContenedor.addEventListener("click", (e) => {
        const index = e.target.dataset.index;
        if (index === undefined) return;

        const indexNum = parseInt(index);

        if (e.target.classList.contains("mas")) {
            carrito[indexNum].cantidad++;
        } else if (e.target.classList.contains("menos")) {
            if (carrito[indexNum].cantidad > 1) carrito[indexNum].cantidad--;
        } else if (e.target.classList.contains("eliminar")) {
            carrito.splice(indexNum, 1);
        }

        guardarCarrito();
        mostrarResumenCarrito();
    });
}

// ------------------------------------------------------------------
// 3. LÓGICA DE GEOLOCALIZACIÓN
// ------------------------------------------------------------------

function fillSelect(selectElement, items, idKey, nameKey, defaultText) {
    if (!selectElement) return;

    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[idKey];
        option.textContent = item[nameKey];
        selectElement.appendChild(option);
    });

    if (selectElement.id !== 'id_departamento') {
        selectElement.disabled = items.length === 0;
    }
}


async function loadDepartamentos() {
    if (!selectDepartamento) return;

    try {
        const departamentos = await geoManager.getDepartamentos();
        fillSelect(selectDepartamento, departamentos, 'id_departamento', 'nombre', 'Seleccione Departamento');
        selectDepartamento.disabled = false;
    } catch (e) {
        console.error("Fallo al cargar departamentos:", e);
        alert('Error al cargar datos geográficos.');
    }
}

// Listeners Geográficos
if (selectDepartamento) {
    selectDepartamento.addEventListener('change', async (e) => {
        const idDepartamento = e.target.value;
        fillSelect(selectMunicipio, [], 'id_municipio', 'nombre', 'Seleccione Municipio');
        fillSelect(selectLocalidad, [], 'id_localidad', 'nombre', 'Seleccione Localidad');
        fillSelect(selectZona, [], 'id_zona', 'nombre', 'Seleccione Zona (Opcional)');

        if (idDepartamento) {
            try {
                const municipios = await geoManager.getMunicipiosByDepartamento(idDepartamento);
                fillSelect(selectMunicipio, municipios, 'id_municipio', 'nombre', 'Seleccione Municipio');
            } catch (e) {
                console.error("Fallo al cargar municipios:", e);
            }
        }
    });
}
if (selectMunicipio) {
    selectMunicipio.addEventListener('change', async (e) => {
        const idMunicipio = e.target.value;
        fillSelect(selectLocalidad, [], 'id_localidad', 'nombre', 'Seleccione Localidad');
        fillSelect(selectZona, [], 'id_zona', 'nombre', 'Seleccione Zona (Opcional)');

        if (idMunicipio) {
            try {
                const localidades = await geoManager.getLocalidadesByMunicipio(idMunicipio);
                fillSelect(selectLocalidad, localidades, 'id_localidad', 'nombre', 'Seleccione Localidad');
            } catch (e) {
                console.error("Fallo al cargar localidades:", e);
            }
        }
    });
}
if (selectLocalidad) {
    selectLocalidad.addEventListener('change', async (e) => {
        const idLocalidad = e.target.value;
        fillSelect(selectZona, [], 'id_zona', 'nombre', 'Seleccione Zona (Opcional)');

        if (idLocalidad) {
            try {
                const zonas = await geoManager.getZonasByLocalidad(idLocalidad);
                fillSelect(selectZona, zonas, 'id_zona', 'nombre', 'Seleccione Zona (Opcional)');
            } catch (e) {
                console.error("Fallo al cargar zonas:", e);
            }
        }
    });
}


// ------------------------------------------------------------------
// 4. LÓGICA DE MODALES Y MÉTODO DE PAGO
// ------------------------------------------------------------------

window.mostrarModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

window.cerrarModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

window.generarQR = () => {
    const canvas = document.getElementById('qr-canvas');
    const total = calcularTotal().toFixed(2).replace('.', ',');
    const dataQR = `BS-${total}|Ref: Compra Tienda Online`;

    if (window.QRCode && canvas) {
        canvas.innerHTML = '';
        try {
            // eslint-disable-next-line no-undef
            QRCode.toCanvas(canvas, dataQR, function (error) {
                if (error) {
                    console.error('Error al renderizar QR con toCanvas:', error);
                    canvas.innerHTML = '<p style="color: red;">Fallo al renderizar el código QR.</p>';
                }
            }, {
                width: 200,
                height: 200
            });

        } catch (e) {
            console.error("Error IRREPARABLE al generar QR. Verifica que la librería esté cargada y sea compatible.", e);
            canvas.innerHTML = '<p style="color: red;">Error crítico al generar QR.</p>';
        }
    } else {
        console.error("Librería QRCode (window.QRCode) o canvas no cargados. ¿Está 'qrcode.js' enlazado correctamente?");
    }
}


window.seleccionarMetodo = (metodo) => {
    // 1. Limpia todas las selecciones
    document.querySelectorAll('.metodo-seleccionable').forEach(img => img.classList.remove('seleccionado'));

    const metodoInput = document.getElementById('metodo-seleccionado');

    if (metodo === 'Tarjeta') {
        mostrarModal('modal-tarjeta');
        if (metodoInput) metodoInput.value = '';
    } else if (metodo === 'Transferencia') {
        mostrarModal('modal-transferencia');
        generarQR();
        if (metodoInput) metodoInput.value = '';
    } else { // Efectivo
        selectedPaymentMethod = 'Efectivo';
        if (metodoInput) metodoInput.value = 'Efectivo';
        const opcionElement = document.getElementById(`opcion-efectivo`);

        if (opcionElement) opcionElement.querySelector('.metodo-seleccionable')?.classList.add('seleccionado');
    }
}

window.confirmarTarjeta = () => {
    const numTarjeta = document.getElementById('numero-tarjeta')?.value.trim();
    const codSeguridad = document.getElementById('codigo-seguridad')?.value.trim();

    if (!numTarjeta || !/^\d{16}$/.test(numTarjeta)) {
        alert('El número de tarjeta debe tener exactamente 16 dígitos.');
        return;
    }
    if (!codSeguridad || !/^\d{4}$/.test(codSeguridad)) {
        alert('El código de seguridad debe tener exactamente 4 dígitos.');
        return;
    }

    document.getElementById('metodo-seleccionado').value = 'Tarjeta';
    selectedPaymentMethod = 'Tarjeta';

    document.getElementById('opcion-tarjeta')?.querySelector('.metodo-seleccionable')?.classList.add('seleccionado');

    cerrarModal('modal-tarjeta');
}

window.confirmarTransferencia = () => {
    document.getElementById('metodo-seleccionado').value = 'QR';
    selectedPaymentMethod = 'QR';

    document.getElementById('opcion-transferencia')?.querySelector('.metodo-seleccionable')?.classList.add('seleccionado');

    cerrarModal('modal-transferencia');
}

// ------------------------------------------------------------------
// 5. VALIDACIÓN Y PROCESAMIENTO FINAL
// ------------------------------------------------------------------

function validarFormularioCompleto() {
    const datosForm = document.getElementById('pago-form-datos');
    const addressForm = document.getElementById('addressForm');

    if (datosForm && !datosForm.reportValidity()) return false;
    if (addressForm && !addressForm.reportValidity()) return false;

    if (!selectedPaymentMethod) {
        alert("Por favor, selecciona un método de pago.");
        return false;
    }

    if (carrito.length === 0) {
        alert("Tu carrito está vacío. Añade productos para comprar.");
        return false;
    }

    if (!selectDepartamento?.value || !selectMunicipio?.value || !selectLocalidad?.value) {
        alert("Debes seleccionar Departamento, Municipio y Localidad.");
        return false;
    }

    if (inputCelular && !/^[0-9]{8}$/.test(inputCelular.value.trim())) {
        alert("El campo 'Celular' debe contener exactamente 8 dígitos numéricos.");
        inputCelular.focus();
        return false;
    }

    if (inputCI && !/^[0-9]{6,12}$/.test(inputCI.value.trim())) {
        alert("El campo 'C.I.' debe contener solo números (mínimo 6 dígitos).");
        inputCI.focus();
        return false;
    }

    return true;
}

async function generarFacturaPDF(orderId) {
    // eslint-disable-next-line no-undef
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const logo = new Image();
    logo.src = "./imagenes/logo.png";

    let y = 10;
    const margin = 10;
    const lineHeight = 7;

    // Header
    if (logo.complete) {
        doc.addImage(logo, "PNG", margin, y, 40, 15);
    }
    doc.setFontSize(16);
    doc.text("FACTURA DE COMPRA", 200 - margin, y + 7, { align: "right" });
    y += 20;

    // Metadatos de la Factura
    doc.setFontSize(10);
    doc.text(`N° de Pedido/Factura: ${orderId || Math.floor(100000 + Math.random() * 900000)}`, margin, y); y += lineHeight;
    doc.text(`Fecha: ${new Date().toLocaleDateString()} | Hora: ${new Date().toLocaleTimeString()}`, margin, y); y += lineHeight * 2;

    // Detalles del Cliente
    doc.setFontSize(12);
    doc.text("DATOS DEL CLIENTE", margin, y); y += lineHeight;
    doc.setFontSize(10);
    doc.text(`Cliente: ${inputPrimerNombre.value.trim()} (CI: ${inputCI.value.trim()})`, margin, y); y += lineHeight;
    doc.text(`Contacto: ${inputCelular.value.trim()} | Email: ${inputEmail.value.trim()}`, margin, y); y += lineHeight;
    doc.text(`Método de pago: ${selectedPaymentMethod}`, margin, y); y += lineHeight * 2;

    // Detalles de la Dirección
    const departamentoNombre = selectDepartamento.options[selectDepartamento.selectedIndex].text;
    const municipioNombre = selectMunicipio.options[selectMunicipio.selectedIndex].text;
    const localidadNombre = selectLocalidad.options[selectLocalidad.selectedIndex].text;

    doc.setFontSize(12);
    doc.text("DIRECCIÓN DE ENTREGA", margin, y); y += lineHeight;
    doc.setFontSize(10);
    doc.text(`Ubicación: ${localidadNombre} (${departamentoNombre}, ${municipioNombre})`, margin, y); y += lineHeight;
    doc.text(`Dirección: ${document.getElementById('calle_avenida').value}, Nro: ${document.getElementById('numero_casa_edificio').value || 'S/N'}`, margin, y); y += lineHeight;
    doc.text(`Referencia: ${document.getElementById('referencia_adicional').value.substring(0, 100)}...`, margin, y); y += lineHeight * 2;


    // Tabla de Productos 
    const tableData = carrito.map(producto => [
        producto.nombre,
        producto.cantidad,
        `Bs. ${producto.precio.toFixed(2)}`,
        `Bs. ${(producto.cantidad * producto.precio).toFixed(2)}`
    ]);

    if (window.jspdf.AcroForm) {
        doc.autoTable({
            startY: y,
            head: [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            // 🛑 MODIFICACIONES DE COLOR PARA VERDE OSCURO 🛑
            headStyles: {
                fillColor: '#006400', // Verde Oscuro
                textColor: '#FFFFFF',
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: '#E8F5E9' // Verde claro
            },
            // 🛑 FIN MODIFICACIONES DE COLOR 🛑
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 3: { halign: 'right' } },
        });
        y = doc.autoTable.previous.finalY + 10;
    } else {
        doc.setFontSize(12);
        doc.text("Productos:", margin, y); y += lineHeight;
        carrito.forEach((producto) => {
            doc.text(`${producto.nombre} (x${producto.cantidad}) - Subtotal: Bs. ${(producto.cantidad * producto.precio).toFixed(2)}`, margin, y); y += lineHeight;
        });
        y += 5;
    }

    // Total Final
    doc.setFontSize(14);
    doc.text(`TOTAL FINAL: Bs. ${calcularTotal().toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 200 - margin, y, { align: "right" });

    doc.save(`Factura_Pedido_${orderId}.pdf`);
}

/**
 * Carga los datos del usuario autenticado y BLOQUEA los campos.
 */
async function loadUserData() {
    const perfil = await authManager.getPerfilActual();

    if (perfil) {
        usuarioActual = perfil;

        // 1. CONSTRUIR NOMBRE COMPLETO: Garantizando el espacio correcto.
        const partesNombre = [
            perfil.primer_nombre,
            perfil.segundo_nombre,
            perfil.apellido_paterno,
            perfil.apellido_materno
        ];

        // Filtra nulos/vacíos y unir con un solo espacio.
        const nombreCompleto = partesNombre
            .filter(parte => parte && parte.trim().length > 0)
            .join(' ');

        // 2. CARGAR Y BLOQUEAR CAMPOS
        if (inputPrimerNombre) {
            inputPrimerNombre.value = nombreCompleto;
            inputPrimerNombre.disabled = true; // 🔒 BLOQUEADO
        }
        if (inputEmail) {
            inputEmail.value = perfil.correo_electronico || '';
            inputEmail.disabled = true; // 🔒 BLOQUEADO
        }
        if (inputCI) {
            inputCI.value = perfil.ci || '';
            inputCI.disabled = true; // 🔒 BLOQUEADO
        }
        if (inputCelular) {
            inputCelular.value = perfil.celular || '';
            inputCelular.disabled = true; // 🔒 BLOQUEADO 
        }

    } else {
        alert("Debes iniciar sesión para acceder a la página de pago.");
        window.location.href = 'inicio_sesion.html';
    }
}


if (btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!validarFormularioCompleto()) return;

        if (!usuarioActual) {
            alert("Error de sesión. Recargando datos...");
            await loadUserData();
            if (!usuarioActual) return;
        }

        // 🎯 Obtener el ID de usuario más fresco
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
            alert("Error de sesión: No se pudo obtener el ID de usuario autenticado.");
            return;
        }
        const user = userData.user;

        const totalCompra = calcularTotal();
        const itemsDelCarrito = obtenerItemsDelCarrito();

        try {
            // --- 1. Guardar la Dirección ---
            const direccionData = {
                id_usuario: user.id,
                id_localidad: parseInt(selectLocalidad.value),
                id_zona: selectZona.value ? parseInt(selectZona.value) : null,
                calle_avenida: document.getElementById('calle_avenida').value,
                numero_casa_edificio: document.getElementById('numero_casa_edificio').value || null,
                referencia_adicional: document.getElementById('referencia_adicional').value
            };

            const newDirection = await directionManager.createDirection(direccionData);
            const idDireccion = newDirection[0].id_direccion;


            // --- 2. Crear la Orden Principal y Detalles ---
            const orderData = {
                id_usuario: user.id,
                id_direccion: idDireccion,
                total: totalCompra,
                metodo_pago: selectedPaymentMethod.toLowerCase(),
                estado: 'pendiente',
                visible: true
            };

            const itemsParaOrden = itemsDelCarrito.map(item => ({
                id_producto: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio
            }));


            const result = await orderManager.createOrder(orderData, itemsParaOrden);

            // --- 5. Lógica de UI Post-Compra ---
            if (result && result.orderId) {
                await generarFacturaPDF(result.orderId);

                // ✅ Mensaje de éxito
                alert(`🎉 ¡Compra finalizada! La factura se ha descargado.`);

                window.vaciarCarrito();
            } else {
                throw new Error("El OrderManager no devolvió un ID de orden válido.");
            }

        } catch (e) {
            console.error("Error al procesar la compra:", e);

            // 🛑 NUEVA LÓGICA DE MANEJO DE ERROR DE STOCK PARA MEJOR UX 🛑
            if (e.message && e.message.includes('Stock insuficiente')) {
                alert("❌ Compra Cancelada. Uno o más productos en tu carrito exceden el stock disponible. Por favor, revisa las cantidades e intenta de nuevo.");
            } else {
                // Mensaje para otros errores (conexión, RLS, etc.)
                alert(`❌ Fallo al procesar tu compra. Error: ${e.message}`);
            }
            // 🛑 FIN NUEVA LÓGICA 🛑
        }
    });
}


// ------------------------------------------------------------------
// 6. INICIO AL CARGAR EL DOCUMENTO
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    mostrarResumenCarrito();
    loadDepartamentos();

    const storedMethod = document.getElementById('metodo-seleccionado')?.value;
    if (storedMethod) {
        // Al inicio, restauramos el estado visual
        seleccionarMetodo(storedMethod);
        // Si no es efectivo, cerramos el modal que seleccionarMetodo abrió temporalmente.
        if (storedMethod !== 'Efectivo') {
            cerrarModal(`modal-${storedMethod.toLowerCase()}`);
        }
    }
});