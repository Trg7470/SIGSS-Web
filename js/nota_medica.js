import {
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));
const BASE_API = "http://localhost:3000/api";
const URL_NOTA_MEDICA = `${BASE_API}/modules/nota-medica/historial`;
const URL_CATALOGOS = `${BASE_API}/data/catalogos.json`;

// Id_Consulta que llega en la URL, ya sea al redirigir desde Registrar
// Consulta recién guardada, o al entrar desde el botón "Ver/Generar nota
// médica" del historial de consultas (consultas_registros.js) -- es la
// misma pantalla para los dos casos, lo único que cambia es si la nota
// ya existe o no.
const parametros = new URLSearchParams(window.location.search);
const id_consulta = parametros.get("id_consulta");

let Nota = null;          // fila de vista_nota_medica para este Id_Consulta
let modo_edicion = false; // true si Nota.id_nota_medica ya existía al cargar

// ---- Tratamiento estructurado (buscador contra Cat_Medicamentos) ----
let tratamientos = [];            // lista de medicamentos ya agregados a esta nota
let medicamento_elegido = null;   // resultado del buscador que se está por agregar
let temporizador_busqueda = null; // debounce del input de búsqueda

document.addEventListener("DOMContentLoaded", async () => {
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

    if (!id_consulta) {
        mostrarPopup({
            tipo: "error",
            titulo: "Falta la consulta",
            mensaje: "Esta pantalla necesita un Id_Consulta en la URL. Regresa a Registrar Consulta.",
            boton: true,
            redireccion: "../consulta-externa/registrar.html"
        });
        return;
    }
    await cargar_consulta();
});

/**
 * Trae la fila completa de vista_nota_medica para este Id_Consulta: header,
 * paciente, signos vitales, diagnóstico y, si la nota ya se había guardado
 * antes, también lo narrativo (motivo, padecimiento, exploración,
 * resultado, pronóstico, indicaciones generales) y el tratamiento. Si
 * id_nota_medica viene null, es la primera vez que se abre esta consulta
 * y el formulario arranca en blanco en esos campos.
 */
async function cargar_consulta() {
    try {
        const [response, response_cat] = await Promise.all([
            fetch(`${URL_NOTA_MEDICA}/${id_consulta}`),
            fetch(URL_CATALOGOS)
        ]);

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response, "No fue posible obtener la consulta.");
            throw new Error(mensaje);
        }

        Nota = await response.json();

        if (!Nota) {
            mostrarPopup({
                tipo: "error",
                titulo: "Consulta no encontrada",
                mensaje: `No existe ninguna consulta con Id_Consulta ${id_consulta}.`,
                boton: true,
                redireccion: "../consulta-externa/registrar.html"
            });
            return;
        }

        modo_edicion = Boolean(Nota.id_nota_medica);

        const catalogos_json = response_cat.ok ? await response_cat.json() : {};
        const sexo_nombre = resolver_catalogo(catalogos_json.sexo_biologico, "Id_Cat_Sexo_Biologico", Nota.sexo_biologico_id);
        const clave_edad_nombre = resolver_catalogo(catalogos_json.clave_edad, "Id_Cat_Clave_Edad", Nota.clave_edad_id);

        llenar_formulario(sexo_nombre, clave_edad_nombre);
        document.getElementById("titulo-bienvenida").textContent = "Nota médica";
        document.getElementById("descripcion-bienvenida").textContent = `Modulo de nota médica para la consulta.`;
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
    const iso = String(valor).slice(0, 10);
    const [anio, mes, dia] = iso.split("-");
    if (!anio || !mes || !dia) return "";
    return `${dia}/${mes}/${anio}`;
}

/** Igual que arriba pero en formato "AAAA-MM-DD", para un <input type="date">. */
function formatear_fecha_input(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 10);
}

/** "HH:mm:ss" / "HH:mm" -> "HH:mm", para un <input type="time">. */
function formatear_hora_input(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 5);
}

function asignar(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = (valor === null || valor === undefined) ? "" : valor;
}

