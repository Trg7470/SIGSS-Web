import { llenar_select } from "./utils.js";

export async function init({ vista, usuario }) {
    if (vista === "registrar") {
        seleccionar_paciente(usuario);
    }
}

const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

if (!Usuario) {
    mostrarPopup({
        tipo: "error",
        titulo: "Sesión no válida",
        mensaje: "No fue posible recuperar los datos del usuario.",
        boton: true
    });
}

let Paciente;

function seleccionar_paciente(usuario) {
    window.modal_manager.mostrar({
        titulo: "Seleccionar paciente",
        icono: "fas fa-hospital-user",
        texto_guardar: "Buscar paciente",
        icono_guardar: "fas fa-search",
        descripcion: "Busca al paciente por CURP o por nombre y apellidos.",
        campos: [
            {
                id: "paciente_curp",
                nombre: "curp",
                etiqueta: "CURP",
                tipo: "text",
                columna: "col-md-12 mb-3",
                placeholder: "Ingresa la CURP",
                maxlength: 18
            },
            {
                id: "paciente_nombre",
                nombre: "nombre",
                etiqueta: "Nombre(s)",
                tipo: "text",
                columna: "col-md-4 mb-3",
                placeholder: "Nombre(s)"
            },
            {
                id: "paciente_apellido_paterno",
                nombre: "apellido_paterno",
                etiqueta: "Apellido paterno",
                tipo: "text",
                columna: "col-md-4 mb-3",
                placeholder: "Apellido paterno"
            },
            {
                id: "paciente_apellido_materno",
                nombre: "apellido_materno",
                etiqueta: "Apellido materno",
                tipo: "text",
                columna: "col-md-4 mb-3",
                placeholder: "Apellido materno"
            }
        ],
        onSubmit: async (datos) => {
            const curp = (datos.curp || "").trim();
            const nombre = (datos.nombre || "").trim();
            const paterno = (datos.apellido_paterno || "").trim();
            const materno = (datos.apellido_materno || "").trim();
            const nombre_completo = `${nombre} ${paterno} ${materno}`.trim();

            if (curp === "" && (!nombre || !paterno || !materno)) {
                mostrarPopup({
                    tipo: "advertencia",
                    titulo: "Datos incompletos",
                    mensaje: "Ingresa la CURP o el nombre completo con ambos apellidos.",
                    boton: true
                });
                return false;
            }

            try {
                const result = await fetch("http://localhost:3000/api/pacientes/buscar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        criterios: {
                            Curp: curp || null,
                            Nombre_Completo: curp ? null : nombre_completo
                        }
                    })
                });

                const response = await result.json();

                if (result.status === 404) {
                    mostrarPopup({
                        tipo: "informacion",
                        titulo: "Paciente no encontrado",
                        mensaje: response.message || "No se encontró ningún paciente con esos datos.",
                        boton: true
                    });
                    return false;
                }

                if (!result.ok || response.success === false) {
                    throw new Error(response.message || "No fue posible buscar al paciente.");
                }

                Paciente = response.paciente;

                if (!Paciente) {
                    throw new Error("El servidor no devolvió los datos del paciente.");
                }

                mostrarPopup({
                    tipo: "exito",
                    titulo: "Paciente encontrado",
                    mensaje: `Nombre: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno} | CURP: ${Paciente.Curp} | Expediente: ${Paciente.Expediente}`,
                    boton: true
                });

                await cargar_datos();
            } catch (error) {
                console.error("Error al buscar paciente:", error);

                mostrarPopup({
                    tipo: "error",
                    titulo: "Error de búsqueda",
                    mensaje: error.message || "No fue posible buscar al paciente. Inténtalo nuevamente.",
                    boton: true
                });

                return false;
            }
        }
    });
}

