// ==================================================
// Formulario de paciente (alta / edición) — lógica
// compartida entre pacientes.js (listado) y
// expediente.js (ficha del paciente), para no duplicar
// catálogos, endpoints ni la definición del formulario.
// ==================================================

import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

const BASE_API = "http://localhost:3000/api";

function opciones_catalogo(lista, campo_valor, formatear_texto) {
    return (lista || []).map(dato => ({
        valor: dato[campo_valor],
        texto: formatear_texto(dato)
    }));
}

/** Etiqueta legible de un valor de catálogo (p. ej. Sexo -> "F | Femenino"). */
export function etiqueta_catalogo(lista, campo_id, valor) {
    const encontrado = (lista || []).find(item => item[campo_id] === valor);
    return encontrado ? encontrado.Nombre : "—";
}

export async function cargar_catalogos_pacientes() {
    const response = await fetch(`${BASE_API}/data/catalogos.json`);

    if (!response.ok) {
        const mensaje = await obtener_mensaje_error(response, "No fue posible cargar los catálogos estáticos.");
        throw new Error(mensaje);
    }

    return response.json();
}

export async function obtener_paciente(id_paciente) {
    const response = await fetch(`${BASE_API}/pacientes/${id_paciente}`);

    if (!response.ok) {
        const mensaje = await obtener_mensaje_error(response);
        throw new Error(mensaje);
    }

    const resultado = await response.json();
    return resultado.paciente;
}

async function guardar_paciente(datos, id_paciente) {
    const cuerpo = {
        Nombre: datos.Nombre?.trim(),
        Apellido_Paterno: datos.Apellido_Paterno?.trim(),
        Apellido_Materno: datos.Apellido_Materno?.trim(),
        Fecha_Nacimiento: datos.Fecha_Nacimiento || null,
        Entidad_Nacimiento: datos.Entidad_Nacimiento?.trim(),
        Pais_Nacimiento: datos.Pais_Nacimiento?.trim() || null,
        Curp: datos.Curp?.trim().toUpperCase(),
        Sexo: datos.Sexo ? Number(datos.Sexo) : null,
        Es_Migrante: datos.Es_Migrante ? Number(datos.Es_Migrante) : null,
        Es_Afromexicano: Boolean(datos.Es_Afromexicano),
        Es_Indigena: Boolean(datos.Es_Indigena),
        Expediente: datos.Expediente?.trim()
    };

    const url = id_paciente
        ? `${BASE_API}/pacientes/${id_paciente}`
        : `${BASE_API}/pacientes/registrar`;
    const metodo = id_paciente ? "PUT" : "POST";

    const response = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
    });

    const resultado = await response.json();

    if (!response.ok || resultado.success === false) {
        throw new Error(resultado.message || mensaje_por_estado(response.status));
    }

    return resultado;
}

/**
 * Abre el modal de alta/edición de paciente (window.modal_manager).
 * - id_paciente: null para alta, Id_Paciente para edición.
 * - paciente: datos actuales (solo aplica en edición).
 * - catalogos_json: catálogos ya cargados (sexo_biologico, migrante).
 * - al_guardar(resultado): callback opcional tras guardar con éxito,
 *   para que cada pantalla decida cómo refrescarse (listar_pacientes,
 *   recargar el expediente, etc.).
 */
export function abrir_formulario_paciente(id_paciente, paciente, catalogos_json, al_guardar) {
    window.modal_manager.mostrar({
        titulo: id_paciente ? "Editar paciente" : "Nuevo paciente",
        icono: id_paciente ? "fas fa-user-pen" : "fas fa-user-plus",
        texto_guardar: id_paciente ? "Guardar cambios" : "Registrar paciente",
        icono_guardar: "fas fa-save",
        descripcion: id_paciente
            ? "Modifica los datos del paciente y guarda los cambios."
            : "Captura los datos del paciente nuevo.",
        id: id_paciente || "",
        campos: [
            { id: "paciente-nombre", nombre: "Nombre", etiqueta: "Nombre(s)", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-apellido-paterno", nombre: "Apellido_Paterno", etiqueta: "Apellido paterno", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-apellido-materno", nombre: "Apellido_Materno", etiqueta: "Apellido materno", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-curp", nombre: "Curp", etiqueta: "CURP", tipo: "text", columna: "col-md-6 mb-3", requerido: true, maxlength: 18 },
            { id: "paciente-expediente", nombre: "Expediente", etiqueta: "Expediente", tipo: "text", columna: "col-md-6 mb-3", requerido: true, maxlength: 15 },
            { id: "paciente-fecha-nacimiento", nombre: "Fecha_Nacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", columna: "col-md-4 mb-3", requerido: true },
            { id: "paciente-entidad-nacimiento", nombre: "Entidad_Nacimiento", etiqueta: "Entidad de nacimiento", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-pais-nacimiento", nombre: "Pais_Nacimiento", etiqueta: "País de nacimiento", tipo: "text", columna: "col-md-4 mb-3", maxlength: 30, ayuda: "Solo si nació fuera de México." },
            {
                id: "paciente-sexo", nombre: "Sexo", etiqueta: "Sexo", tipo: "select", columna: "col-md-4 mb-3", requerido: true,
                opciones: opciones_catalogo(catalogos_json?.sexo_biologico, "Id_Cat_Sexo_Biologico", s => `${s.Clave} | ${s.Nombre}`)
            },
            {
                id: "paciente-migrante", nombre: "Es_Migrante", etiqueta: "Migrante", tipo: "select", columna: "col-md-4 mb-3",
                opciones: opciones_catalogo(catalogos_json?.migrante, "Id_Cat_Migrante", m => `${m.Clave} | ${m.Nombre}`)
            },
            { id: "paciente-afromexicano", nombre: "Es_Afromexicano", etiqueta: "Se considera afromexicano", tipo: "checkbox", columna: "col-md-4 mb-3 d-flex align-items-center" },
            { id: "paciente-indigena", nombre: "Es_Indigena", etiqueta: "Se considera indígena", tipo: "checkbox", columna: "col-md-4 mb-3 d-flex align-items-center" }
        ],
        datos: paciente || {},
        onSubmit: async (datos) => {
            try {
                const resultado = await guardar_paciente(datos, id_paciente);

                mostrarPopup({
                    tipo: "exito",
                    titulo: id_paciente ? "Paciente actualizado" : "Paciente registrado",
                    mensaje: id_paciente
                        ? "Los datos del paciente se actualizaron correctamente."
                        : "El paciente se registró correctamente.",
                    boton: true
                });

                if (al_guardar) await al_guardar(resultado);
                return true;
            } catch (error) {
                console.error("Error al guardar paciente:", error);
                throw new Error(
                    es_error_de_red(error) ? MENSAJE_SIN_CONEXION : (error.message || "No fue posible guardar el paciente.")
                );
            }
        }
    });
}