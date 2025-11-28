// js/crear_cuenta.js

import { AuthManager } from './authManager.js';

// =========================================================
// 1. FUNCIONES GLOBALES DE UI (CARRUSEL Y OJO)
// =========================================================

// 🎥 Carrusel de imágenes
function iniciarCarrusel() {
    const slides = document.querySelectorAll(".slide");
    let index = 0;

    function showSlide(n) {
        slides.forEach(slide => {
            slide.style.opacity = "0";
        });
        if (slides[n]) {
            slides[n].style.opacity = "1";
        }
    }

    function changeSlide() {
        index = (index + 1) % slides.length;
        showSlide(index);
    }

    showSlide(index);
    if (slides.length > 0) {
        setInterval(changeSlide, 2500);
    }
}

// 👁️ Función para ver y ocultar la contraseña (Global para el HTML onclick)
// ✅ CORRECCIÓN: Definida en window para evitar ReferenceError en el HTML.
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const eyeOpenIcon = document.getElementById('eye-open');
    const eyeClosedIcon = document.getElementById('eye-closed');
    
    if (passwordInput && eyeOpenIcon && eyeClosedIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeOpenIcon.style.display = 'none';
            eyeClosedIcon.style.display = 'block';
        } else {
            passwordInput.type = 'password';
            eyeOpenIcon.style.display = 'block';
            eyeClosedIcon.style.display = 'none';
        }
    }
};

// =========================================================
// 2. LÓGICA DE REGISTRO (DOM CONTENT LOADED)
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
    
    iniciarCarrusel();
    const authManager = new AuthManager();

    // 📝 Registro del formulario
    document.querySelector(".register-form").addEventListener("submit", async function (event) {
        event.preventDefault();

        // ✅ RECOLECCIÓN DE DATOS
        const primer_nombre = document.querySelector("#nombre")?.value.trim();
        const segundo_nombre = document.querySelector("#segundo-nombre")?.value.trim() || null;
        const apellido_paterno = document.querySelector("#apellido-paterno")?.value.trim();
        const apellido_materno = document.querySelector("#apellido-materno")?.value.trim(); // ✅ CORREGIDO
        const ci = document.querySelector("#ci")?.value.trim();
        const celular = document.querySelector("#celular")?.value.trim();
        const email = document.querySelector("#email")?.value.trim();
        const password = document.querySelector("#password")?.value.trim();

        // 📝 PATRONES DE VALIDACIÓN
        const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
        const soloNumeros = /^[0-9]+$/;
        const correoGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        // La contraseña ya no tiene límite de 8 caracteres en el HTML, pero la validación requiere mínimo 8
        const passwordSegura = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/; 

        // 🛑 VALIDACIONES
        if (!primer_nombre || !apellido_paterno || !apellido_materno || !ci || !celular || !email || !password) {
             alert("⚠️ Todos los campos obligatorios deben ser llenados."); return;
        }
        if (!soloLetras.test(primer_nombre)) {
            alert("⚠️ El primer nombre solo puede contener letras."); return;
        }
        if (segundo_nombre && !soloLetras.test(segundo_nombre)) {
            alert("⚠️ El segundo nombre solo puede contener letras."); return;
        }
        // ✅ CORRECCIÓN: Ahora usa la variable 'apellido_materno' declarada
        if (!soloLetras.test(apellido_paterno) || !soloLetras.test(apellido_materno)) { 
            alert("⚠️ Los apellidos solo pueden contener letras."); return;
        }
        if (!soloNumeros.test(ci) || ci.length !== 7) {
            alert("⚠️ El C.I. debe contener exactamente 7 dígitos."); return;
        }
        if (!soloNumeros.test(celular) || celular.length !== 8) {
            alert("⚠️ El celular debe contener exactamente 8 dígitos."); return;
        }
        if (!correoGmail.test(email)) {
            alert("⚠️ Debes ingresar un correo válido de @gmail.com."); return;
        }
        if (!passwordSegura.test(password)) {
            alert("⚠️ La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, un número y un carácter especial (@$!%*?&)."); return;
        }

        // 🔥 Objeto de datos para el AuthManager
        const nuevoUsuarioData = {
            primer_nombre,
            segundo_nombre,
            apellido_paterno,
            apellido_materno,
            ci, 
            celular,
            correo_electronico: email,
            contrasena: password,
        };

        const result = await authManager.crearUsuario(nuevoUsuarioData);

        if (!result.success) {
            console.error("Error de registro:", result.error);
            // Manejo de errores de Supabase/BD (como C.I. o Email duplicado)
            alert(`⚠️ Hubo un error en el registro: ${result.error}`);
            return;
        }
        
        localStorage.setItem("usuarioEmail", email);
        
        if (result.message) {
            alert(`✅ Registro exitoso. ${result.message}`);
            window.location.href = "inicio_sesion.html";
        } else {
            alert("✅ Registro exitoso. ¡Bienvenido!");
            window.location.href = "index.html"; 
        }
    });

    // ↩️ Función para el botón "Cancelar"
    const cancelButton = document.querySelector(".cancel-btn");
    if (cancelButton) {
        cancelButton.addEventListener("click", function() {
            window.location.href = "inicio_sesion.html";
        });
    }
});