function llenar_formulario(sexo_nombre, clave_edad_nombre) {
    const n = Nota;

    // ---- Datos de la unidad y del paciente (autollenado, siempre de la consulta) ----
    asignar("nm-clues", n.clues);
    asignar("nm-nombre-unidad", n.nombre_unidad);
    asignar("nm-expediente", n.expediente);
    asignar("nm-folio-receta", n.folio_receta);
    asignar("nm-fecha", formatear_fecha_legible(n.fecha));
    asignar("nm-hora", formatear_hora_input(n.hora));
    asignar("nm-proxima-cita", formatear_fecha_input(n.fecha_proxima_cita));

    asignar("nm-paciente", n.nombre);
    asignar("nm-curp", n.curp);
    asignar("nm-sexo", sexo_nombre);
    asignar("nm-edad", n.edad != null ? `${n.edad} ${clave_edad_nombre}`.trim() : "");
    asignar("nm-fecha-nacimiento", formatear_fecha_input(n.fecha_nacimiento));
    asignar("nm-medico", n.nombre_prestador);
    asignar("nm-cedula-profesional", n.cedula_profesional);

    // ---- Signos vitales (autollenado) ----
    asignar("nm-peso", n.peso);
    asignar("nm-talla", n.talla);
    asignar("nm-imc", calcular_imc(n.peso, n.talla));
    asignar("nm-fc", n.frecuencia_cardiaca);
    asignar("nm-fr", n.frecuencia_respiratoria);
    asignar("nm-temp", n.temperatura);
    asignar("nm-ta", (n.presion_sistolica != null && n.presion_diastolica != null)
        ? `${n.presion_sistolica}/${n.presion_diastolica}`
        : "");
    asignar("nm-sat-o2", n.saturacion_oxigeno);
    asignar("nm-glucosa", n.glucosa_capilar);

    // ---- Diagnóstico(s): solo el Nombre viene en la vista (sin Clave CIE-10) ----
    const diagnosticos = [n.diagnostico1, n.diagnostico2, n.diagnostico3]
        .filter(Boolean)
        .map(nombre => ` | ${nombre}`);
    asignar("nm-diagnosticos", diagnosticos.join("\n"));

    // ---- Lo narrativo: viene de Notas_Medicas si ya se había guardado antes;
    // si no, queda en blanco para que el médico lo capture por primera vez. ----
    asignar("nm-motivo-consulta", n.motivo_consulta);
    asignar("nm-padecimiento-actual", n.padecimiento_actual);
    asignar("nm-exploracion-fisica", n.exploracion_fisica);
    asignar("nm-resultado-estudios", n.resultado_estudios);
    asignar("nm-pronostico", n.pronostico);
    asignar("nm-indicaciones-generales", n.indicaciones_generales);

    // ---- Tratamiento estructurado: si la nota ya existía, viene en
    // n.tratamientos (uno por fila de Nota_Medica_Tratamientos, con su
    // Id_Cat_Medicamento) y se precarga tal cual para poder editarlo. ----
    tratamientos = Array.isArray(n.tratamientos)
        ? n.tratamientos.map(t => ({
            id_cat_medicamento: t.id_cat_medicamento,
            nombre_generico: t.nombre_generico,
            forma_farmaceutica: t.forma_farmaceutica,
            presentacion_envase: t.presentacion_envase,
            dosis: t.dosis,
            via_administracion: t.via_administracion,
            frecuencia: t.frecuencia,
            duracion: t.duracion,
            instrucciones_especificas: t.instrucciones_especificas,
        }))
        : [];
    pintar_tabla_tratamientos();
}

/** Nombre a mostrar de un medicamento: nombre genérico + forma farmacéutica si la tiene. */
function nombre_mostrable_medicamento(med) {
    return med.forma_farmaceutica ? `${med.nombre_generico} (${med.forma_farmaceutica})` : med.nombre_generico;
}

