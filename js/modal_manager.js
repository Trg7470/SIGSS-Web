/* ========================================================= ADMINISTRADOR DE MODALES GENÉRICO - SIGSS | Dependencias: jQuery + Bootstrap 4 ========================================================= */

window.modal_manager = {
    configuracion: {},
    alEnviar: null,

    abrir(modal_id = 'modal_generico') {
        const modal = $(`#${modal_id}`);
        if (!modal.length) {
            console.error(`Modal no encontrado: ${modal_id}`);
            return;
        }
        modal.modal('show');
    },

    cerrar(modal_id = 'modal_generico') {
        const modal = $(`#${modal_id}`);
        if (!modal.length) {
            console.error(`Modal no encontrado: ${modal_id}`);
            return;
        }
        modal.modal('hide');
    },

    limpiar_formulario(form_id = 'form_modal_generico') {
        const formulario = document.getElementById(form_id);
        if (formulario) {
            formulario.reset();
            formulario.classList.remove('was-validated');
        }
    },

    abrir_con_formulario(modal_id, form_id) {
        this.limpiar_formulario(form_id);
        this.abrir(modal_id);
    },

    cerrar_con_formulario(modal_id, form_id) {
        this.cerrar(modal_id);
        this.limpiar_formulario(form_id);
    },

    establecer_valor(elemento_id, valor) {
        const elemento = document.getElementById(elemento_id);
        if (elemento) elemento.value = valor ?? '';
    },

    obtener_valor(elemento_id) {
        const elemento = document.getElementById(elemento_id);
        if (!elemento) return '';
        return typeof elemento.value === 'string' ? elemento.value.trim() : elemento.value;
    },

    obtener_checkbox(elemento_id) {
        const elemento = document.getElementById(elemento_id);
        return elemento ? elemento.checked : false;
    },

    establecer_checkbox(elemento_id, valor) {
        const elemento = document.getElementById(elemento_id);
        if (elemento) elemento.checked = Boolean(valor);
    },

    mostrar(config = {}) {
        const titulo = document.getElementById('modal_generico_titulo_texto');
        const icono = document.getElementById('modal_generico_icono');
        const descripcion = document.getElementById('modal_generico_descripcion');
        const idRegistro = document.getElementById('modal_generico_id');
        const botonTexto = document.getElementById('modal_generico_guardar_texto');
        const botonIcono = document.getElementById('modal_generico_guardar_icono');
        const dialogo = document.getElementById('modal_generico_dialogo');
        const formulario = document.getElementById('form_modal_generico');
        const contenedor = document.getElementById('modal_generico_campos');

        if (!titulo || !icono || !descripcion || !idRegistro || !botonTexto || !botonIcono || !dialogo || !formulario || !contenedor) {
            console.error('Faltan elementos HTML requeridos para mostrar el modal genérico.');
            return;
        }

        this.configuracion = config;
        this.alEnviar = typeof config.onSubmit === 'function' ? config.onSubmit : null;

        this.limpiar_formulario();
        this.limpiar_campos();
        this.mostrar_error('');
        this.desbloquear_boton('modal_generico_guardar');

        titulo.textContent = config.titulo || 'Formulario';
        icono.className = `${config.icono || 'fas fa-edit'} text-primary mr-2`;
        descripcion.textContent = config.descripcion || '';
        descripcion.classList.toggle('d-none', !config.descripcion);
        idRegistro.value = config.id ?? '';

        dialogo.classList.remove('modal-sm', 'modal-lg', 'modal-xl');
        dialogo.classList.add(['sm', 'lg', 'xl'].includes(config.tamano) ? `modal-${config.tamano}` : 'modal-lg');

        botonTexto.textContent = config.texto_guardar || 'Guardar';
        botonIcono.className = `${config.icono_guardar || 'fas fa-save'} mr-1`;

        this.generar_campos(config.campos || []);
        this.cargar_datos(config.datos || {});
        formulario.noValidate = false;
        this.abrir('modal_generico');
    },

    generar_campos(campos = []) {
        const contenedor = document.getElementById('modal_generico_campos');
        if (!contenedor) {
            console.error('No se encontró el contenedor #modal_generico_campos.');
            return;
        }

        campos.forEach((campo) => {
            const tipo = campo.tipo || 'text';
            if (!campo.id || !campo.nombre) {
                console.warn('Campo omitido: requiere id y nombre.', campo);
                return;
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(campo.id)) {
                console.warn('ID de campo inválido:', campo.id);
                return;
            }

            const columna = document.createElement('div');
            columna.className = campo.columna || 'col-md-6 mb-3';

            if (tipo === 'hidden') {
                const oculto = document.createElement('input');
                oculto.type = 'hidden';
                oculto.id = campo.id;
                oculto.name = campo.nombre;
                columna.appendChild(oculto);
                contenedor.appendChild(columna);
                return;
            }

            const etiqueta = document.createElement('label');
            etiqueta.htmlFor = campo.id;
            etiqueta.textContent = campo.etiqueta || campo.nombre;

            if (campo.requerido) {
                const asterisco = document.createElement('span');
                asterisco.className = 'campo-requerido';
                asterisco.textContent = ' *';
                etiqueta.appendChild(asterisco);
            }

            let control;

            if (tipo === 'textarea') {
                control = document.createElement('textarea');
                control.rows = campo.filas || 3;
            } else if (tipo === 'select') {
                control = document.createElement('select');
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = campo.placeholder || 'Selecciona una opción';
                control.appendChild(placeholder);

                (campo.opciones || []).forEach((opcion) => {
                    if (!opcion || typeof opcion !== 'object' || opcion.valor === undefined) return;
                    const elemento = document.createElement('option');
                    elemento.value = opcion.valor;
                    elemento.textContent = opcion.texto ?? opcion.valor;
                    control.appendChild(elemento);
                });
            } else if (tipo === 'checkbox') {
                control = document.createElement('input');
                control.type = 'checkbox';
            } else {
                const tiposPermitidos = ['text', 'number', 'email', 'date', 'tel', 'password', 'url'];
                control = document.createElement('input');
                control.type = tiposPermitidos.includes(tipo) ? tipo : 'text';
            }

            control.id = campo.id;
            control.name = campo.nombre;

            if (tipo === 'checkbox') {
                control.className = 'form-check-input';
                etiqueta.className = 'form-check-label';
                columna.classList.add('form-check');
                columna.appendChild(control);
                columna.appendChild(etiqueta);
            } else {
                control.className = tipo === 'select' ? 'form-control' : 'form-control';
                if (campo.placeholder && tipo !== 'select') control.placeholder = campo.placeholder;
                columna.appendChild(etiqueta);
                columna.appendChild(control);
            }

            if (campo.requerido) control.required = true;
            if (campo.min !== undefined) control.min = campo.min;
            if (campo.max !== undefined) control.max = campo.max;
            if (campo.maxlength !== undefined) control.maxLength = campo.maxlength;
            if (campo.paso !== undefined && tipo === 'number') control.step = campo.paso;
            if (campo.deshabilitado) control.disabled = true;

            if (campo.ayuda) {
                const ayuda = document.createElement('small');
                ayuda.className = 'form-text text-muted';
                ayuda.textContent = campo.ayuda;
                columna.appendChild(ayuda);
            }

            contenedor.appendChild(columna);
        });
    },

    limpiar_campos() {
        const contenedor = document.getElementById('modal_generico_campos');
        if (contenedor) contenedor.replaceChildren();
    },

    cargar_datos(datos = {}) {
        const campos = this.configuracion.campos || [];
        campos.forEach((campo) => {
            if (!campo.id) return;
            const elemento = document.getElementById(campo.id);
            if (!elemento || !(campo.nombre in datos)) return;
            const valor = datos[campo.nombre];
            if (elemento.type === 'checkbox') {
                elemento.checked = valor === true || valor === 1 || valor === '1';
            } else {
                elemento.value = valor ?? '';
            }
        });
    },

    obtener_datos() {
        const formulario = document.getElementById('form_modal_generico');
        if (!formulario) {
            throw new Error('No se encontró el formulario genérico.');
        }

        const datos = {};
        new FormData(formulario).forEach((valor, nombre) => {
            if (nombre in datos) {
                if (!Array.isArray(datos[nombre])) datos[nombre] = [datos[nombre]];
                datos[nombre].push(valor);
            } else {
                datos[nombre] = valor;
            }
        });

        formulario.querySelectorAll('input[type="checkbox"][name]').forEach((elemento) => {
            datos[elemento.name] = elemento.checked;
        });

        datos.id = this.obtener_valor('modal_generico_id');
        return datos;
    },

    mostrar_error(mensaje) {
        const alerta = document.getElementById('modal_generico_error');
        if (!alerta) return;
        alerta.textContent = mensaje || '';
        alerta.classList.toggle('d-none', !mensaje);
    },

    bloquear_boton(btn_id, texto = 'Procesando...') {
        const boton = document.getElementById(btn_id);
        if (!boton) return;
        if (!boton.dataset.textoOriginal) boton.dataset.textoOriginal = boton.innerHTML;
        boton.disabled = true;
        const icono = document.createElement('i');
        icono.className = 'fas fa-spinner fa-spin mr-1';
        boton.replaceChildren(icono, document.createTextNode(texto));
    },

    desbloquear_boton(btn_id) {
        const boton = document.getElementById(btn_id);
        if (!boton) return;
        boton.disabled = false;
        if (boton.dataset.textoOriginal) {
            boton.innerHTML = boton.dataset.textoOriginal;
            delete boton.dataset.textoOriginal;
        }
    }
};


