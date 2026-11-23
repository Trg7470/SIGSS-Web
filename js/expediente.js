// ==================================================
// Expediente del paciente — lógica de la pantalla
// Módulo de gestión de pacientes (SIGSS)
// ==================================================
//
// Rutas reales usadas aquí:
// - GET  /api/pacientes/:id_paciente                  (pacientes_formulario.js)
// - GET  /api/modules/consulta-externa/historial       (buscar_historial)
// - GET  /api/modules/nota-medica/historial/:id_consulta (ver nota médica)
//
// IMPORTANTE: buscar_historial no filtra por paciente/expediente; solo
// acepta fecha_inicial/fecha_final (obligatorias) y un texto libre
// (busqueda) que compara contra nombre_paciente/curp/folio_receta. Por
// eso aquí se manda busqueda = CURP del paciente, con un rango de fechas
// amplio, para traer todo su historial en consulta externa. Si el
// paciente llega a tener más de LIMITE_HISTORIAL consultas, falta
// paginar (hoy se pide todo en una sola página).
//
// Planificación familiar y salud bucal todavía no tienen un endpoint de
// historial propio, así que por ahora el expediente solo muestra lo de
// consulta externa; el filtro de módulo ya está listo para cuando
// existan (agrega su chip en expediente.html y su llamada aquí).

