// js/estado_sesion.js

import { AuthManager } from './authManager.js';

document.addEventListener("DOMContentLoaded", async function () {
    const loginLink = document.getElementById("login-link");
    const logoutLink = document.getElementById("logout-link");
    
    // Si no existen los enlaces, salimos
    if (!loginLink || !logoutLink) return;
    
    const authManager = new AuthManager();

    // 1. Verificar el estado de la sesión de Supabase
    // Esto es mucho más seguro que usar localStorage.getItem("usuarioEmail")
    const user = await authManager.getActiveUser();

    if (user) {
        // Usuario logueado (sesión activa)
        loginLink.style.display = "none";
        logoutLink.style.display = "inline-flex";
    } else {
        // Usuario NO logueado
        loginLink.style.display = "inline-flex";
        logoutLink.style.display = "none";
    }

    // 2. Manejar el cierre de sesión (usando AuthManager)
    logoutLink.addEventListener("click", async function (e) {
        e.preventDefault();

        if (confirm("¿Seguro que quieres cerrar sesión?")) {
            // Llamamos al método de Supabase
            const { success, error } = await authManager.cerrarSesion();
            
            if (success) {
                // Limpiamos el residuo anterior y recargamos
                localStorage.removeItem("usuarioEmail"); 
                window.location.href = "index.html";
            } else {
                console.error("Error al cerrar sesión:", error);
                alert("Ocurrió un error al intentar cerrar la sesión. Intenta de nuevo.");
            }
        }
    });
});