function configurar_busqueda_diagnosticos(id) {
    const input = document.getElementById(id);
    const hidden = document.getElementById(`${id}-id`);
    const resultados = document.getElementById(`${id}-resultados`);

    if (!input || !hidden || !resultados) return;

    input.addEventListener("input", async () => {
        const nombre = input.value.trim();

        hidden.value = "";
        resultados.replaceChildren();

        if (nombre.length < 2) {
            resultados.style.display = "none";
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:3000/api/catalogos/diagnosticos/buscar?nombre=${encodeURIComponent(nombre + "%")}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error al buscar diagnósticos.");
            }

            const diagnosticos = data.diagnosticos || [];

            diagnosticos.forEach(diagnostico => {
                const opcion = document.createElement("button");

                opcion.type = "button";
                opcion.className = "list-group-item list-group-item-action";
                opcion.textContent = `${diagnostico.Clave} | ${diagnostico.Nombre}`;

                opcion.addEventListener("click", () => {
                    input.value = opcion.textContent;
                    hidden.value = diagnostico.Id_Cat_Diagnosticos;
                    resultados.style.display = "none";
                    resultados.replaceChildren();
                });

                resultados.appendChild(opcion);
            });

            if (diagnosticos.length === 0) {
                resultados.textContent = "No se encontraron diagnósticos.";
            }

            resultados.style.display = "block";
        } catch (error) {
            console.error("Error al buscar diagnósticos:", error);
            resultados.style.display = "none";
        }
    });

    document.addEventListener("click", event => {
        if (!input.contains(event.target) && !resultados.contains(event.target)) {
            resultados.style.display = "none";
        }
    });
}

// Nueva lógica: obtiene la fecha de nacimiento de la CURP.
function obtener_fecha_nacimiento_curp(curp) {
    const coincidencia = curp?.toUpperCase().match(/^[A-Z]{4}(\d{2})(\d{2})(\d{2})[HM]/);

    if (!coincidencia) return null;

    const anio_corto = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);
    const siglo = /\d/.test(curp[16]) ? 1900 : 2000;
    const anio = siglo + anio_corto;
    const fecha = new Date(anio, mes - 1, dia);

    if (
        fecha.getFullYear() !== anio ||
        fecha.getMonth() !== mes - 1 ||
        fecha.getDate() !== dia
    ) {
        return null;
    }

    return fecha;
}

// Nueva lógica: calcula la edad completa a la fecha de consulta.
function calcular_edad(fecha_nacimiento, fecha_consulta) {
    const nacimiento = new Date(fecha_nacimiento);
    const consulta = new Date(`${fecha_consulta}T00:00:00`);

    if (
        !fecha_consulta ||
        Number.isNaN(consulta.getTime()) ||
        nacimiento > consulta
    ) {
        return null;
    }

    let meses = (consulta.getFullYear() - nacimiento.getFullYear()) * 12
        + consulta.getMonth() - nacimiento.getMonth();

    if (consulta.getDate() < nacimiento.getDate()) {
        meses--;
    }

    if (meses < 0) return null;

    if (meses === 0) {
        return {
            edad: Math.floor((consulta - nacimiento) / 86400000),
            clave: "D"
        };
    }

    return meses < 12
        ? { edad: meses, clave: "M" }
        : { edad: Math.floor(meses / 12), clave: "A" };
}

// Nueva lógica: rellena los campos automáticamente o permite capturarlos manualmente.
function actualizar_edad() {
    const campo_edad = document.getElementById("edad");
    const campo_clave = document.getElementById("clave-edad");
    const fecha_consulta = document.getElementById("fecha-atencion").value;
    const curp = (Paciente?.Curp || "").trim();

    if (!curp) {
        campo_edad.value = "";
        campo_edad.readOnly = false;
        campo_clave.disabled = false;
        campo_clave.value = "";
        return;
    }

    const nacimiento = obtener_fecha_nacimiento_curp(curp);
    const resultado = nacimiento
        ? calcular_edad(nacimiento, fecha_consulta)
        : null;

    if (!resultado) {
        campo_edad.value = "";
        campo_edad.readOnly = false;
        campo_clave.disabled = false;
        campo_clave.value = "";
        return;
    }

    campo_edad.value = resultado.edad;

    const opcion = [...campo_clave.options].find(
        option => option.textContent.trim().startsWith(`${resultado.clave} |`)
    );

    if (opcion) {
        campo_clave.value = opcion.value;
    }

    campo_edad.readOnly = true;
    campo_clave.disabled = true;
}

