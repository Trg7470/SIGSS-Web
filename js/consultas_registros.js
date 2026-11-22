import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION,
    crear_paginador
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

const BASE_API = "http://localhost:3000/api";
const URL_EXPORTAR = `${BASE_API}/documentos/exportar`;
const LIMITE_POR_PAGINA = 10;

/** Arma la URL del historial para el módulo que se esté consultando. */
function url_historial(modulo) {
    return `${BASE_API}/modules/${modulo}/historial`;
}

// Controlador de paginación (ver crear_paginador en utils.js); se crea
// en DOMContentLoaded, una vez que el HTML de los botones ya existe.
let paginador = null;

// Módulo que esta página consulta (p. ej. "consulta-externa",
// "planificacion-familiar"). Se toma del atributo data-modulo del botón
// de búsqueda, así que cada página solo tiene que declararlo ahí:
//   <button id="boton-buscar-historial" data-modulo="consulta-externa" ...>
// El resto del script es el mismo para cualquier módulo.
let modulo_actual = null;

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

    modulo_actual = document.getElementById("boton-buscar-historial")?.dataset.modulo || null;
    if (!modulo_actual) {
        console.error(
            "Falta el atributo data-modulo en #boton-buscar-historial; " +
            "no se puede determinar qué historial consultar."
        );
    }
    document.getElementById("form-filtros-historial")
        .addEventListener("submit", (evento) => {
            evento.preventDefault();
            buscar_historial(modulo_actual, 1);
        });

    document.getElementById("boton-limpiar-filtros")
        .addEventListener("click", () => {
            document.getElementById("filtro-busqueda").value = "";
            buscar_historial(modulo_actual, 1);
        });

    document.getElementById("cuerpo-tabla-historial")
        .addEventListener("click", manejar_click_tabla);
    paginador = crear_paginador((nueva_pagina) => buscar_historial(modulo_actual, nueva_pagina));
    document.getElementById("titulo-bienvenida").textContent = `Consulta de Registros`;
    document.getElementById("descripcion-bienvenida").textContent = `Módulo para consultar los registros de consultas realizadas en el sistema.`;
});

// ======================= FECHAS =======================
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

/**
 * @param {string} modulo  Módulo a consultar (p. ej. "consulta-externa").
 *                         Si se omite, se reutiliza el último usado.
 * @param {number} pagina
 */