import {
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

import {
    cargar_catalogos_pacientes,
    obtener_paciente,
    abrir_formulario_paciente,
    etiqueta_catalogo
} from "./pacientes_formulario.js";

const BASE_API = "http://localhost:3000/api";

const FECHA_INICIAL_HISTORIAL = "2000-01-01";
const LIMITE_HISTORIAL = 1000;

const etiquetas_modulo = {
    consulta_externa: "Consulta externa"
    // planificacion_familiar y salud_bucal se agregan cuando existan.
};

const parametros = new URLSearchParams(window.location.search);
const id_paciente = parametros.get("id");

let catalogos_json = null;
let paciente_actual = null;
let historial_completo = [];
let filtro_modulo_activo = "todos";

document.addEventListener("DOMContentLoaded", async () => {
    if (!id_paciente) {
        // Sin id en la URL no hay nada que mostrar; regresa al listado.
        window.location.href = "pacientes.html";
        return;
    }

    inicializar_filtros_modulo();

    document.getElementById("boton-editar-datos")
        .addEventListener("click", abrir_edicion_paciente);

    document.getElementById("boton-generar-reporte")
        .addEventListener("click", ir_a_generar_reporte);

    const catalogos_cargados = await cargar_catalogos();
    if (!catalogos_cargados) return;

    cargar_expediente();
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

// ======================= CARGA DEL EXPEDIENTE =======================

async function cargar_expediente() {
    mostrarPopup({
        tipo: "carga",
        titulo: "Cargando expediente",
        mensaje: "Obteniendo los datos del paciente...",
        boton: false
    });

    try {
        const paciente = await obtener_paciente(id_paciente);
        paciente_actual = paciente;

        const historial = await obtener_historial_consulta_externa(paciente.Curp);
        historial_completo = historial;

        pintar_resumen_paciente(paciente, historial_completo);
        pintar_datos_generales(paciente);
        pintar_historial(historial_completo);
        pintar_notas_medicas(historial_completo);

        cerrarPopup();
    } catch (error) {
        console.error("Error al cargar el expediente:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al cargar",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible obtener el expediente."),
            boton: true
        });
    }
}

// --------------------------------------------------
// Historial (consulta externa) y nota médica por consulta
// --------------------------------------------------

async function obtener_historial_consulta_externa(curp) {
    if (!curp) return [];

    const parametros_historial = new URLSearchParams({
        fecha_inicial: FECHA_INICIAL_HISTORIAL,
        fecha_final: hoy_iso(),
        busqueda: curp,
        pagina: "1",
        limite: String(LIMITE_HISTORIAL)
    });

    const response = await fetch(`${BASE_API}/modules/consulta-externa/historial?${parametros_historial.toString()}`);
    if (!response.ok) throw new Error("No se pudo obtener el historial de consulta externa.");

    const datos = await response.json();
    return (datos.registros || []).map((registro) => ({ ...registro, modulo: "consulta_externa" }));
}

async function obtener_nota_medica(id_consulta) {
    const response = await fetch(`${BASE_API}/modules/nota-medica/historial/${encodeURIComponent(id_consulta)}`);
    if (!response.ok) throw new Error("No se pudo obtener la nota médica.");
    return response.json();
}

function hoy_iso() {
    return new Date().toISOString().slice(0, 10);
}

// ======================= RESUMEN DEL PACIENTE =======================

function pintar_resumen_paciente(paciente, historial) {
    const nombre_completo = `${paciente.Nombre} ${paciente.Apellido_Paterno} ${paciente.Apellido_Materno}`.trim();

    document.getElementById("texto-nombre-paciente").textContent = nombre_completo;
    document.getElementById("texto-expediente-paciente").textContent = `Expediente ${paciente.Expediente || "—"}`;
    document.getElementById("texto-curp-paciente").textContent = paciente.Curp || "—";
    document.getElementById("texto-edad-paciente").textContent = calcular_edad(paciente.Fecha_Nacimiento);
    document.getElementById("texto-sexo-paciente").textContent =
        etiqueta_catalogo(catalogos_json?.sexo_biologico, "Id_Cat_Sexo_Biologico", paciente.Sexo);
    document.getElementById("texto-entidad-paciente").textContent = paciente.Entidad_Nacimiento || "—";

    const modulos_presentes = [...new Set(historial.map((registro) => registro.modulo))];
    const contenedor_badges = document.getElementById("contenedor-badges-modulos");
    contenedor_badges.innerHTML = modulos_presentes
        .map((modulo) => `<span class="hc-badge-modulo hc-badge-modulo--${modulo}">${etiquetas_modulo[modulo] ?? modulo}</span>`)
        .join("");

    const fechas = historial.map((registro) => new Date(registro.fecha));
    const ultima_consulta = fechas.length
        ? new Date(Math.max(...fechas)).toLocaleDateString("es-MX")
        : "—";
    document.getElementById("texto-ultima-consulta").textContent = ultima_consulta;
    document.getElementById("texto-total-consultas").textContent = historial.length;
}

function calcular_edad(fecha_nacimiento) {
    if (!fecha_nacimiento) return "—";
    const nacimiento = new Date(fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aun_no_cumple =
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    if (aun_no_cumple) edad -= 1;
    return `${edad} años`;
}

// ======================= PESTAÑA: DATOS GENERALES =======================

function pintar_datos_generales(paciente) {
    const nombre_completo = `${paciente.Nombre} ${paciente.Apellido_Paterno} ${paciente.Apellido_Materno}`.trim();

    document.getElementById("lectura-nombre").textContent = nombre_completo || "—";
    document.getElementById("lectura-curp").textContent = paciente.Curp || "—";
    document.getElementById("lectura-expediente").textContent = paciente.Expediente || "—";
    document.getElementById("lectura-fecha-nacimiento").textContent = paciente.Fecha_Nacimiento || "—";
    document.getElementById("lectura-sexo").textContent =
        etiqueta_catalogo(catalogos_json?.sexo_biologico, "Id_Cat_Sexo_Biologico", paciente.Sexo);
    document.getElementById("lectura-entidad-nacimiento").textContent = paciente.Entidad_Nacimiento || "—";
    document.getElementById("lectura-pais-nacimiento").textContent = paciente.Pais_Nacimiento || "—";
    document.getElementById("lectura-migrante").textContent = paciente.Es_Migrante
        ? etiqueta_catalogo(catalogos_json?.migrante, "Id_Cat_Migrante", paciente.Es_Migrante)
        : "No";
    document.getElementById("lectura-afromexicano").textContent = paciente.Es_Afromexicano ? "Sí" : "No";
    document.getElementById("lectura-indigena").textContent = paciente.Es_Indigena ? "Sí" : "No";
}

function abrir_edicion_paciente() {
    abrir_formulario_paciente(id_paciente, paciente_actual, catalogos_json, async () => {
        // Tras guardar, recarga el expediente para reflejar los cambios
        // en el resumen y en la pestaña de Datos generales.
        await cargar_expediente();
    });
}

// ======================= PESTAÑA: HISTORIAL CLÍNICO =======================

function inicializar_filtros_modulo() {
    const chips = document.querySelectorAll("#contenedor-filtros-modulo .hc-chip-modulo");
    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            chips.forEach((otro) => otro.classList.remove("active"));
            chip.classList.add("active");
            filtro_modulo_activo = chip.dataset.modulo;
            pintar_historial(historial_completo);
        });
    });
}

function pintar_historial(historial) {
    const filtrado = filtro_modulo_activo === "todos"
        ? historial
        : historial.filter((registro) => registro.modulo === filtro_modulo_activo);

    const cuerpo = document.getElementById("cuerpo-tabla-historial-expediente");
    cuerpo.innerHTML = filtrado
        .map((registro) => `
      <tr>
        <td>${registro.folio_receta ?? "—"}</td>
        <td>${formatear_fecha(registro.fecha)}</td>
        <td>
          <span class="hc-modulo-celda">
            <span class="hc-modulo-punto" style="background:#2563eb"></span>
            ${etiquetas_modulo[registro.modulo] ?? registro.modulo}
          </span>
        </td>
        <td class="text-center">${registro.id_nota_medica ? "Sí" : "—"}</td>
      </tr>`)
        .join("");
}

