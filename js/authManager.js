// js/authManager.js
import { supabase } from './supabaseClient.js';
import { Usuario } from './models/Usuario.js';

export class AuthManager {
    
    /**
     * Registra un nuevo usuario. 
     * Envía los metadatos necesarios para que el TRIGGER de la BD
     * inserte automáticamente en la tabla 'public.usuario'.
     */
    async registrarUsuario(userData) {
        try {
            // 1. Registro en Supabase Auth con Metadata
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.correo_electronico,
                password: userData.contrasena,
                options: {
                    // Estos datos alimentan el NEW.raw_user_meta_data de tu Trigger
                    data: {
                        primer_nombre: userData.primer_nombre,
                        segundo_nombre: userData.segundo_nombre,
                        apellido_paterno: userData.apellido_paterno,
                        apellido_materno: userData.apellido_materno,
                        correo_electronico: userData.correo_electronico,
                        celular: userData.celular,
                        ci: userData.ci,
                        rol: userData.rol || 'cliente',
                        contrasena: userData.contrasena // Requerido por tu trigger actual
                    }
                }
            });

            if (authError) throw authError;

            // Nota: Si el usuario existe pero requiere confirmación de email, 
            // el Trigger podría no ejecutarse hasta que el usuario confirme, 
            // dependiendo de cómo esté configurado en Supabase.
            
            return { 
                success: true, 
                user: authData.user,
                message: "Registro iniciado. Verifica tu correo si es necesario." 
            };

        } catch (error) {
            console.error("Error en registrarUsuario:", error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Inicia sesión con email y contraseña.
     */
    async iniciarSesion(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Guardamos localmente el ID para facilitar otras consultas
            if (data.user) {
                localStorage.setItem("usuarioId", data.user.id);
            }

            return { success: true, session: data.session };
        } catch (error) {
            console.error("Error en iniciarSesion:", error.message);
            return { success: false, error: "Credenciales inválidas o cuenta no verificada." };
        }
    }

    /**
     * Cierra la sesión activa y limpia el almacenamiento local.
     */
    async cerrarSesion() {
        try {
            const { error } = await supabase.auth.signOut();
            localStorage.removeItem("usuarioId");
            localStorage.removeItem("usuarioEmail");
            return { success: !error, error: error?.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Obtiene el perfil completo del usuario desde la tabla pública.
     * Útil para mostrar el "Hola, [Nombre]" en el header.
     */
    async getPerfilActual() {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) return null;
            
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn("No se encontró perfil en la tabla 'usuario':", error.message);
                return null;
            }

            return data; // Retorna el objeto con primer_nombre, apellido, etc.
        } catch (error) {
            console.error("Error en getPerfilActual:", error);
            return null;
        }
    }

    /**
     * Verifica rápidamente si hay una sesión activa.
     */
    async getActiveUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
}