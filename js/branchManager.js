/**
 * branchManager.js
 * Gestiona la selección de sucursal, la persistencia en el navegador
 * y la actualización visual en el Header y el Modal.
 */

import { supabase } from './supabaseClient.js';
// 🚩 Importamos todas las funciones de carga necesarias
import { loadNewArrivals, loadBestSellers } from './productManager.js';

/**
 * Inicializa el sistema de sucursales.
 */
export async function initBranchSystem() {
    const modal = document.getElementById('branch-modal');
    const branchId = localStorage.getItem('selectedBranchId');
    const branchName = localStorage.getItem('selectedBranchName');
    const confirmBtn = document.getElementById('confirm-branch-btn');
    const headerBranchText = document.getElementById('current-branch-name');

    // 1. Actualizar el Header inmediatamente si ya tenemos datos
    if (branchName && headerBranchText) {
        headerBranchText.innerText = branchName;
    }

    // 2. Cargar siempre la lista de sucursales en el modal
    await loadBranchesList();

    // 3. Control de visibilidad del Modal
    if (!branchId && modal) {
        modal.classList.remove('hidden');
    }

    // 4. Configurar el evento del botón Confirmar
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const selectedRadio = document.querySelector('input[name="branch"]:checked');
            
            if (selectedRadio) {
                const id = selectedRadio.value;
                const nombre = selectedRadio.dataset.name;

                // Guardar selección
                localStorage.setItem('selectedBranchId', id);
                localStorage.setItem('selectedBranchName', nombre);

                // Actualización visual del Header
                if (headerBranchText) {
                    headerBranchText.innerText = nombre;
                }

                // Ocultar el modal
                if (modal) {
                    modal.classList.add('hidden');
                }

                // 🚩 RECARGA INTEGRAL DE PRODUCTOS
                // Ejecutamos ambas recargas para que toda la UI sea coherente con la nueva sucursal
                await Promise.all([
                    loadNewArrivals(),
                    loadBestSellers()
                ]);
                
                console.log(`Sucursal cambiada a: ${nombre} (ID: ${id})`);
            } else {
                alert("Por favor, selecciona una sucursal para continuar.");
            }
        };
    }
}

/**
 * Obtiene las sucursales de Supabase y genera las tarjetas de selección.
 */
async function loadBranchesList() {
    const container = document.getElementById('branches-container');
    if (!container) return;

    try {
        const { data: sucursales, error } = await supabase
            .from('sucursal')
            .select('*')
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (error) throw error;

        if (!sucursales || sucursales.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-500">No hay sucursales disponibles.</p>';
            return;
        }

        const currentSavedId = localStorage.getItem('selectedBranchId');

        container.innerHTML = sucursales.map((s, index) => {
            // Verificación robusta de ID para el marcado 'checked'
            const isChecked = currentSavedId 
                ? (s.id.toString() === currentSavedId.toString() ? 'checked' : '')
                : (index === 0 ? 'checked' : '');
            
            return `
                <label class="cursor-pointer group relative block">
                    <input ${isChecked} class="peer sr-only" name="branch" type="radio" value="${s.id}" data-name="${s.nombre}" />
                    <div class="h-full bg-white dark:bg-surface-dark border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 transition-all shadow-sm peer-checked:border-primary peer-checked:bg-primary/5 dark:peer-checked:border-primary group-hover:border-secondary">
                        
                        <div class="flex items-start gap-3">
                            <div class="bg-secondary/20 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <span class="material-icons text-xl">storefront</span>
                            </div>
                            <div class="flex-grow">
                                <div class="flex justify-between items-center">
                                    <h3 class="font-bold text-gray-800 dark:text-white">${s.nombre}</h3>
                                    <span class="material-icons text-primary opacity-0 peer-checked:opacity-100 transition-opacity">check_circle</span>
                                </div>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                    <span class="material-icons text-xs">place</span>
                                    ${s.direccion || 'Dirección no disponible'}
                                </p>
                            </div>
                        </div>
                    </div>
                </label>
            `;
        }).join('');

    } catch (err) {
        console.error('Error al cargar sucursales:', err);
        container.innerHTML = '<p class="col-span-full text-center text-red-500">Error al conectar con las sucursales.</p>';
    }
}