/** Repinta la tabla de medicamentos agregados a partir del arreglo `tratamientos`. */
function pintar_tabla_tratamientos() {
    const tabla = document.getElementById("nm-tabla-tratamientos");
    const cuerpo = document.getElementById("nm-lista-tratamientos");
    const sin_medicamentos = document.getElementById("nm-sin-medicamentos");
    cuerpo.replaceChildren();

    if (tratamientos.length === 0) {
        tabla.style.display = "none";
        sin_medicamentos.style.display = "block";
        return;
    }

    tabla.style.display = "table";
    sin_medicamentos.style.display = "none";

    tratamientos.forEach((t, indice) => {
        const fila = document.createElement("tr");

        const celda_nombre = document.createElement("td");
        celda_nombre.textContent = nombre_mostrable_medicamento(t);
        fila.appendChild(celda_nombre);

        [t.dosis, t.via_administracion, t.frecuencia, t.duracion, t.instrucciones_especificas].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor || "—";
            fila.appendChild(celda);
        });

        const celda_quitar = document.createElement("td");
        const boton_quitar = document.createElement("button");
        boton_quitar.type = "button";
        boton_quitar.className = "btn btn-sm btn-outline-danger";
        boton_quitar.innerHTML = '<i class="fa-solid fa-trash"></i>';
        boton_quitar.addEventListener("click", () => {
            tratamientos.splice(indice, 1);
            pintar_tabla_tratamientos();
        });
        celda_quitar.appendChild(boton_quitar);
        fila.appendChild(celda_quitar);

        cuerpo.appendChild(fila);
    });
}

/** Pinta la lista de resultados del buscador de medicamentos bajo el input. */
function pintar_resultados_medicamento(resultados) {
    const contenedor = document.getElementById("nm-resultados-medicamento");
    contenedor.replaceChildren();

    if (resultados.length === 0) {
        contenedor.style.display = "none";
        return;
    }

    resultados.forEach(med => {
        const opcion = document.createElement("button");
        opcion.type = "button";
        opcion.className = "list-group-item list-group-item-action";
        opcion.innerHTML = `${nombre_mostrable_medicamento(med)}<br><small class="text-muted">${med.presentacion_envase || ""}</small>`;
        opcion.addEventListener("click", () => elegir_medicamento(med));
        contenedor.appendChild(opcion);
    });

    contenedor.style.display = "block";
}

/** El médico eligió un resultado del buscador: muestra los campos para capturar la dosis. */
function elegir_medicamento(med) {
    medicamento_elegido = med;
    document.getElementById("nm-medicamento-elegido").textContent = nombre_mostrable_medicamento(med);
    document.getElementById("nm-buscar-medicamento").value = nombre_mostrable_medicamento(med);
    document.getElementById("nm-resultados-medicamento").style.display = "none";
    document.getElementById("nm-campos-dosis").style.display = "flex";
}

document.getElementById("nm-buscar-medicamento").addEventListener("input", (evento) => {
    medicamento_elegido = null;
    document.getElementById("nm-campos-dosis").style.display = "none";

    const texto = evento.target.value.trim();
    clearTimeout(temporizador_busqueda);

    if (texto.length < 2) {
        pintar_resultados_medicamento([]);
        return;
    }

    temporizador_busqueda = setTimeout(async () => {
        try {
            const respuesta = await fetch(`${BASE_API}/modules/nota-medica/medicamentos?q=${encodeURIComponent(texto)}`);
            const resultados = respuesta.ok ? await respuesta.json() : [];
            pintar_resultados_medicamento(resultados);
        } catch (error) {
            console.error("Error al buscar medicamentos:", error);
            pintar_resultados_medicamento([]);
        }
    }, 300);
});

// Cierra la lista de resultados si se hace click fuera del buscador.
document.addEventListener("click", (evento) => {
    const grupo = document.getElementById("nm-grupo-medicamentos");
    if (grupo && !grupo.contains(evento.target)) {
        document.getElementById("nm-resultados-medicamento").style.display = "none";
    }
});

