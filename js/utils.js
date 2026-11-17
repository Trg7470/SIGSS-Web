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
        if (data?.message) return data.message;
    } catch {

    }
    return mensaje_generico || mensaje_por_estado(response.status);
}

export function es_error_de_red(error) {
    return error instanceof TypeError;
}