// =========================================================
// EVENTO DE ENVÍO DEL FORMULARIO GENÉRICO
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('form_modal_generico');

    if (!formulario) {
        console.error('No se encontró el formulario #form_modal_generico.');
        return;
    }

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const manager = window.modal_manager;
        manager.mostrar_error('');

        if (!formulario.checkValidity()) {
            formulario.classList.add('was-validated');
            formulario.reportValidity();
            return;
        }

        if (typeof manager.alEnviar !== 'function') {
            manager.mostrar_error('No se ha configurado la operación del formulario.');
            return;
        }

        const botonId = 'modal_generico_guardar';
        manager.bloquear_boton(botonId);

        try {
            const datos = manager.obtener_datos();
            const resultado = await manager.alEnviar(datos);

            // Si onSubmit devuelve false, conservar abierto el modal.
            if (resultado === false) return;

            manager.cerrar('modal_generico');
        } catch (error) {
            console.error('Error al procesar el formulario:', error);
            manager.mostrar_error(error.message || 'Ocurrió un error al procesar la operación.');
        } finally {
            manager.desbloquear_boton(botonId);
        }
    });

    $('#modal_generico').on('hidden.bs.modal', () => {
        formulario.classList.remove('was-validated');
        window.modal_manager.mostrar_error('');
    });
});