// Nueva lógica: valida la edad antes de registrar la consulta.
function validar_edad() {
    const campo_edad = document.getElementById("edad");
    const campo_clave = document.getElementById("clave-edad");
    const curp = (Paciente?.Curp || "").trim();

    if (curp) {
        const nacimiento = obtener_fecha_nacimiento_curp(curp);
        const resultado = nacimiento
            ? calcular_edad(nacimiento, document.getElementById("fecha-atencion").value)
            : null;

        if (!resultado) {
            mostrarPopup({
                tipo: "advertencia",
                titulo: "Edad no válida",
                mensaje: "No fue posible calcular la edad a partir de la CURP y la fecha de consulta.",
                boton: true
            });
            return false;
        }

        actualizar_edad();

        if (!campo_clave.value) {
            mostrarPopup({
                tipo: "error",
                titulo: "Clave de edad no disponible",
                mensaje: "No se encontró la clave de edad correspondiente en el catálogo.",
                boton: true
            });
            return false;
        }

        return true;
    }

    const edad = campo_edad.value.trim();
    const clave = campo_clave.selectedOptions[0]?.textContent.trim().split("|")[0].trim();

    if (
        edad === "" ||
        !Number.isInteger(Number(edad)) ||
        Number(edad) < 0 ||
        !["D", "M", "A"].includes(clave) ||
        !campo_clave.value
    ) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Edad requerida",
            mensaje: "Captura una edad válida y selecciona su clave: D, M o A.",
            boton: true
        });
        return false;
    }

    return true;
}

document.getElementById("fecha-atencion").addEventListener("change", actualizar_edad);