async function buscar_historial(modulo, pagina = 1) {
    if (modulo) modulo_actual = modulo;

    if (!modulo_actual) {
        mostrarPopup({
            tipo: "error",
            titulo: "Módulo no especificado",
            mensaje: "No se indicó qué módulo consultar.",
            boton: true
        });
        return;
    }

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

    mostrarPopup({
        tipo: "carga",
        titulo: "Buscando",
        mensaje: "Buscando consultas...",
        boton: false
    });

    const parametros = new URLSearchParams({
        fecha_inicial,
        fecha_final,
        pagina: String(pagina),
        limite: String(LIMITE_POR_PAGINA)
    });
    if (busqueda) parametros.set("busqueda", busqueda);

    try {
        const response = await fetch(`${url_historial(modulo_actual)}?${parametros.toString()}`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const datos = await response.json();
        pintar_resultados(datos);
    } catch (error) {
        console.error("Error al buscar el historial de consultas:", error);
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
    return document.getElementById("cuerpo-tabla-historial");
}

function iniciales_de_nombre(nombre) {
    const palabras = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    const primera = palabras[0]?.[0] || "";
    const segunda = palabras[1]?.[0] || "";
    return (primera + segunda).toUpperCase() || "--";
}

/**
 * @param {object} registro
 * @param {"xlsx"|"pdf"} tipo_salida
 * @param {string} texto     Texto visible del botón.
 * @param {string} etiqueta  aria-label del botón.
 * @param {string} [formato] Formato a exportar si es distinto al módulo de
 *                           la página (p. ej. "nota-medica" en la columna
 *                           de Nota Médica del historial de consulta
 *                           externa). Si se omite, exportar_consulta() usa
 *                           modulo_actual, igual que siempre.
 */
function construir_boton_exportar(registro, tipo_salida, texto, etiqueta, formato) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-sm btn-outline-secondary btn-exportar";
    boton.dataset.idConsulta = registro.id_consulta;
    boton.dataset.tipoSalida = tipo_salida;
    if (formato) boton.dataset.formato = formato;
    // Para armar el nombre de descarga en el cliente:
    // Apellido_Paterno_Apellido_Materno_Modulo_FechaConsulta.
    boton.dataset.apellidoPaterno = registro.apellido_paterno || "";
    boton.dataset.apellidoMaterno = registro.apellido_materno || "";
    boton.dataset.fecha = registro.fecha || "";
    boton.setAttribute("aria-label", etiqueta);

    const texto_boton = document.createElement("span");
    texto_boton.className = "hc-texto-boton";
    texto_boton.textContent = texto;
    boton.appendChild(texto_boton);

    return boton;
}

/**
 * Celda de la columna "Nota Médica" (solo consulta-externa): un botón que
 * genera y descarga el PDF de la nota médica de esa consulta, con el mismo
 * mecanismo (fetch + popup de carga/éxito/error) que los botones de
 * Excel/PDF de la columna "Detalles", pero con formato "nota-medica" fijo
 * -- el backend ya sabe construir el registro para esa plantilla a partir
 * de vista_nota_medica (ver nota_medica.mapeo.js) -- y tipo_salida "pdf"
 * fijo, porque de la nota médica solo se ofrece el PDF.
 */
function construir_celda_nota_medica(registro) {
    const celda = document.createElement("td");
    celda.className = "text-center";

    const boton = construir_boton_exportar(
        registro,
        "pdf",
        "",
        "Generar PDF de la nota médica",
        "nota-medica"
    );
    boton.classList.replace("btn-outline-secondary", "btn-outline-primary");

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-notes-medical";
    icono.setAttribute("aria-hidden", "true");
    boton.prepend(icono);

    const texto_boton = boton.querySelector(".hc-texto-boton");
    texto_boton.textContent = " Nota";

    celda.appendChild(boton);
    return celda;
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
    avatar.textContent = iniciales_de_nombre(registro.nombre_paciente);
    const nombre_paciente = document.createElement("span");
    nombre_paciente.className = "hc-nombre-paciente";
    nombre_paciente.textContent = registro.nombre_paciente || "—";
    celda_paciente.append(avatar, nombre_paciente);
    fila.appendChild(celda_paciente);

    const celda_curp = document.createElement("td");
    celda_curp.className = "hc-celda-monoespaciada";
    celda_curp.textContent = registro.curp || "—";
    fila.appendChild(celda_curp);

    // La columna "Nota Médica" solo existe en el historial de consulta
    // externa (es la única página que la tiene en su <thead>); en los
    // demás módulos no se agrega la celda.
    if (modulo_actual === "consulta-externa" || modulo_actual === "planificacion-familiar" || modulo_actual === "salud-bucal") {
        fila.appendChild(construir_celda_nota_medica(registro)); 
    }

    const celda_acciones = document.createElement("td");
    celda_acciones.className = "text-center";
    const contenedor_acciones = document.createElement("span");
    contenedor_acciones.className = "hc-acciones-exportar";
    contenedor_acciones.append(
        construir_boton_exportar(registro, "xlsx", "Excel", "Exportar a Excel"),
        construir_boton_exportar(registro, "pdf", "PDF", "Exportar a PDF")
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
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Sin resultados",
            mensaje: "No se encontraron consultas con esos filtros.",
            boton: true
        });
    } else {
        for (const registro of registros) {
            cuerpo.appendChild(construir_fila(registro));
        }
        cerrarPopup();
    }

    paginador.actualizar(total, pagina, limite);
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

/** Arma "Apellido_Paterno_Apellido_Materno_Modulo_FechaConsulta" para el
 *  nombre de descarga, sin espacios y con la fecha en formato AAAA-MM-DD. */
function armar_nombre_archivo(apellido_paterno, apellido_materno, modulo, fecha) {
    const solo_fecha = fecha ? String(fecha).slice(0, 10) : "";
    return [apellido_paterno, apellido_materno, modulo, solo_fecha]
        .filter(Boolean)
        .join("_")
        .replace(/\s+/g, "_");
}

async function exportar_consulta(boton) {
    const {
        idConsulta: id_consulta,
        tipoSalida: tipo_salida,
        apellidoPaterno: apellido_paterno,
        apellidoMaterno: apellido_materno,
        fecha,
        formato: formato_boton
    } = boton.dataset;
    if (!id_consulta || !tipo_salida) return;

    // La columna "Nota Médica" manda su propio formato ("nota-medica") en
    // el botón; los demás botones de exportar (Excel/PDF de la columna
    // "Detalles") no lo traen y usan el módulo de la página, como siempre.
    const formato_a_exportar = formato_boton || modulo_actual;

    const etiqueta_formato = tipo_salida === "pdf" ? "PDF" : "Excel";
    boton.disabled = true;

    mostrarPopup({
        tipo: "carga",
        titulo: "Generando documento",
        mensaje: `Preparando el archivo ${etiqueta_formato}. Esto puede tardar unos segundos...`,
        boton: false
    });

    const nombre_archivo_solicitado = armar_nombre_archivo(apellido_paterno, apellido_materno, formato_a_exportar, fecha);

    const parametros = new URLSearchParams({
        formato: formato_a_exportar,
        tipo_salida,
        id_consulta,
        nombre_archivo: nombre_archivo_solicitado
    });

    try {
        const response = await fetch(`${URL_EXPORTAR}?${parametros.toString()}`);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const blob = await response.blob();
        const extension = tipo_salida === "pdf" ? "pdf" : "xlsx";
        const nombre_archivo =
            extraer_nombre_archivo(response.headers.get("Content-Disposition")) ||
            `${nombre_archivo_solicitado || `${formato_a_exportar}-${id_consulta}`}.${extension}`;

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