document.getElementById("nm-agregar-medicamento").addEventListener("click", () => {
    if (!medicamento_elegido) {
        mostrarPopup({
            tipo: "error",
            titulo: "Falta elegir un medicamento",
            mensaje: "Busca y selecciona un medicamento del catálogo antes de agregarlo.",
            boton: true
        });
        return;
    }

    tratamientos.push({
        id_cat_medicamento: medicamento_elegido.id_cat_medicamento,
        nombre_generico: medicamento_elegido.nombre_generico,
        forma_farmaceutica: medicamento_elegido.forma_farmaceutica,
        presentacion_envase: medicamento_elegido.presentacion_envase,
        dosis: document.getElementById("nm-dosis").value || null,
        via_administracion: document.getElementById("nm-via").value || null,
        frecuencia: document.getElementById("nm-frecuencia").value || null,
        duracion: document.getElementById("nm-duracion").value || null,
        instrucciones_especificas: document.getElementById("nm-instrucciones-especificas").value || null,
    });
    pintar_tabla_tratamientos();

    // Limpia el buscador y los campos para poder agregar el siguiente.
    medicamento_elegido = null;
    document.getElementById("nm-buscar-medicamento").value = "";
    document.getElementById("nm-dosis").value = "";
    document.getElementById("nm-via").value = "";
    document.getElementById("nm-frecuencia").value = "";
    document.getElementById("nm-duracion").value = "";
    document.getElementById("nm-instrucciones-especificas").value = "";
    document.getElementById("nm-campos-dosis").style.display = "none";
});

function calcular_imc(peso, talla_cm) {
    const p = Number(peso);
    const t = Number(talla_cm);
    if (!p || !t) return "";
    const metros = t / 100;
    return (p / (metros * metros)).toFixed(1);
}

document.getElementById("cancelar").addEventListener("click", () => {
    window.location.href = "../consulta-externa/registrar.html";
});

/**
 * Guarda lo narrativo en Notas_Medicas y el tratamiento capturado (si lo
 * hay) en Nota_Medica_Tratamientos -- reemplaza por completo el tratamiento
 * anterior de esta nota, igual que hace NotaMedicaService.guardar().
 *
 * TODO: todavía falta el endpoint que, además de guardar, genere el
 * XLSX/PDF de la nota médica (GET/POST /api/modules/nota-medica/generar)
 * tomando este mismo objeto + nota_medica.config.js, igual que ya existe
 * para consulta-externa. Por ahora este botón solo persiste la nota.
 */
document.getElementById("generar-nota").addEventListener("click", async () => {
    const boton = document.getElementById("generar-nota");
    boton.disabled = true;

    mostrarPopup({
        tipo: "carga",
        titulo: "Guardando nota médica",
        mensaje: "Guardando los datos capturados...",
        boton: false
    });

    const datos = {
        hora_consulta: document.getElementById("nm-hora").value || null,
        motivo_consulta: document.getElementById("nm-motivo-consulta").value || null,
        padecimiento_actual: document.getElementById("nm-padecimiento-actual").value || null,
        exploracion_fisica: document.getElementById("nm-exploracion-fisica").value || null,
        resultado_estudios: document.getElementById("nm-resultado-estudios").value || null,
        pronostico: document.getElementById("nm-pronostico").value || null,
        indicaciones_generales: document.getElementById("nm-indicaciones-generales").value || null,
        tratamientos: tratamientos.map(t => ({
            id_cat_medicamento: t.id_cat_medicamento,
            dosis: t.dosis,
            via_administracion: t.via_administracion,
            frecuencia: t.frecuencia,
            duracion: t.duracion,
            instrucciones_especificas: t.instrucciones_especificas,
        })),
    };

    try {
        const response = await fetch(`${URL_NOTA_MEDICA}/${id_consulta}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response, "No fue posible guardar la nota médica.");
            throw new Error(mensaje);
        }

        mostrarPopup({
            tipo: "exito",
            titulo: "Nota médica guardada",
            mensaje: "Los datos de la nota médica se guardaron correctamente. Reedirigiendo al dashboard...",
            boton: true,
            redireccion: "/pages/dashboard/dashboard.html"
        });
    } catch (error) {
        console.error("Error al guardar la nota médica:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al guardar",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible guardar la nota médica."),
            boton: true
        });
    } finally {
        boton.disabled = false;
    }
});