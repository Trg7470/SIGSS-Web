import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

const URL_MODULOS = "http://localhost:3000/api/modules";
const URL_DOCUMENTOS = "http://localhost:3000/api/documentos";

const LIMITE_SIN_PAGINACION = 50;

const NOMBRES_MODULO = {
    "consulta-externa": "Consulta externa",
    "planificacion-familiar": "Planificación familiar",
    "salud-bucal": "Salud bucal",
    "detecciones": "Detecciones"
};

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

let modulo_consultado = null;
let fecha_consultada = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!Usuario) {
        mostrarPopup({
            tipo: "error",
            titulo: "Sesión no válida",
            mensaje: "No fue posible recuperar los datos del usuario.",
            boton: true
        });
        window.location.href = "../../index.html";
        return;
    }

    document.getElementById("form-filtros-reporte")
        .addEventListener("submit", manejar_envio_filtros);

    document.getElementById("boton-limpiar-filtros")
        .addEventListener("click", limpiar_filtros);

    document.getElementById("boton-generar-excel")
        .addEventListener("click", () => generar_documento("xlsx"));

    document.getElementById("boton-generar-pdf")
        .addEventListener("click", () => generar_documento("pdf"));
    document.getElementById("titulo-bienvenida").textContent = `Reporte de Hoja Diaria`;
    document.getElementById("descripcion-bienvenida").textContent = `Módulo de generación de reportes diarios.`;
});


async function manejar_envio_filtros(evento) {
    evento.preventDefault();

    const modulo = document.getElementById("filtro-modulo").value;
    const fecha = document.getElementById("filtro-fecha").value;

    if (!modulo || !fecha) {
        mostrarPopup({
            tipo: "error",
            titulo: "Datos incompletos",
            mensaje: "Selecciona el módulo y la fecha a consultar.",
            boton: true
        });
        return;
    }

    const boton_buscar = document.getElementById("boton-buscar-reporte");
    boton_buscar.disabled = true;
    boton_buscar.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Consultando...`;

    try {
        const parametros = new URLSearchParams({
            fecha_inicial: fecha,
            fecha_final: fecha,
            limite: LIMITE_SIN_PAGINACION
        });

        const respuesta = await fetch(`${URL_MODULOS}/${modulo}/historial?${parametros.toString()}`);

        if (!respuesta.ok) {
            const mensaje = await obtener_mensaje_error(respuesta, mensaje_por_estado(respuesta.status));
            ocultar_resultados();
            mostrarPopup({
                tipo: "error",
                titulo: "No se pudo consultar el historial",
                mensaje,
                boton: true
            });
            return;
        }

        const resultado = await respuesta.json();
        const registros = Array.isArray(resultado.registros) ? resultado.registros : [];

        if (registros.length === 0) {
            ocultar_resultados();
            mostrarPopup({
                tipo: "advertencia",
                titulo: "Sin consultas",
                mensaje: "No hay consultas registradas para esa fecha.",
                boton: true
            });
            return;
        }

        modulo_consultado = modulo;
        fecha_consultada = fecha;

        mostrar_resultados(registros, modulo, fecha);
    } catch (error) {
        console.error("Error al consultar el historial:", error);
        ocultar_resultados();
        mostrarPopup({
            tipo: "error",
            titulo: "Error de conexión",
            mensaje: es_error_de_red(error) ? MENSAJE_SIN_CONEXION : error.message,
            boton: true
        });
    } finally {
        boton_buscar.disabled = false;
        boton_buscar.innerHTML = `<i class="fa-solid fa-magnifying-glass mr-1"></i> Consultar`;
    }
}

function mostrar_resultados(registros, modulo, fecha) {
    const cuerpo_tabla = document.getElementById("cuerpo-tabla-reporte");
    const fecha_formateada = formatear_fecha(fecha);

    cuerpo_tabla.replaceChildren();

    registros.forEach((registro) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td class="hc-celda-monoespaciada">${escapar(registro.folio_receta)}</td>
            <td>${escapar(registro.expediente)}</td>
            <td>${formatear_fecha(registro.fecha) || fecha_formateada}</td>
            <td class="hc-celda-paciente">
                <span class="hc-avatar">${iniciales(registro.nombre_paciente)}</span>
                <span class="hc-nombre-paciente">${escapar(registro.nombre_paciente)}</span>
            </td>
            <td class="hc-celda-monoespaciada">${escapar(registro.curp)}</td>
        `;
        cuerpo_tabla.appendChild(fila);
    });

    document.getElementById("contador-resultados").textContent = registros.length;

    const total_hojas = Math.max(1, Math.ceil(registros.length / 5));
    document.getElementById("texto-info-hojas").textContent =
        total_hojas === 1 ? "Se generará 1 hoja" : `Se generarán ${total_hojas} hojas`;

    document.getElementById("texto-resumen-reporte").textContent =
        `${NOMBRES_MODULO[modulo] || modulo} · ${fecha_formateada}`;

    document.getElementById("tarjeta-resultados").classList.remove("d-none");
    document.getElementById("boton-generar-excel").disabled = false;
    document.getElementById("boton-generar-pdf").disabled = false;
}

