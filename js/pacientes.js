import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION,
    crear_paginador
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

const BASE_API = "http://localhost:3000/api";
const LIMITE_POR_PAGINA = 10;

// Catálogos estáticos (sexo_biologico, migrante) para los selects del
// formulario; se cargan una sola vez al entrar a la página.
let catalogos_json = null;

let paginador = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!Usuario) {
        mostrarPopup({
            tipo: "error",
            titulo: "Sesión no válida",
            mensaje: "No fue posible recuperar los datos del usuario.",
            boton: true
        });
        window.location.href = "/index.html";
        return;
    }

    document.getElementById("titulo-bienvenida").textContent = `Gestión de pacientes`;
    document.getElementById("descripcion-bienvenida").textContent =
        `Alta, edición y consulta de pacientes registrados en el sistema.`;

    document.getElementById("form-filtros-pacientes")
        .addEventListener("submit", (evento) => {
            evento.preventDefault();
            listar_pacientes(1);
        });

    document.getElementById("boton-limpiar-filtros-pacientes")
        .addEventListener("click", () => {
            document.getElementById("filtro-busqueda-pacientes").value = "";
            listar_pacientes(1);
        });

    document.getElementById("boton-nuevo-paciente")
        .addEventListener("click", () => abrir_formulario_paciente());

    document.getElementById("cuerpo-tabla-pacientes")
        .addEventListener("click", manejar_click_tabla);

    paginador = crear_paginador((nueva_pagina) => listar_pacientes(nueva_pagina));

    const catalogos_cargados = await cargar_catalogos();
    if (!catalogos_cargados) return;

    listar_pacientes(1);
});

// ======================= CATÁLOGOS =======================

async function cargar_catalogos() {
    try {
        const response = await fetch(`${BASE_API}/data/catalogos.json`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response, "No fue posible cargar los catálogos estáticos.");
            throw new Error(mensaje);
        }

        catalogos_json = await response.json();
        return true;
    } catch (error) {
        console.error("Error al cargar catálogos:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al cargar catálogos",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar los catálogos."),
            boton: true
        });
        return false;
    }
}

function opciones_catalogo(lista, campo_valor, formatear_texto) {
    return (lista || []).map(dato => ({
        valor: dato[campo_valor],
        texto: formatear_texto(dato)
    }));
}

// ======================= BÚSQUEDA / LISTADO =======================

async function listar_pacientes(pagina = 1) {
    const busqueda = document.getElementById("filtro-busqueda-pacientes").value.trim();

    mostrarPopup({
        tipo: "carga",
        titulo: "Buscando",
        mensaje: "Buscando pacientes...",
        boton: false
    });

    const parametros = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE_POR_PAGINA)
    });
    if (busqueda) parametros.set("busqueda", busqueda);

    try {
        const response = await fetch(`${BASE_API}/pacientes/listar?${parametros.toString()}`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const datos = await response.json();
        pintar_resultados(datos);
    } catch (error) {
        console.error("Error al listar pacientes:", error);
        obtener_cuerpo_tabla().replaceChildren();
        paginador.actualizar(0, 1, LIMITE_POR_PAGINA);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al buscar",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || mensaje_por_estado(500)),
            boton: true
        });
    }
}

// ======================= RENDER DE LA TABLA =======================

function obtener_cuerpo_tabla() {
    return document.getElementById("cuerpo-tabla-pacientes");
}

function construir_fila(paciente) {
    const fila = document.createElement("tr");
    fila.dataset.idPaciente = paciente.Id_Paciente;

    const celda_expediente = document.createElement("td");
    celda_expediente.textContent = paciente.Expediente || "—";
    fila.appendChild(celda_expediente);

    const celda_nombre = document.createElement("td");
    celda_nombre.textContent = `${paciente.Nombre} ${paciente.Apellido_Paterno} ${paciente.Apellido_Materno}`.trim();
    fila.appendChild(celda_nombre);

    const celda_curp = document.createElement("td");
    celda_curp.className = "hc-celda-monoespaciada";
    celda_curp.textContent = paciente.Curp || "—";
    fila.appendChild(celda_curp);

    const celda_acciones = document.createElement("td");
    celda_acciones.className = "text-center";
    const boton_editar = document.createElement("button");
    boton_editar.type = "button";
    boton_editar.className = "btn btn-sm btn-outline-secondary btn-editar-paciente";
    boton_editar.dataset.idPaciente = paciente.Id_Paciente;
    boton_editar.setAttribute("aria-label", "Editar paciente");
    boton_editar.innerHTML = `<i class="fas fa-pen"></i>`;
    celda_acciones.appendChild(boton_editar);
    fila.appendChild(celda_acciones);

    return fila;
}

function pintar_resultados(datos) {
    const { pacientes = [], total = 0, pagina = 1, limite = LIMITE_POR_PAGINA } = datos;

    const cuerpo = obtener_cuerpo_tabla();
    cuerpo.replaceChildren();

    if (pacientes.length === 0) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Sin resultados",
            mensaje: "No se encontraron pacientes con esos filtros.",
            boton: true
        });
    } else {
        for (const paciente of pacientes) {
            cuerpo.appendChild(construir_fila(paciente));
        }
        cerrarPopup();
    }

    paginador.actualizar(total, pagina, limite);
}

