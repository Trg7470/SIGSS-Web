
let modalPopup = null;
let elementoConFocoAnterior = null;
let resolverConfirmacion = null;

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

    document.getElementById("popup-cerrar")
        ?.addEventListener("click", cerrarPopup);

    document.getElementById("modal-cancelar")
        ?.addEventListener("click", cerrarPopup);

    document.getElementById("modal-confirmar")
        ?.addEventListener("click", confirmarPopup);

    modalPopup.addEventListener("click", function(event) {
        if (event.target === modalPopup) cerrarPopup();
    });
}

document.addEventListener("layoutCargado", inicializarPopup);


// Resolver una confirmación pendiente
function resolverPopup(valor) {
    if (!resolverConfirmacion) return;

    const resolver = resolverConfirmacion;
    resolverConfirmacion = null;

    resolver(valor);
}


// Mostrar popup global
function mostrarPopup({
    titulo = "Procesando...",
    mensaje = "Espere un momento...",
    tipo = "carga",
    boton = false,
    redireccion = null,
    onConfirmar = null,
    confirmar = false,
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar"
} = {}) {

    if (!modalPopup) inicializarPopup();

    if (!modalPopup) return Promise.resolve(false);

    const tituloElemento = document.getElementById("modal-titulo");
    const mensajeElemento = document.getElementById("modal-mensaje");
    const iconoElemento = document.getElementById("modal-icono");
    const btn = document.getElementById("modal-boton");
    const botonesConfirmacion = document.getElementById("modal-botones-confirmacion");
    const btnConfirmar = document.getElementById("modal-confirmar");
    const btnCancelar = document.getElementById("modal-cancelar");

    if (!tituloElemento || !mensajeElemento || !iconoElemento || !btn ||
        !botonesConfirmacion || !btnConfirmar || !btnCancelar) {
        console.error("Faltan elementos HTML requeridos para mostrar el popup.");
        return Promise.resolve(false);
    }

    // Resolver cualquier confirmación anterior como cancelada
    resolverPopup(false);

    if (!modalPopup.classList.contains("show")) {
        elementoConFocoAnterior = document.activeElement;
    }

    tituloElemento.textContent = titulo;
    mensajeElemento.textContent = mensaje;

    const tipoValido = Object.prototype.hasOwnProperty.call(ICONOS, tipo)
        ? tipo
        : "carga";

    iconoElemento.innerHTML = ICONOS[tipoValido];

    modalPopup.classList.remove(
        "tipo-carga",
        "tipo-exito",
        "tipo-error",
        "tipo-advertencia",
        "tipo-informacion"
    );

    modalPopup.classList.add(`tipo-${tipoValido}`);

    // Restablecer botones
    btn.onclick = null;
    btn.textContent = "Aceptar";

    botonesConfirmacion.classList.remove("mostrar");
    btn.classList.remove("mostrar");

    // Modo confirmación
    if (confirmar) {

        btnConfirmar.textContent = textoConfirmar;
        btnCancelar.textContent = textoCancelar;

        botonesConfirmacion.classList.add("mostrar");

        modalPopup.classList.add("show");
        btnCancelar.focus();

        return new Promise(resolve => {
            resolverConfirmacion = resolve;
        });
    }

    // Modo normal
    if (boton) {

        btn.classList.add("mostrar");

        btn.onclick = function() {
            cerrarPopup();

            if (redireccion) {
                window.location.href = redireccion;
                return;
            }

            if (typeof onConfirmar === "function") {
                try {
                    const resultado = onConfirmar();

                    if (resultado && typeof resultado.catch === "function") {
                        resultado.catch(error =>
                            console.error("Error en la confirmación:", error)
                        );
                    }
                } catch (error) {
                    console.error("Error en la confirmación:", error);
                }
            }
        };
    }

    modalPopup.classList.add("show");

    document.getElementById("popup-cerrar")?.focus();

    return Promise.resolve(false);
}


// Confirmar operación
function confirmarPopup() {
    if (!modalPopup || !modalPopup.classList.contains("show")) return;

    resolverPopup(true);
    cerrarPopup();
}


// Cerrar popup
function cerrarPopup() {
    if (!modalPopup || !modalPopup.classList.contains("show")) return;

    // Si era una confirmación, devolver false
    resolverPopup(false);

    modalPopup.classList.remove("show");

    document.getElementById("modal-botones-confirmacion")
        ?.classList.remove("mostrar");

    document.getElementById("modal-boton")
        ?.classList.remove("mostrar");

    if (
        elementoConFocoAnterior instanceof HTMLElement &&
        elementoConFocoAnterior.isConnected
    ) {
        elementoConFocoAnterior.focus();
    }

    elementoConFocoAnterior = null;
}


// Control de teclado
document.addEventListener("keydown", function(event) {

    if (!modalPopup || !modalPopup.classList.contains("show")) return;

    if (event.key === "Escape") {
        cerrarPopup();
        return;
    }

    if (event.key !== "Tab") return;

    const elementosEnfocables = Array.from(
        modalPopup.querySelectorAll(
            "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
    ).filter(elemento => elemento.getClientRects().length > 0);

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