async function cargar_datos() {
    try {
        document.getElementById("clues").value = Usuario.Clues;
        document.getElementById("nombre-unidad").value = Usuario.Nombre_Unidad;
        document.getElementById("curp-prestador").value = Usuario.Curp;
        document.getElementById("nombre-prestador").value = `${Usuario.Nombre} ${Usuario.Apellido_Paterno} ${Usuario.Apellido_Materno}`.trim();
        document.getElementById("tipo-personal").value = Usuario.Tipo_Personal;
        document.getElementById("cedula-profesional").value = Usuario.Cedula_Profesional;

        const ahora = new Date();

        document.getElementById("fecha-atencion").value =
            `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

        document.getElementById("expediente").value = Paciente.Expediente;
        document.getElementById("curp-paciente").value = Paciente.Curp;
        document.getElementById("nombre-paciente").value = `${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno}`.trim();

        const response = await fetch("http://localhost:3000/api/catalogos/");

        if (!response.ok) {
            mostrarPopup({
                titulo: "Error al cargar los catalogos",
                mensaje: "No fue posible obtener la lista de catalogos. Inténtalo nuevamente.",
                tipo: "error",
                boton: true
            });
            return;
        }

        const result = await response.json();
        const catalogos = result.catalogos;

        const response_j = await fetch("http://localhost:3000/api/data/catalogos.json");

        if (!response_j.ok) {
            throw new Error("No fue posible cargar los catálogos estáticos.");
        }

        const catalogos_json = await response_j.json();

        llenar_select("servicio", catalogos.servicios, "Id_Cat_Servicios", s => `${s.Clave} | ${s.Nombre}`, "Selecciona un servicio", true);
        llenar_select("derechohabiencia", catalogos.derechohabiencia, "Id_Cat_Derechohabiencia", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);
        llenar_select("clave-edad", catalogos_json.clave_edad, "Id_Cat_Clave_Edad", c => `${c.Clave} | ${c.Nombre}`, "Selecciona una opción", true);
        llenar_select("sexo", catalogos_json.sexo_biologico, "Id_Cat_Sexo_Biologico", s => `${s.Clave} | ${s.Nombre}`, "Selecciona una opción", true);
        llenar_select("migrante", catalogos_json.migrante, "Id_Cat_Migrante", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);
        llenar_select("resultado-glucosa", catalogos_json.instrumento_glucosa, "Id_Cat_Instrumento_Glucosa", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        const discapacidades = catalogos.discapacidades || [];

        llenar_select("discapacidad-a", discapacidades.filter(d => d.Inciso === "a"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-b", discapacidades.filter(d => d.Inciso === "b"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-c", discapacidades.filter(d => d.Inciso === "c"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);

        llenar_select("rt-motivo", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);

        configurar_busqueda_diagnosticos("diagnostico-a-cie10");
        configurar_busqueda_diagnosticos("diagnostico-b-cie10");
        configurar_busqueda_diagnosticos("diagnostico-c-cie10");

        llenar_select("diagnostico-a-medicina-indigena", catalogos.medicina_tradicional, "Id_Cat_Medicina_Tradicional", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-b-medicina-indigena", catalogos.medicina_tradicional, "Id_Cat_Medicina_Tradicional", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-c-medicina-indigena", catalogos.medicina_tradicional, "Id_Cat_Medicina_Tradicional", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);

        llenar_select("diagnostico-a-confirmacion", catalogos_json.confirmacion_diagnostica, "Id_Cat_Confirmacion_Diagnostica", c => `${c.Clave} | ${c.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-b-confirmacion", catalogos_json.confirmacion_diagnostica, "Id_Cat_Confirmacion_Diagnostica", c => `${c.Clave} | ${c.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-c-confirmacion", catalogos_json.confirmacion_diagnostica, "Id_Cat_Confirmacion_Diagnostica", c => `${c.Clave} | ${c.Nombre}`, "Selecciona una opción", true);
        llenar_select("intervenciones-salud-mental-adicciones", catalogos_json.intervenciones_salud_mental_adicciones, "Id_Cat_Intervenciones_Salud_Mental_Adicciones", i => `${i.Clave} | ${i.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ap", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("riesgos", catalogos.riesgos, "Id_Cat_Riesgos", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-embarazo", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("plan-seguridad", catalogos_json.plan_seguridad, "Id_Cat_Plan_Seguridad", p => `${p.Clave} | ${p.Nombre}`, "Selecciona una opción", true);
        llenar_select("trimestre-gestacional", catalogos_json.trimestre_gestacional, "Id_Cat_Trimestre_Gestacional", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("complicaciones", catalogos.complicaciones, "Id_Cat_Complicaciones", c => `${c.Clave} | ${c.Nombre}`, "Selecciona una opción", true);
        llenar_select("otras-acciones", catalogos_json.otras_acciones_embarazadas, "Id_Cat_Otras_Acciones_Embarazadas", a => `${a.Clave} | ${a.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-puerperio", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ip", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("primera-vez", catalogos_json.otros_eventos, "Id_Cat_Otros_Eventos", e => `${e.Clave} | ${e.Nombre}`, "Selecciona una opción", true);
        llenar_select("subsecuente", catalogos_json.otros_eventos, "Id_Cat_Otros_Eventos", e => `${e.Clave} | ${e.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ns", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("tipo-edi", catalogos_json.edi_tipo, "Id_Cat_Edi_Tipo", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("resultado-edi", catalogos_json.resultados_edi, "Id_Cat_Resultados_Edi", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("resultado-batelle", catalogos_json.resultado_batelle, "Id_Cat_Resultado_Batelle", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-edas", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("plan-tratamiento", catalogos_json.eda_plan_tratamiento, "Id_Cat_Eda_Plan_Tratamiento", p => `${p.Clave} | ${p.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-iras", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("tipo-tratamiento-ira", catalogos_json.ira_tratamiento, "Id_Cat_Ira_Tratamiento", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-neumonia", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("aplicacion-cedula-cancer", catalogos_json.aplicacion_cedula_cancer_anio, "Id_Cat_Aplicacion_Cedula_Cancer_Anio", a => `${a.Clave} | ${a.Nombre}`, "Selecciona una opción", true);
        llenar_select("intervencion-gerontologica", catalogos.intervenciones_gerontologicas, "Id_Cat_Intervenciones_Gerontologicas", i => `${i.Clave} | ${i.Nombre}`, "Selecciona una opción", true);
        llenar_select("esquema-vacunacion", catalogos_json.esquema_vacunacion, "Id_Cat_Esquema_Vacunacion", e => `${e.Clave} | ${e.Nombre}`, "Selecciona una opcion", true);
        llenar_select("referido-por", catalogos.referido_motivo, "Id_Cat_Referido_Motivo", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("nivel", catalogos.referido_nivel, "Id_Cat_Referido_Nivel", n => `${n.Clave} | ${n.Nombre}`, "Selecciona una opción", true);
        llenar_select("especialidad", catalogos.servicios, "Id_Cat_Servicios", s => `${s.Clave} | ${s.Nombre}`, "Selecciona una opción", true);

        const teleconsulta = catalogos.teleconsulta_interpretacion || [];

        llenar_select("Teleconsulta", teleconsulta.filter(t => t.Inciso === "a"), "Id_Cat_Teleconsulta_Interpretacion", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("interpretacion-diagnostica", teleconsulta.filter(t => t.Inciso === "b"), "Id_Cat_Teleconsulta_Interpretacion", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("modalidad", catalogos_json.modalidad, "Id_Cat_Modalidad", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);

        // Nueva lógica: actualiza la edad al terminar de cargar el catálogo de claves.
        actualizar_edad();
    } catch (error) {
        console.error("Error al cargar los datos:", error);

        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje: error.message || "No fue posible cargar algunos datos. Intente nuevamente",
            boton: true
        });
    }
}

async function registrar_consulta() {
    if (!validar_edad()) return;

    const clave_edad = document.getElementById("clave-edad")
        .selectedOptions[0]?.textContent.split("|")[0].trim();

    const data = {
        paciente:{
            Sexo: document.getElementById("sexo").value,
            Es_Afromexicano: document.getElementById("afromexicano").value,
            Es_Indigena: document.getElementById("indigena").value,
            Es_Migrante: document.getElementById("migrante").value,
        },
        consultas: {
            Fecha_Consulta: document.getElementById("fecha-atencion").value,
            Unidades_Id_Unidad: Usuario.Id_Unidad,
            Prestadores_Id_Prestador: Usuario.Id_Prestador,
            Pacientes_Id_Paciente: Paciente.Id_Paciente,
            Servicios_Id_Cat_Servicios: document.getElementById("servicio").value,
            Cat_I_G_Id_Cat_Intervenciones_Gerontologicas: document.getElementById("intervencion-gerontologica").value,
            Cat_Servicio_Id_Cat_Especialidad: document.getElementById("especialidad").value,
            Cat_Referido_Nivel_Id_Cat_Referido_Nivel: document.getElementById("nivel").value,
            Cat_Referido_Motivo_Id_Cat_Referido_Motivo: document.getElementById("referido-por").value,
            Cat_Derechohabiencia_Id_Cat_Derechohabiencia: document.getElementById("derechohabiencia").value,
            Edad: document.getElementById("edad").value,
            Clave_Edad: clave_edad,
            Folio_Receta: document.getElementById("folio-receta").value,
            Primera_Vez_Uneme: document.getElementById("primera-vez-uneme").value,
            Primera_Vez_Anio_Cobertura: document.getElementById("primera-vez-anio").value,
            Contrarreferido: document.getElementById("contrarreferido").value,
            Intervencion_Salud_Mental_Adicciones: document.getElementById("intervenciones-salud-mental-adicciones").value,
            Primera_Vez: document.getElementById("primera-vez").value,
            Subsecuente: document.getElementById("subsecuente").value,
            RT_Por_Motivo: document.getElementById("rt-motivo").value,
            Fecha_Proxima_Cita: document.getElementById("fecha-proxima-consulta").value,
        },
        mediciones:
        {
            Peso: document.getElementById("peso").value,
            Talla: document.getElementById("talla").value,
            Circunferencia_Cintura: document.getElementById("circunferencia-cintura").value,
            Presion_Sistolica: document.getElementById("presion-sistolica").value,
            Presion_Diastolica: document.getElementById("presion-diastolica").value,
            Frecuencia_Cardiaca: document.getElementById("frecuencia-cardiaca").value,
            Frecuencia_Respiratoria: document.getElementById("frecuencia-respiratoria").value,
            Temperatura: document.getElementById("temperatura").value,
            Saturacion_Oxigeno: document.getElementById("saturacion-oxigeno").value,
            Resultado_Glucosa: document.getElementById("resultado-glucosa").value,
            Glucosa_Ayuno: document.getElementById("glucosa-ayuno").value,
            Numero_Tiras: document.getElementById("tiras-embarazadas").value,
            Probable_Tb: document.getElementById("probable-tuberculosis").value,
        },
        discapacidad:
        {
            discapacidad: {Cat_Discapacidades_Id_Discapacidad: document.getElementById("discapacidad-a").value},
            dificultad: {Cat_Discapacidades_Id_Discapacidad_B: document.getElementById("discapacidad-b").value},
            motivo: {Cat_Discapacidades_Id_Discapacidad_C: document.getElementById("discapacidad-c").value},
        },
diagnosticos: [
    {
        Cat_Diagnosticos_Id_Cat_Diagnosticos: document.getElementById("diagnostico-a-cie10-id").value,
        Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: document.getElementById("diagnostico-a-medicina-indigena").value,
        Confirmacion_Diagnostica: document.getElementById("diagnostico-a-confirmacion").value
    },
    {
        Cat_Diagnosticos_Id_Cat_Diagnosticos: document.getElementById("diagnostico-b-cie10-id").value,
        Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: document.getElementById("diagnostico-b-medicina-indigena").value,
        Confirmacion_Diagnostica: document.getElementById("diagnostico-b-confirmacion").value
    },
    {
        Cat_Diagnosticos_Id_Cat_Diagnosticos: document.getElementById("diagnostico-c-cie10-id").value,
        Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: document.getElementById("diagnostico-c-medicina-indigena").value,
        Confirmacion_Diagnostica: document.getElementById("diagnostico-c-confirmacion").value
    }
],
        salud_reproductiva:
        {
            RT_Pregestacional: document.getElementById("rt-ap").value,
            Cat_Riesgos_Id_Cat_Riesgos: document.getElementById("riesgos").value,
            RT_Embarazo: document.getElementById("rt-embarazo").value,
            Plan_Seguridad: document.getElementById("plan-seguridad").value,
            Trimestre_Gestacional: document.getElementById("trimestre-gestacional").value,
            Cat_Complicaciones_Id_Cat_Complicaciones: document.getElementById("complicaciones").value,
            Alto_Riesgo_Primera_Vez: document.getElementById("riesgo-primera-vez").value,
            Otras_Acciones: document.getElementById("otras-acciones").value,
            RT_Puerperio: document.getElementById("rt-puerperio").value,
            RT_Infeccion_Puerperial: document.getElementById("rt-ip").value,
            Terapia_Hormonal: document.getElementById("terapia-hormonal").value,
        },
        salud_nino_adolescente:
        {
            Resultado_Batelle: document.getElementById("resultado-batelle").value,
            RT_Nino_Sano: document.getElementById("rt-ns").value,
            Tipo: document.getElementById("tipo-edi").value,
            Resultado: document.getElementById("resultado-edi").value,
            RT_EDA: document.getElementById("rt-edas").value,
            Plan_Tratamiento: document.getElementById("plan-tratamiento").value,
            Recuperado: document.getElementById("recuperado").value,
            Sobres_VSO: document.getElementById("sobres-vso").value,
            RT_IRA: document.getElementById("rt-iras").value,
            Tipo_Tratamiento: document.getElementById("tipo-tratamiento-ira").value,
            RT_Neumonia: document.getElementById("rt-neumonia").value,
            Aplicacion_Cedula_Cancer: document.getElementById("aplicacion-cedula-cancer").value,
            Madre_INF_PA: document.getElementById("madre-inf-prevencion").value,
        },
        promocion_salud:
        {
            Consulta_Integrada_Linea_Vida: document.getElementById("consulta-linea-vida").value,
            Presenta_Cartilla: document.getElementById("presenta-cartilla").value,
            Esquema_Vacunacion: document.getElementById("esquema-vacunacion").value,
            Promocion_Albendazol: document.getElementById("entrega-albendazol").value,
            Sobres_VSO: document.getElementById("sobres-vso-promocion").value
        },
        teleconsulta:
        {
            Unidad_Consultante: document.getElementById("unidad-consultante").value,
            Modalidad: document.getElementById("modalidad").value,
            Cat_Teleconsulta_Interpretacion_Id_Teleconsulta: document.getElementById("Teleconsulta").value,
            Cat_Teleconsulta_Interpretacion_Id_Interpretacion_Diagnostica: document.getElementById("interpretacion-diagnostica").value
        }
    };
    console.log(data);
}

const boton_registrar = document.getElementById("guardar-datos");
boton_registrar.addEventListener("click", async () => {
    await registrar_consulta();
});