function manejar_click_tabla(evento) {
    const boton = evento.target.closest(".btn-editar-paciente");
    if (!boton) return;
    abrir_formulario_paciente(boton.dataset.idPaciente);
}

// ======================= ALTA / EDICIÓN =======================

/** Sin id: formulario de alta. Con id: consulta el paciente y abre en modo edición. */
async function abrir_formulario_paciente(Id_Paciente = null) {
    let paciente = null;

    if (Id_Paciente) {
        mostrarPopup({
            tipo: "carga",
            titulo: "Cargando paciente",
            mensaje: "Obteniendo los datos del paciente...",
            boton: false
        });

        try {
            const response = await fetch(`${BASE_API}/pacientes/${Id_Paciente}`);

            if (!response.ok) {
                const mensaje = await obtener_mensaje_error(response);
                throw new Error(mensaje);
            }

            const resultado = await response.json();
            paciente = resultado.paciente;
            cerrarPopup();
        } catch (error) {
            console.error("Error al consultar paciente:", error);
            mostrarPopup({
                tipo: "error",
                titulo: "Error al consultar",
                mensaje: es_error_de_red(error)
                    ? MENSAJE_SIN_CONEXION
                    : (error.message || "No fue posible obtener los datos del paciente."),
                boton: true
            });
            return;
        }
    }

    window.modal_manager.mostrar({
        titulo: Id_Paciente ? "Editar paciente" : "Nuevo paciente",
        icono: Id_Paciente ? "fas fa-user-pen" : "fas fa-user-plus",
        texto_guardar: Id_Paciente ? "Guardar cambios" : "Registrar paciente",
        icono_guardar: "fas fa-save",
        descripcion: Id_Paciente
            ? "Modifica los datos del paciente y guarda los cambios."
            : "Captura los datos del paciente nuevo.",
        id: Id_Paciente || "",
        campos: [
            { id: "paciente-nombre", nombre: "Nombre", etiqueta: "Nombre(s)", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-apellido-paterno", nombre: "Apellido_Paterno", etiqueta: "Apellido paterno", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-apellido-materno", nombre: "Apellido_Materno", etiqueta: "Apellido materno", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-curp", nombre: "Curp", etiqueta: "CURP", tipo: "text", columna: "col-md-6 mb-3", requerido: true, maxlength: 18 },
            { id: "paciente-expediente", nombre: "Expediente", etiqueta: "Expediente", tipo: "text", columna: "col-md-6 mb-3", requerido: true, maxlength: 15 },
            { id: "paciente-fecha-nacimiento", nombre: "Fecha_Nacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", columna: "col-md-4 mb-3", requerido: true },
            { id: "paciente-entidad-nacimiento", nombre: "Entidad_Nacimiento", etiqueta: "Entidad de nacimiento", tipo: "text", columna: "col-md-4 mb-3", requerido: true, maxlength: 30 },
            { id: "paciente-pais-nacimiento", nombre: "Pais_Nacimiento", etiqueta: "País de nacimiento", tipo: "text", columna: "col-md-4 mb-3", maxlength: 30, ayuda: "Solo si nació fuera de México." },
            { id: "paciente-sexo", nombre: "Sexo", etiqueta: "Sexo", tipo: "select", columna: "col-md-4 mb-3", requerido: true,
                opciones: opciones_catalogo(catalogos_json?.sexo_biologico, "Id_Cat_Sexo_Biologico", s => `${s.Clave} | ${s.Nombre}`) },
            { id: "paciente-migrante", nombre: "Es_Migrante", etiqueta: "Migrante", tipo: "select", columna: "col-md-4 mb-3",
                opciones: opciones_catalogo(catalogos_json?.migrante, "Id_Cat_Migrante", m => `${m.Clave} | ${m.Nombre}`) },
            { id: "paciente-afromexicano", nombre: "Es_Afromexicano", etiqueta: "Se considera afromexicano", tipo: "checkbox", columna: "col-md-4 mb-3 d-flex align-items-center" },
            { id: "paciente-indigena", nombre: "Es_Indigena", etiqueta: "Se considera indígena", tipo: "checkbox", columna: "col-md-4 mb-3 d-flex align-items-center" }
        ],
        datos: paciente || {},
        onSubmit: (datos) => guardar_paciente(datos, Id_Paciente)
    });
}

async function guardar_paciente(datos, Id_Paciente) {
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

    const url = Id_Paciente
        ? `${BASE_API}/pacientes/${Id_Paciente}`
        : `${BASE_API}/pacientes/registrar`;
    const metodo = Id_Paciente ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo)
        });

        const resultado = await response.json();

        if (!response.ok || resultado.success === false) {
            throw new Error(resultado.message || mensaje_por_estado(response.status));
        }

        mostrarPopup({
            tipo: "exito",
            titulo: Id_Paciente ? "Paciente actualizado" : "Paciente registrado",
            mensaje: Id_Paciente
                ? "Los datos del paciente se actualizaron correctamente."
                : "El paciente se registró correctamente.",
            boton: true
        });

        listar_pacientes(1);
        return true;
    } catch (error) {
        console.error("Error al guardar paciente:", error);
        throw new Error(
            es_error_de_red(error) ? MENSAJE_SIN_CONEXION : (error.message || "No fue posible guardar el paciente.")
        );
    }
}