import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

const URL_HISTORIAL = "http://localhost:3000/api/modules/consulta-externa/historial";
const URL_EXPORTAR = "http://localhost:3000/api/documentos/exportar";
const LIMITE_POR_PAGINA = 10;

let pagina_actual = 1;
let total_paginas_actual = 1;

document.addEventListener("DOMContentLoaded", () => {
    if (!Usuario) {
        mostrarPopup({
            tipo: "error",
            titulo: "Sesión no válida",
            mensaje: "No fue posible recuperar los datos del usuario.",
            boton: true
        });
        window.location.href = "../index.html";
        return;
    }

    establecer_fechas_por_defecto();
    buscar_historial(1);

    document.getElementById("form-filtros-historial")
        .addEventListener("submit", (evento) => {
            evento.preventDefault();
            buscar_historial(1);
        });

    document.getElementById("boton-limpiar-filtros")
        .addEventListener("click", () => {
            document.getElementById("filtro-busqueda").value = "";
            establecer_fechas_por_defecto();
            buscar_historial(1);
        });

    document.getElementById("cuerpo-tabla-historial")
        .addEventListener("click", manejar_click_tabla);

    configurar_paginacion();
});

// ======================= FECHAS =======================

function fecha_hoy_como_texto() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function establecer_fechas_por_defecto() {
    // Por defecto se busca "hoy": fecha inicial = fecha final. Un rango de
    // varios días es simplemente que el usuario cambie una de las dos.
    const hoy = fecha_hoy_como_texto();
    document.getElementById("filtro-fecha-inicial").value = hoy;
    document.getElementById("filtro-fecha-final").value = hoy;
}

function formatear_fecha_para_mostrar(valor_fecha) {
    if (!valor_fecha) return "—";
    // El valor puede llegar como 'YYYY-MM-DD' o como ISO completo
    // ('YYYY-MM-DDTHH:mm:ss.sssZ'); solo nos interesa la parte de la fecha.
    const solo_fecha = String(valor_fecha).slice(0, 10);
    const [anio, mes, dia] = solo_fecha.split("-");
    if (!anio || !mes || !dia) return solo_fecha;
    return `${dia}/${mes}/${anio}`;
}

// ======================= BÚSQUEDA =======================

