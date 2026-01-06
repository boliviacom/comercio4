// js/crear_cuenta.js
import { AuthManager } from './authManager.js';

document.addEventListener("DOMContentLoaded", () => {
    const authManager = new AuthManager();
    const btnRegister = document.getElementById("btn-register-modal");

    if (btnRegister) {
        btnRegister.addEventListener("click", async (e) => {
            e.preventDefault();

            // 1. CAPTURA DE DATOS DEL DOM
            const primer_nombre = document.getElementById("reg-first-name")?.value.trim();
            const segundo_nombre = document.getElementById("reg-second-name")?.value.trim() || null;
            const apellido_paterno = document.getElementById("reg-last-name-p")?.value.trim();
            const apellido_materno = document.getElementById("reg-last-name-m")?.value.trim();
            const ci = document.getElementById("reg-ci")?.value.trim();
            const celular = document.getElementById("reg-mobile")?.value.trim();
            const email = document.getElementById("reg-email")?.value.trim();
            const password = document.getElementById("reg-password")?.value.trim();
            const confirmPassword = document.getElementById("reg-confirm")?.value.trim();
            const termsChecked = document.getElementById("terms")?.checked;

            // 2. VALIDACIONES LÓGICAS
            if (!primer_nombre || !apellido_paterno || !apellido_materno || !ci || !celular || !email || !password) {
                alert("⚠️ Por favor, completa todos los campos obligatorios.");
                return;
            }

            if (password !== confirmPassword) {
                alert("❌ Las contraseñas no coinciden.");
                return;
            }

            if (password.length < 6) {
                alert("❌ La contraseña debe tener al menos 6 caracteres.");
                return;
            }

            if (!termsChecked) {
                alert("⚠️ Debes aceptar los términos y condiciones.");
                return;
            }

            // 3. PREPARACIÓN DEL OBJETO (Coincidiendo con tu tabla SQL)
            const nuevoUsuarioData = {
                primer_nombre,
                segundo_nombre,
                apellido_paterno,
                apellido_materno,
                correo_electronico: email,
                contrasena: password, // El AuthManager debería manejar el hashing o Supabase Auth
                celular,
                ci,
                rol: 'cliente',       // Valor por defecto según tu SQL
                visible: true         // Requerido (NOT NULL) en tu tabla
            };

            // 4. FEEDBACK VISUAL
            const originalText = btnRegister.textContent;
            btnRegister.textContent = "Creando cuenta...";
            btnRegister.disabled = true;

            try {
                // 5. LLAMADA AL SERVICIO
                const result = await authManager.registrarUsuario(nuevoUsuarioData);

                if (result.success) {
                    alert("✅ Cuenta creada con éxito. ¡Bienvenido!");
                    // Opcional: limpiar campos o cerrar modal
                    window.location.reload(); 
                } else {
                    // Manejo de errores específicos (ej: correo duplicado)
                    if (result.error?.includes("usuario_correo_electronico_key")) {
                        alert("❌ Este correo ya está registrado.");
                    } else if (result.error?.includes("usuario_ci_key")) {
                        alert("❌ Este C.I. ya se encuentra en nuestra base de datos.");
                    } else {
                        alert(`❌ Error al registrar: ${result.error}`);
                    }
                }
            } catch (error) {
                console.error("Error en el proceso de registro:", error);
                alert("❌ Ocurrió un error inesperado al procesar el registro.");
            } finally {
                btnRegister.textContent = originalText;
                btnRegister.disabled = false;
            }
        });
    }
});