function formatear_fecha(fecha) {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-MX");
}

// ======================= PESTAÑA: NOTAS MÉDICAS =======================
// Se derivan del mismo historial: cualquier consulta con id_nota_medica.
// El detalle (vista_nota_medica) se carga al abrir cada tarjeta, no de
// entrada, para no pedir N notas si el paciente tiene muchas consultas.

const CAMPOS_NOTA_MEDICA = [
    ["motivo_consulta", "Motivo de consulta"],
    ["padecimiento_actual", "Padecimiento actual"],
    ["exploracion_fisica", "Exploración física"],
    ["resultado_estudios", "Resultado de estudios"],
    ["diagnostico1", "Diagnóstico 1"],
    ["diagnostico2", "Diagnóstico 2"],
    ["diagnostico3", "Diagnóstico 3"],
    ["tratamiento1", "Tratamiento 1"],
    ["tratamiento2", "Tratamiento 2"],
    ["tratamiento3", "Tratamiento 3"],
    ["pronostico", "Pronóstico"],
    ["indicaciones_generales", "Indicaciones generales"],
    ["fecha_proxima_cita", "Próxima cita"]
];

function pintar_notas_medicas(historial) {
    const contenedor = document.getElementById("contenedor-notas-medicas");
    const consultas_con_nota = historial.filter((registro) => registro.id_nota_medica);

    if (!consultas_con_nota.length) {
        contenedor.innerHTML = `<p class="text-muted small">Este paciente no tiene notas médicas registradas.</p>`;
        return;
    }

    contenedor.innerHTML = consultas_con_nota
        .map((registro) => `
      <div class="hc-card-nota">
        <div class="hc-nota-encabezado">
          <span class="hc-nota-modulo">${etiquetas_modulo[registro.modulo] ?? registro.modulo}</span>
          <span class="hc-nota-fecha">${formatear_fecha(registro.fecha)}</span>
        </div>
        <p class="hc-nota-resumen">Folio de receta: ${registro.folio_receta ?? "—"}</p>
        <button type="button" class="btn btn-link btn-sm p-0 boton-ver-nota" data-id-consulta="${registro.id_consulta}">Ver nota completa</button>
        <div class="hc-datos-grid d-none mt-3" id="detalle-nota-${registro.id_consulta}"></div>
      </div>`)
        .join("");

    contenedor.querySelectorAll(".boton-ver-nota").forEach((boton) => {
        boton.addEventListener("click", () => alternar_detalle_nota(boton));
    });
}

async function alternar_detalle_nota(boton) {
    const id_consulta = boton.dataset.idConsulta;
    const contenedor_detalle = document.getElementById(`detalle-nota-${id_consulta}`);

    if (!contenedor_detalle.classList.contains("d-none")) {
        contenedor_detalle.classList.add("d-none");
        boton.textContent = "Ver nota completa";
        return;
    }

    if (contenedor_detalle.dataset.cargado) {
        contenedor_detalle.classList.remove("d-none");
        boton.textContent = "Ocultar nota";
        return;
    }

    boton.disabled = true;
    boton.textContent = "Cargando...";

    try {
        const nota = await obtener_nota_medica(id_consulta);
        contenedor_detalle.innerHTML = CAMPOS_NOTA_MEDICA
            .filter(([campo]) => nota?.[campo])
            .map(([campo, etiqueta]) => `
          <div>
            <span class="hc-datos-label">${etiqueta}</span>
            <span class="hc-datos-valor">${nota[campo]}</span>
          </div>`)
            .join("") || `<p class="text-muted small">Esta nota no tiene contenido registrado.</p>`;

        contenedor_detalle.dataset.cargado = "1";
        contenedor_detalle.classList.remove("d-none");
        boton.textContent = "Ocultar nota";
    } catch (error) {
        console.error("Error al obtener la nota médica:", error);
        contenedor_detalle.innerHTML = `<p class="text-danger small">${
            es_error_de_red(error) ? MENSAJE_SIN_CONEXION : (error.message || "No fue posible obtener la nota médica.")
        }</p>`;
        contenedor_detalle.classList.remove("d-none");
        boton.textContent = "Ver nota completa";
    } finally {
        boton.disabled = false;
    }
}

// ======================= ACCIONES DEL ENCABEZADO =======================

function ir_a_generar_reporte() {
    // Lleva a la pantalla de reportes ya existente, pre-filtrada
    // con el expediente de este paciente.
    const expediente = paciente_actual?.Expediente ?? "";
    window.location.href = `../reportes/hoja_diaria.html?expediente=${encodeURIComponent(expediente)}`;
}