async function buscar_historial(pagina = 1) {
    const fecha_inicial = document.getElementById("filtro-fecha-inicial").value;
    const fecha_final = document.getElementById("filtro-fecha-final").value;
    const busqueda = document.getElementById("filtro-busqueda").value.trim();

    if (!fecha_inicial || !fecha_final) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Fechas incompletas",
            mensaje: "Indica la fecha inicial y la fecha final para buscar.",
            boton: true
        });
        return;
    }

    if (fecha_inicial > fecha_final) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Rango de fechas inválido",
            mensaje: "La fecha inicial no puede ser mayor que la fecha final.",
            boton: true
        });
        return;
    }

    mostrar_estado_cargando();

    const parametros = new URLSearchParams({
        fecha_inicial,
        fecha_final,
        pagina: String(pagina),
        limite: String(LIMITE_POR_PAGINA)
    });
    if (busqueda) parametros.set("busqueda", busqueda);

    try {
        const response = await fetch(`${URL_HISTORIAL}?${parametros.toString()}`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const datos = await response.json();
        pagina_actual = datos.pagina || pagina;
        pintar_resultados(datos);
    } catch (error) {
        console.error("Error al buscar el historial de consultas:", error);
        mostrar_mensaje_tabla("fa-triangle-exclamation", "No fue posible obtener el historial de consultas.");
        actualizar_contador_y_paginacion(0, 1, LIMITE_POR_PAGINA);
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
    return document.getElementById("cuerpo-tabla-historial");
}

function mostrar_estado_cargando() {
    const cuerpo = obtener_cuerpo_tabla();
    cuerpo.replaceChildren();

    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 6;

    const contenedor = document.createElement("div");
    contenedor.className = "hc-cargando";
    contenedor.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><br>Buscando consultas...`;

    celda.appendChild(contenedor);
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
}

function mostrar_mensaje_tabla(icono, texto) {
    const cuerpo = obtener_cuerpo_tabla();
    cuerpo.replaceChildren();

    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 6;

    const contenedor = document.createElement("div");
    contenedor.className = "hc-sin-resultados";
    contenedor.innerHTML = `<i class="fa-solid ${icono}"></i>`;
    contenedor.append(texto);

    celda.appendChild(contenedor);
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
}

function iniciales_de_nombre(nombre) {
    const palabras = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    const primera = palabras[0]?.[0] || "";
    const segunda = palabras[1]?.[0] || "";
    return (primera + segunda).toUpperCase() || "--";
}

function construir_boton_exportar(id_consulta, tipo_salida, texto, etiqueta) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-sm btn-outline-secondary btn-exportar";
    boton.dataset.idConsulta = id_consulta;
    boton.dataset.tipoSalida = tipo_salida;
    boton.setAttribute("aria-label", etiqueta);

    const texto_boton = document.createElement("span");
    texto_boton.className = "hc-texto-boton";
    texto_boton.textContent = texto;
    boton.appendChild(texto_boton);

    return boton;
}

function construir_fila(registro) {
    const fila = document.createElement("tr");
    fila.dataset.idConsulta = registro.id_consulta;

    const celda_folio = document.createElement("td");
    celda_folio.className = "hc-celda-monoespaciada";
    celda_folio.textContent = registro.folio_receta || "—";
    fila.appendChild(celda_folio);

    const celda_expediente = document.createElement("td");
    celda_expediente.textContent = registro.expediente || "—";
    fila.appendChild(celda_expediente);

    const celda_fecha = document.createElement("td");
    celda_fecha.textContent = formatear_fecha_para_mostrar(registro.fecha);
    fila.appendChild(celda_fecha);

    const celda_paciente = document.createElement("td");
    celda_paciente.className = "hc-celda-paciente";
    const avatar = document.createElement("span");
    avatar.className = "hc-avatar";
    avatar.textContent = iniciales_de_nombre(registro.nombre);
    const nombre_paciente = document.createElement("span");
    nombre_paciente.className = "hc-nombre-paciente";
    nombre_paciente.textContent = registro.nombre || "—";
    celda_paciente.append(avatar, nombre_paciente);
    fila.appendChild(celda_paciente);

    const celda_curp = document.createElement("td");
    celda_curp.className = "hc-celda-monoespaciada";
    celda_curp.textContent = registro.curp || "—";
    fila.appendChild(celda_curp);

    const celda_acciones = document.createElement("td");
    celda_acciones.className = "text-center";
    const contenedor_acciones = document.createElement("span");
    contenedor_acciones.className = "hc-acciones-exportar";
    contenedor_acciones.append(
        construir_boton_exportar(registro.id_consulta, "xlsx", "Excel", "Exportar a Excel"),
        construir_boton_exportar(registro.id_consulta, "pdf", "PDF", "Exportar a PDF")
    );
    celda_acciones.appendChild(contenedor_acciones);
    fila.appendChild(celda_acciones);

    return fila;
}

function pintar_resultados(datos) {
    const { registros = [], total = 0, pagina = 1, limite = LIMITE_POR_PAGINA } = datos;

    const cuerpo = obtener_cuerpo_tabla();
    cuerpo.replaceChildren();

    if (registros.length === 0) {
        mostrar_mensaje_tabla("fa-folder-open", "No se encontraron consultas con esos filtros.");
    } else {
        for (const registro of registros) {
            cuerpo.appendChild(construir_fila(registro));
        }
    }

    actualizar_contador_y_paginacion(total, pagina, limite);
}

// ======================= CONTADOR Y PAGINACIÓN =======================

function actualizar_contador_y_paginacion(total, pagina, limite) {
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

function alternar_deshabilitado(id_elemento, deshabilitado) {
    const elemento = document.getElementById(id_elemento);
    if (!elemento) return;
    elemento.classList.toggle("disabled", deshabilitado);
    const enlace = elemento.querySelector(".page-link");
    if (enlace) enlace.tabIndex = deshabilitado ? -1 : 0;
}

function configurar_paginacion() {
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
            if (nueva_pagina !== pagina_actual) buscar_historial(nueva_pagina);
        });
    }
}

// ======================= EXPORTAR (EXCEL / PDF) =======================
//
// Se usa fetch (en vez de abrir la URL directo) para poder mostrar el
// popup de "generando documento" mientras el servidor arma el XLSX/PDF
// (la conversión a PDF con LibreOffice puede tardar varios segundos) y
// avisar con un popup de éxito o error según cómo termine.

function manejar_click_tabla(evento) {
    const boton = evento.target.closest(".btn-exportar");
    if (!boton) return;
    exportar_consulta(boton);
}

async function exportar_consulta(boton) {
    const { idConsulta: id_consulta, tipoSalida: tipo_salida } = boton.dataset;
    if (!id_consulta || !tipo_salida) return;

    const etiqueta_formato = tipo_salida === "pdf" ? "PDF" : "Excel";
    boton.disabled = true;

    mostrarPopup({
        tipo: "carga",
        titulo: "Generando documento",
        mensaje: `Preparando el archivo ${etiqueta_formato}. Esto puede tardar unos segundos...`,
        boton: false
    });

    const parametros = new URLSearchParams({
        formato: "consulta-externa",
        tipo_salida,
        id_consulta
    });

    try {
        const response = await fetch(`${URL_EXPORTAR}?${parametros.toString()}`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const blob = await response.blob();
        const nombre_archivo =
            extraer_nombre_archivo(response.headers.get("Content-Disposition")) ||
            `consulta-externa-${id_consulta}.${tipo_salida === "pdf" ? "pdf" : "xlsx"}`;

        descargar_blob(blob, nombre_archivo);

        mostrarPopup({
            tipo: "exito",
            titulo: "Documento generado",
            mensaje: `El archivo ${etiqueta_formato} se descargó correctamente.`,
            boton: true
        });
    } catch (error) {
        console.error("Error al exportar la consulta:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al exportar",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || mensaje_por_estado(500)),
            boton: true
        });
    } finally {
        boton.disabled = false;
    }
}

/** Lee el nombre de archivo de un encabezado Content-Disposition. */
function extraer_nombre_archivo(encabezado_disposicion) {
    if (!encabezado_disposicion) return null;
    const coincidencia = /filename="?([^";]+)"?/.exec(encabezado_disposicion);
    return coincidencia ? coincidencia[1] : null;
}

/** Dispara la descarga de un Blob con el nombre indicado. */
function descargar_blob(blob, nombre_archivo) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre_archivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}