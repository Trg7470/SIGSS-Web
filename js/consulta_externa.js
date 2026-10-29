import { llenar_select, verificar_nulo } from "./utils.js";

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
        paciente: {
            Sexo: verificar_nulo("sexo"),
            Es_Afromexicano: verificar_nulo("afromexicano"),
            Es_Indigena: verificar_nulo("indigena"),
            Es_Migrante: verificar_nulo("migrante"),
        },
        consultas: {
            Fecha_Consulta: document.getElementById("fecha-atencion").value,
            Unidades_Id_Unidad: Usuario.Id_Unidad,
            Prestadores_Id_Prestador: Usuario.Id_Prestador,
            Pacientes_Id_Paciente: Paciente.Id_Paciente,
            Servicios_Id_Cat_Servicios: verificar_nulo("servicio"),
            Cat_I_G_Id_Cat_Intervenciones_Gerontologicas: verificar_nulo("intervencion-gerontologica"),
            Cat_Servicio_Id_Cat_Especialidad: verificar_nulo("especialidad"),
            Cat_Referido_Nivel_Id_Cat_Referido_Nivel: verificar_nulo("nivel"),
            Cat_Referido_Motivo_Id_Cat_Referido_Motivo: verificar_nulo("referido-por"),
            Cat_Derechohabiencia_Id_Cat_Derechohabiencia: verificar_nulo("derechohabiencia"),
            Edad: document.getElementById("edad").value,
            Clave_Edad: clave_edad,
            Folio_Receta: verificar_nulo("folio-receta"),
            Primera_Vez_Uneme: verificar_nulo("primera-vez-uneme"),
            Primera_Vez_Anio_Cobertura: verificar_nulo("primera-vez-anio"),
            Contrarreferido: verificar_nulo("contrarreferido"),
            Intervencion_Salud_Mental_Adicciones: verificar_nulo("intervenciones-salud-mental-adicciones"),
            Primera_Vez: verificar_nulo("primera-vez"),
            Subsecuente: verificar_nulo("subsecuente"),
            RT_Por_Motivo: verificar_nulo("rt-motivo"),
            Fecha_Proxima_Cita: verificar_nulo("fecha-proxima-consulta"),
        },
        mediciones: {
            Peso: verificar_nulo("peso"),
            Talla: verificar_nulo("talla"),
            Circunferencia_Cintura: verificar_nulo("circunferencia-cintura"),
            Presion_Sistolica: verificar_nulo("presion-sistolica"),
            Presion_Diastolica: verificar_nulo("presion-diastolica"),
            Frecuencia_Cardiaca: verificar_nulo("frecuencia-cardiaca"),
            Frecuencia_Respiratoria: verificar_nulo("frecuencia-respiratoria"),
            Temperatura: verificar_nulo("temperatura"),
            Saturacion_Oxigeno: verificar_nulo("saturacion-oxigeno"),
            Glucosa: verificar_nulo("glucosa"),
            Resultado_Glucosa: verificar_nulo("resultado-glucosa"),
            Glucosa_Ayuno: verificar_nulo("glucosa-ayuno"),
            Numero_Tiras: verificar_nulo("tiras-embarazadas"),
            Probable_Tb: verificar_nulo("probable-tuberculosis"),
        },
        discapacidad: {
            discapacidad: { Cat_Discapacidades_Id_Discapacidad: verificar_nulo("discapacidad-a") },
            dificultad: { Cat_Discapacidades_Id_Discapacidad_B: verificar_nulo("discapacidad-b") },
            motivo: { Cat_Discapacidades_Id_Discapacidad_C: verificar_nulo("discapacidad-c") },
        },
        diagnosticos: [
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-a-cie10-id"),
                Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: verificar_nulo("diagnostico-a-medicina-indigena"),
                Confirmacion_Diagnostica: verificar_nulo("diagnostico-a-confirmacion")
            },
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-b-cie10-id"),
                Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: verificar_nulo("diagnostico-b-medicina-indigena"),
                Confirmacion_Diagnostica: verificar_nulo("diagnostico-b-confirmacion")
            },
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-c-cie10-id"),
                Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: verificar_nulo("diagnostico-c-medicina-indigena"),
                Confirmacion_Diagnostica: verificar_nulo("diagnostico-c-confirmacion")
            }
        ],
        salud_reproductiva: {
            RT_Pregestacional: verificar_nulo("rt-ap"),
            Cat_Riesgos_Id_Cat_Riesgos: verificar_nulo("riesgos"),
            RT_Embarazo: verificar_nulo("rt-embarazo"),
            Plan_Seguridad: verificar_nulo("plan-seguridad"),
            Trimestre_Gestacional: verificar_nulo("trimestre-gestacional"),
            Cat_Complicaciones_Id_Cat_Complicaciones: verificar_nulo("complicaciones"),
            Alto_Riesgo_Primera_Vez: verificar_nulo("riesgo-primera-vez"),
            Otras_Acciones: verificar_nulo("otras-acciones"),
            RT_Puerperio: verificar_nulo("rt-puerperio"),
            RT_Infeccion_Puerperial: verificar_nulo("rt-ip"),
            Terapia_Hormonal: verificar_nulo("terapia-hormonal"),
        },
        salud_nino_adolescente: {
            Resultado_Batelle: verificar_nulo("resultado-batelle"),
            RT_Nino_Sano: verificar_nulo("rt-ns"),
            Tipo: verificar_nulo("tipo-edi"),
            Resultado: verificar_nulo("resultado-edi"),
            RT_EDA: verificar_nulo("rt-edas"),
            Plan_Tratamiento: verificar_nulo("plan-tratamiento"),
            Recuperado: verificar_nulo("recuperado"),
            Sobres_VSO: verificar_nulo("sobres-vso"),
            RT_IRA: verificar_nulo("rt-iras"),
            Tipo_Tratamiento: verificar_nulo("tipo-tratamiento-ira"),
            RT_Neumonia: verificar_nulo("rt-neumonia"),
            Aplicacion_Cedula_Cancer: verificar_nulo("aplicacion-cedula-cancer"),
            Madre_INF_PA: verificar_nulo("madre-inf-prevencion"),
        },
        promocion_salud: {
            Consulta_Integrada_Linea_Vida: verificar_nulo("consulta-linea-vida"),
            Presenta_Cartilla: verificar_nulo("presenta-cartilla"),
            Esquema_Vacunacion: verificar_nulo("esquema-vacunacion"),
            Promocion_Albendazol: verificar_nulo("entrega-albendazol"),
            Sobres_VSO: verificar_nulo("sobres-vso-promocion")
        },
        teleconsulta: {
            Unidad_Consultante: verificar_nulo("unidad-consultante"),
            Modalidad: verificar_nulo("modalidad"),
            Cat_Teleconsulta_Interpretacion_Id_Teleconsulta: verificar_nulo("Teleconsulta"),
            Cat_Teleconsulta_Interpretacion_Id_Interpretacion_Diagnostica: verificar_nulo("interpretacion-diagnostica")
        }
    };
    console.log(data);
}

const boton_registrar = document.getElementById("guardar-datos");
boton_registrar.addEventListener("click", async () => {
    await registrar_consulta();
});