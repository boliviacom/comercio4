// js/inicio_sesion.js
import { AuthManager } from './authManager.js';

document.addEventListener("DOMContentLoaded", async function () {
    const authManager = new AuthManager();

    // =========================================================
    // 1. ACTUALIZAR INTERFAZ (HEADER)
    // =========================================================
    async function actualizarInterfaz() {
        const authText = document.getElementById("auth-text");
        const authWelcome = document.getElementById("auth-welcome");
        const authTrigger = document.getElementById("auth-trigger");
        const authIcon = document.getElementById("auth-icon");

        // Intentamos obtener el perfil del usuario actual desde la base de datos
        const perfil = await authManager.getPerfilActual();

        if (perfil) {
            // --- USUARIO LOGUEADO ---
            // Buscamos 'primer_nombre' que es el campo de tu formulario de registro
            const nombreUsuario = perfil.primer_nombre || perfil.nombre || 'Usuario';

            if (authWelcome) authWelcome.textContent = `Hola, ${nombreUsuario}`;
            if (authText) authText.textContent = "Cerrar sesión";
            if (authIcon) authIcon.textContent = "logout";

            // Quitamos la funcionalidad de abrir el modal (desvinculamos el checkbox)
            if (authTrigger) {
                authTrigger.setAttribute("for", "");

                // Asignamos la función de cerrar sesión
                authTrigger.onclick = async (e) => {
                    e.preventDefault();
                    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
                        await authManager.cerrarSesion();
                        localStorage.removeItem("usuarioEmail");
                        localStorage.removeItem("usuarioId");
                        window.location.reload();
                    }
                };
            }
        } else {
            // --- SIN SESIÓN ---
            if (authWelcome) authWelcome.textContent = "Bienvenido";
            if (authText) authText.textContent = "Iniciar sesión";
            if (authIcon) authIcon.textContent = "person_outline";
            if (authTrigger) {
                authTrigger.setAttribute("for", "auth-modal"); // Reactiva la apertura del modal
                authTrigger.onclick = null;
            }
        }
    }

    // Ejecutar al cargar la página para verificar el estado de la sesión
    await actualizarInterfaz();

    // =========================================================
    // 2. LÓGICA DE INICIO DE SESIÓN (MODAL)
    // =========================================================
    const btnLoginModal = document.getElementById("btn-login-modal");

    if (btnLoginModal) {
        btnLoginModal.addEventListener("click", async function (event) {
            event.preventDefault();

            const emailInput = document.getElementById("login-email");
            const passwordInput = document.getElementById("login-password");

            const email = emailInput?.value.trim() || "";
            const password = passwordInput?.value.trim() || "";

            // Validaciones básicas
            if (email === "" || password === "") {
                alert("⚠️ Por favor, completa todos los campos.");
                return;
            }

            // Feedback visual en el botón
            const originalText = btnLoginModal.textContent;
            btnLoginModal.textContent = "Cargando...";
            btnLoginModal.disabled = true;

            try {
                const authResult = await authManager.iniciarSesion(email, password);

                if (authResult.success) {
                    // Guardar email para referencia rápida
                    localStorage.setItem("usuarioEmail", email);

                    // Cerrar el modal desmarcando el checkbox invisible
                    const modalToggle = document.getElementById('auth-modal');
                    if (modalToggle) modalToggle.checked = false;

                    alert("✅ ¡Inicio de sesión exitoso!");
                    window.location.reload(); // Recargar para aplicar cambios en el header
                } else {
                    alert("❌ Error: Correo o contraseña incorrectos.");
                }
            } catch (error) {
                console.error("Error en login:", error);
                alert("❌ Ocurrió un error inesperado.");
            } finally {
                btnLoginModal.textContent = originalText;
                btnLoginModal.disabled = false;
            }
        });
    }
});