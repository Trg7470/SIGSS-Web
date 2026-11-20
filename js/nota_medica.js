import {
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

// Id_Consulta que llega en la URL al redirigir desde Registrar Consulta
// (?id_consulta=123), igual que cualquier otra pantalla que abra el
// detalle de una consulta ya guardada.
const parametros = new URLSearchParams(window.location.search);
const id_consulta = parametros.get("id_consulta");

let Consulta = null; // fila de vista_consulta_externa para este Id_Consulta

document.addEventListener("DOMContentLoaded", async () => {
    // if (!Usuario) {
    //     mostrarPopup({
    //         tipo: "error",
    //         titulo: "Sesión no válida",
    //         mensaje: "No fue posible recuperar los datos del usuario.",
    //         boton: true
    //     });
    //     window.location.href = "/index.html";
    //     return;
    // }

    // if (!id_consulta) {
    //     mostrarPopup({
    //         tipo: "error",
    //         titulo: "Falta la consulta",
    //         mensaje: "Esta pantalla necesita un Id_Consulta en la URL. Regresa a Registrar Consulta.",
    //         boton: true,
    //         redireccion: "/pages/modules/consulta-externa/registrar.html"
    //     });
    //     return;
    // }

    document.getElementById("folio-consulta-titulo").textContent = id_consulta;

    // await cargar_consulta();
});

/**
 * Trae la fila completa de vista_consulta_externa para este Id_Consulta
 * (el mismo endpoint que usa el historial para el modal "Ver detalles") y
 * con eso autorrellena los campos que ya se capturaron en Registrar
 * Consulta. Los campos que no vive en esa vista (hora, fecha de
 * nacimiento, motivo, padecimiento, exploración, resultado, plan,
 * pronóstico) se dejan en blanco para que el médico los escriba aquí.
 */
async function cargar_consulta() {
    try {
        const [response, response_cat] = await Promise.all([
            fetch(`http://localhost:3000/api/modules/consulta-externa/historial/${id_consulta}`),
            fetch("http://localhost:3000/api/data/catalogos.json")
        ]);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response, "No fue posible obtener la consulta.");
            throw new Error(mensaje);
        }

        Consulta = await response.json();

        if (!Consulta) {
            mostrarPopup({
                tipo: "error",
                titulo: "Consulta no encontrada",
                mensaje: `No existe ninguna consulta con Id_Consulta ${id_consulta}.`,
                boton: true,
                redireccion: "/pages/modules/consulta-externa/registrar.html"
            });
            return;
        }

        const catalogos_json = response_cat.ok ? await response_cat.json() : {};
        const sexo_nombre = resolver_catalogo(catalogos_json.sexo_biologico, "Id_Cat_Sexo_Biologico", Consulta.sexo_biologico_id);
        const clave_edad_nombre = resolver_catalogo(catalogos_json.clave_edad, "Id_Cat_Clave_Edad", Consulta.clave_edad_id);

        llenar_formulario(sexo_nombre, clave_edad_nombre);
    } catch (error) {
        console.error("Error al cargar la consulta:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al cargar la consulta",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar los datos de la consulta."),
            boton: true
        });
    }
}

/** Busca en un catálogo de catalogos.json por su llave Id_Cat_* y regresa el Nombre. */
function resolver_catalogo(catalogo, llave_id, valor) {
    if (!Array.isArray(catalogo) || valor === null || valor === undefined) return "";
    const encontrado = catalogo.find(c => c[llave_id] === valor);
    return encontrado ? encontrado.Nombre : "";
}

/** "2026-11-19T00:00:00.000Z" / "2026-11-19" -> "19/11/2026". Vacío si no hay fecha. */
function formatear_fecha_legible(valor) {
    if (!valor) return "";
    const iso = String(valor).slice(0, 10); // "AAAA-MM-DD"
    const [anio, mes, dia] = iso.split("-");
    if (!anio || !mes || !dia) return "";
    return `${dia}/${mes}/${anio}`;
}

/** Igual que arriba pero en formato "AAAA-MM-DD", para rellenar un <input type="date">. */
function formatear_fecha_input(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 10);
}

function asignar(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = (valor === null || valor === undefined) ? "" : valor;
}

function llenar_formulario(sexo_nombre, clave_edad_nombre) {
    const c = Consulta;

    // ---- Datos de la unidad y del paciente ----
    asignar("nm-clues", c.clues);
    asignar("nm-nombre-unidad", c.nombre_unidad);
    asignar("nm-expediente", c.expediente);
    asignar("nm-folio-receta", c.folio_receta);
    asignar("nm-fecha", formatear_fecha_legible(c.fecha));
    // Hora: Fecha_Consulta se guarda solo con la fecha (sin hora real
    // capturada en Registrar Consulta), así que se deja en blanco para que
    // el médico la escriba aquí en vez de mostrar un "00:00" engañoso.
    asignar("nm-proxima-cita", formatear_fecha_input(c.fecha_proxima_cita));

    asignar("nm-paciente", c.nombre);
    asignar("nm-curp", c.curp);
    asignar("nm-sexo", sexo_nombre);
    asignar("nm-edad", c.edad != null ? `${c.edad} ${clave_edad_nombre}`.trim() : "");
    // Fecha de nacimiento: no viene en vista_consulta_externa; se captura aquí.
    asignar("nm-medico", c.nombre_prestador);
    asignar("nm-cedula-profesional", c.cedula_profesional);

    // ---- Signos vitales ----
    asignar("nm-peso", c.peso);
    asignar("nm-talla", c.talla);
    asignar("nm-imc", calcular_imc(c.peso, c.talla));
    asignar("nm-fc", c.frecuencia_cardiaca);
    asignar("nm-fr", c.frecuencia_respiratoria);
    asignar("nm-temp", c.temperatura);
    asignar("nm-ta", (c.presion_sistolica != null && c.presion_diastolica != null)
        ? `${c.presion_sistolica}/${c.presion_diastolica}`
        : "");
    asignar("nm-sat-o2", c.saturacion_oxigeno);
    asignar("nm-glucosa", c.glucosa_ayuno);

    // ---- Diagnóstico(s): solo el Nombre viene en la vista (sin Clave CIE-10) ----
    const diagnosticos = [c.diagnostico1, c.diagnostico2, c.diagnostico3]
        .filter(Boolean)
        .map(nombre => ` | ${nombre}`);
    asignar("nm-diagnosticos", diagnosticos.join("\n"));
}

function calcular_imc(peso, talla_cm) {
    const p = Number(peso);
    const t = Number(talla_cm);
    if (!p || !t) return "";
    const metros = t / 100;
    return (p / (metros * metros)).toFixed(1);
}

document.getElementById("cancelar").addEventListener("click", () => {
    window.location.href = "/pages/modules/nota-medica/registrar.html";
});

// TODO: falta el endpoint de generación (GET/POST /api/modules/nota-medica/generar)
// que tome este objeto + nota_medica.config.js y llame a generar_xls/generar_pdf,
// igual que ya existe para consulta-externa. En lo que se construye, el botón
// solo valida que haya datos y lo deja listo para conectarse a ese endpoint.
document.getElementById("generar-nota").addEventListener("click", () => {
    mostrarPopup({
        tipo: "informacion",
        titulo: "Falta conectar la generación",
        mensaje: "El formulario ya junta todos los datos; falta construir el endpoint que genere el XLSX/PDF de la nota médica.",
        boton: true
    });
});