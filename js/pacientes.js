import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION,
    crear_paginador
} from "./utils.js";

import {
    cargar_catalogos_pacientes,
    obtener_paciente,
    abrir_formulario_paciente
} from "./pacientes_formulario.js";

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
        .addEventListener("click", () => abrir_formulario_paciente_pagina());

    document.getElementById("cuerpo-tabla-pacientes")
        .addEventListener("click", manejar_click_tabla);

    paginador = crear_paginador((nueva_pagina) => listar_pacientes(nueva_pagina));

    const catalogos_cargados = await cargar_catalogos(); // eslint-disable-line no-use-before-define
    if (!catalogos_cargados) return;

    listar_pacientes(1);
});

// ======================= CATÁLOGOS =======================

async function cargar_catalogos() {
    try {
        catalogos_json = await cargar_catalogos_pacientes();
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

    // Ver expediente: lleva a la ficha completa del paciente
    // (historial clínico, datos generales y notas médicas).
    const enlace_expediente = document.createElement("a");
    enlace_expediente.href = `expediente.html?id=${encodeURIComponent(paciente.Id_Paciente)}`;
    enlace_expediente.className = "btn btn-sm btn-outline-primary mr-1";
    enlace_expediente.setAttribute("aria-label", "Ver expediente");
    enlace_expediente.setAttribute("title", "Ver expediente");
    enlace_expediente.innerHTML = `<i class="fas fa-folder-open"></i>`;
    celda_acciones.appendChild(enlace_expediente);

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
    // La acción de "ver expediente" ya es un <a href>, no necesita manejador.
    // Este listener queda disponible para futuras acciones por delegación.
}

// ======================= ALTA (el detalle/edición vive en expediente.html) =======================

function abrir_formulario_paciente_pagina() {
    abrir_formulario_paciente(null, null, catalogos_json, () => listar_pacientes(1));
}