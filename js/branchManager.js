/**
 * branchManager.js
 * Gestiona la selección de sucursal y avisa al sistema de cambios.
 */
import { supabase } from './supabaseClient.js';
import { loadNewArrivals, loadBestSellers } from './productManager.js';

export async function initBranchSystem() {
    const modal = document.getElementById('branch-modal');
    const branchId = localStorage.getItem('selectedBranchId');
    const branchName = localStorage.getItem('selectedBranchName');
    const confirmBtn = document.getElementById('confirm-branch-btn');
    const headerBranchText = document.getElementById('current-branch-name');

    if (branchName && headerBranchText) {
        headerBranchText.innerText = branchName;
    }

    await loadBranchesList();

    if (!branchId && modal) {
        modal.classList.remove('hidden');
    }

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const selectedRadio = document.querySelector('input[name="branch"]:checked');
            
            if (selectedRadio) {
                const id = selectedRadio.value;
                const nombre = selectedRadio.dataset.name;

                localStorage.setItem('selectedBranchId', id);
                localStorage.setItem('selectedBranchName', nombre);

                if (headerBranchText) {
                    headerBranchText.innerText = nombre;
                }

                if (modal) {
                    modal.classList.add('hidden');
                }

                // 🚩 LÍNEA CLAVE: Avisar al catálogo (productos.js) que debe recargarse
                window.dispatchEvent(new Event('branchChanged'));

                // Recarga productos del Home
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

        const currentSavedId = localStorage.getItem('selectedBranchId');

        container.innerHTML = sucursales.map((s, index) => {
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
                </label>`;
        }).join('');
    } catch (err) {
        console.error('Error:', err);
    }
}