function ocultar_resultados() {
    document.getElementById("tarjeta-resultados").classList.add("d-none");
    document.getElementById("boton-generar-excel").disabled = true;
    document.getElementById("boton-generar-pdf").disabled = true;
    modulo_consultado = null;
    fecha_consultada = null;
}

function limpiar_filtros() {
    document.getElementById("form-filtros-reporte").reset();
    ocultar_resultados();
}

async function generar_documento(tipo_salida) {
    if (!modulo_consultado || !fecha_consultada) {
        return;
    }

    const boton = document.getElementById(
        tipo_salida === "pdf" ? "boton-generar-pdf" : "boton-generar-excel"
    );
    const texto_original = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generando...`;

    mostrarPopup({
        tipo: "carga",
        titulo: "Generando documento",
        mensaje: "Espere un momento, por favor..."
    });

    try {
        const nombre_archivo = `${modulo_consultado}_${fecha_consultada}`;

        const parametros = new URLSearchParams({
            formato: modulo_consultado,
            tipo_salida,
            fecha: fecha_consultada,
            nombre_archivo
        });

        const respuesta_documento = await fetch(`${URL_DOCUMENTOS}/exportar?${parametros.toString()}`);

        if (!respuesta_documento.ok) {
            const mensaje = await obtener_mensaje_error(respuesta_documento, mensaje_por_estado(respuesta_documento.status));
            throw new Error(mensaje);
        }

        const paquete = await respuesta_documento.blob();
        descargar_blob(paquete, `${nombre_archivo}.${tipo_salida}`);

        mostrarPopup({
            tipo: "exito",
            titulo: "Documento generado",
            mensaje: "La descarga comenzará en un momento.",
            boton: true
        });
    } catch (error) {
        console.error("Error al generar el documento:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "No se pudo generar el documento",
            mensaje: es_error_de_red(error) ? MENSAJE_SIN_CONEXION : error.message,
            boton: true
        });
    } finally {
        boton.disabled = false;
        boton.innerHTML = texto_original;
    }
}

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

function formatear_fecha(fecha) {
    if (!fecha) return "";
    const fecha_texto = String(fecha).slice(0, 10); // admite "YYYY-MM-DD" o timestamp ISO
    const [anio, mes, dia] = fecha_texto.split("-");
    if (!anio || !mes || !dia) return fecha_texto;
    return `${dia}/${mes}/${anio}`;
}

function iniciales(nombre) {
    if (!nombre) return "--";
    const partes = String(nombre).trim().split(/\s+/);
    return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}

function escapar(valor) {
    if (valor === null || valor === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(valor);
    return div.innerHTML;
}