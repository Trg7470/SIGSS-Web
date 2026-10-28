let modalPopup = null;
let elementoConFocoAnterior = null;

const ICONOS = {
    carga: `<i class="fas fa-spinner fa-spin"></i>`,
    exito: `<i class="fas fa-check-circle"></i>`,
    error: `<i class="fas fa-times-circle"></i>`,
    advertencia: `<i class="fas fa-exclamation-triangle"></i>`,
    informacion: `<i class="fas fa-info-circle"></i>`
};

function inicializarPopup() {
    modalPopup = document.getElementById("modalPopup");
    if (!modalPopup) {
        console.warn("No se encontró el elemento #modalPopup.");
        return;
    }
    if (modalPopup.dataset.inicializado === "true") return;
    modalPopup.dataset.inicializado = "true";
    modalPopup.addEventListener("click", function(event) {
        if (event.target === modalPopup) cerrarPopup();
    });
}

document.addEventListener("layoutCargado", function() {
    inicializarPopup();
});

function mostrarPopup({ titulo = "Procesando...", mensaje = "Espere un momento...", tipo = "carga", boton = false, redireccion = null, onConfirmar = null } = {}) {
    if (!modalPopup) inicializarPopup();
    if (!modalPopup) {
        console.warn("No se encontró el elemento #modalPopup.");
        return;
    }
    const tituloElemento = document.getElementById("modal-titulo");
    const mensajeElemento = document.getElementById("modal-mensaje");
    const iconoElemento = document.getElementById("modal-icono");
    const btn = document.getElementById("modal-boton");
    const botonCerrar = document.getElementById("popup-cerrar");
    if (!tituloElemento || !mensajeElemento || !iconoElemento || !btn) {
        console.error("Faltan elementos HTML requeridos para mostrar el popup.");
        return;
    }
    if (!modalPopup.classList.contains("show")) elementoConFocoAnterior = document.activeElement;
    tituloElemento.textContent = titulo;
    mensajeElemento.textContent = mensaje;
    const tipoValido = Object.prototype.hasOwnProperty.call(ICONOS, tipo) ? tipo : "carga";
    iconoElemento.innerHTML = ICONOS[tipoValido];
    modalPopup.classList.remove("tipo-carga", "tipo-exito", "tipo-error", "tipo-advertencia", "tipo-informacion");
    modalPopup.classList.add(`tipo-${tipoValido}`);
    btn.onclick = null;
    if (boton) {
        btn.classList.add("mostrar");
        btn.onclick = function() {
            btn.onclick = null;
            cerrarPopup();
            if (redireccion) {
                window.location.href = redireccion;
                return;
            }
            if (typeof onConfirmar === "function") {
                try {
                    const resultado = onConfirmar();
                    if (resultado && typeof resultado.catch === "function") {
                        resultado.catch((error) => console.error("Error en la confirmación del popup:", error));
                    }
                } catch (error) {
                    console.error("Error en la confirmación del popup:", error);
                }
            }
        };
    } else {
        btn.classList.remove("mostrar");
    }
    modalPopup.classList.add("show");
    if (botonCerrar) botonCerrar.focus();
    else if (boton) btn.focus();
}

function cerrarPopup() {
    if (!modalPopup || !modalPopup.classList.contains("show")) return;
    modalPopup.classList.remove("show");
    if (elementoConFocoAnterior instanceof HTMLElement && elementoConFocoAnterior.isConnected) elementoConFocoAnterior.focus();
    elementoConFocoAnterior = null;
}

document.addEventListener("keydown", function(event) {
    if (!modalPopup || !modalPopup.classList.contains("show")) return;
    if (event.key === "Escape") {
        cerrarPopup();
        return;
    }
    if (event.key !== "Tab") return;
    const elementosEnfocables = Array.from(modalPopup.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")).filter((elemento) => elemento.getClientRects().length > 0);
    if (elementosEnfocables.length === 0) {
        event.preventDefault();
        return;
    }
    const primero = elementosEnfocables[0];
    const ultimo = elementosEnfocables[elementosEnfocables.length - 1];
    if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
    }
});