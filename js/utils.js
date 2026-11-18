export function llenar_select(
    select,
    datos,
    valor,
    texto,
    placeholder = "Selecciona una opción",
    vacio = false
) {
    const elemento = typeof select === "string"
        ? document.getElementById(select)
        : select;

    if (!elemento || !Array.isArray(datos)) {
        console.error("Select inválido o datos incorrectos.");
        return false;
    }

    elemento.replaceChildren();

    const opcion_inicial = document.createElement("option");
    opcion_inicial.value = "";
    opcion_inicial.textContent = placeholder;
    opcion_inicial.disabled = !vacio;
    opcion_inicial.selected = true;

    elemento.appendChild(opcion_inicial);

    for (const dato of datos) {
        const opcion = document.createElement("option");

        opcion.value = dato[valor] ?? "";
        opcion.textContent = typeof texto === "function"
            ? texto(dato)
            : dato[texto] ?? "";

        elemento.appendChild(opcion);
    }

    return true;
}

export function verificar_nulo(id) {
    const elemento = document.getElementById(id);
    if (!elemento) return null;
    const texto = String(elemento.value ?? "").trim();
    return texto === "" ? null : texto;
}


export const MENSAJE_SIN_CONEXION =
    "No fue posible conectar con el servidor. Verifica tu conexión a internet o que el servidor esté en ejecución.";

export function mensaje_por_estado(status) {
    switch (status) {
        case 400:
            return "Los datos enviados no son válidos. Revisa la información capturada.";
        case 401:
            return "Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.";
        case 403:
            return "No tienes permisos para realizar esta acción.";
        case 404:
            return "No se encontró la información solicitada.";
        case 409:
            return "Ya existe un registro con estos datos.";
        case 500:
            return "Error interno del servidor. Intenta nuevamente más tarde.";
        case 503:
            return "El servidor no está disponible en este momento. Intenta más tarde.";
        default:
            return `No fue posible completar la solicitud (código ${status}).`;
    }
}

export async function obtener_mensaje_error(response, mensaje_generico) {
    try {
        const data = await response.json();
        // Distintos controladores usan "message", "mensaje" o "error" según
        // cuál fue el primero en escribirse; se revisan los tres.
        if (data?.message) return data.message;
        if (data?.mensaje) return data.mensaje;
        if (data?.error) return data.error;
    } catch {

    }
    return mensaje_generico || mensaje_por_estado(response.status);
}

export function es_error_de_red(error) {
    return error instanceof TypeError;
}

/**
 * Controlador de paginación reutilizable para una tabla de resultados.
 * Pensado para reusarse en cualquier página de historial que use los
 * mismos ids en su HTML:
 *   #contador-resultados, #texto-paginacion,
 *   #paginacion-historial (con sus .page-item.active .page-link) y
 *   los botones #pagina-primera, #pagina-anterior, #pagina-siguiente,
 *   #pagina-ultima.
 *
 * Llamar crear_paginador() engancha de una vez los clicks de esos 4
 * botones, así que debe llamarse cuando ese HTML ya existe en el DOM
 * (p. ej. dentro de DOMContentLoaded).
 *
 * @param {(pagina: number) => void} onCambiarPagina
 *        Se llama con la nueva página cuando el usuario da click en un
 *        botón de paginación habilitado (normalmente para volver a
 *        llamar a la función que hace la búsqueda).
 * @returns {{ actualizar: (total: number, pagina: number, limite: number) => void }}
 */
export function crear_paginador(onCambiarPagina) {
    let pagina_actual = 1;
    let total_paginas_actual = 1;

    function alternar_deshabilitado(id_elemento, deshabilitado) {
        const elemento = document.getElementById(id_elemento);
        if (!elemento) return;
        elemento.classList.toggle("disabled", deshabilitado);
        const enlace = elemento.querySelector(".page-link");
        if (enlace) enlace.tabIndex = deshabilitado ? -1 : 0;
    }

    function actualizar(total, pagina, limite) {
        document.getElementById("contador-resultados").textContent = total;

        const inicio = total === 0 ? 0 : (pagina - 1) * limite + 1;
        const fin = Math.min(pagina * limite, total);
        document.getElementById("texto-paginacion").textContent =
            `Mostrando ${inicio} a ${fin} de ${total} registros`;

        total_paginas_actual = Math.max(1, Math.ceil(total / limite));
        pagina_actual = Math.min(pagina, total_paginas_actual);

        const elemento_pagina_activa = document.querySelector("#paginacion-historial .page-item.active .page-link");
        if (elemento_pagina_activa) elemento_pagina_activa.textContent = String(pagina_actual);

        alternar_deshabilitado("pagina-primera", pagina_actual === 1);
        alternar_deshabilitado("pagina-anterior", pagina_actual === 1);
        alternar_deshabilitado("pagina-siguiente", pagina_actual === total_paginas_actual);
        alternar_deshabilitado("pagina-ultima", pagina_actual === total_paginas_actual);
    }

    const botones = {
        "pagina-primera": () => 1,
        "pagina-anterior": () => Math.max(1, pagina_actual - 1),
        "pagina-siguiente": () => Math.min(total_paginas_actual, pagina_actual + 1),
        "pagina-ultima": () => total_paginas_actual
    };

    for (const [id_elemento, calcular_pagina] of Object.entries(botones)) {
        document.getElementById(id_elemento)?.addEventListener("click", (evento) => {
            evento.preventDefault();
            if (evento.currentTarget.classList.contains("disabled")) return;
            const nueva_pagina = calcular_pagina();
            if (nueva_pagina !== pagina_actual) onCambiarPagina(nueva_pagina);
        });
    }

    return { actualizar };
}