import { llenar_select, verificar_nulo } from "./utils.js";
const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

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
    document.getElementById("titulo-bienvenida").textContent = `Planificación familiar`;
    document.getElementById("descripcion-bienvenida").textContent = `Módulo de registro de consultas y atenciones de planificación familiar.`;
    seleccionar_paciente(Usuario);
});

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
            const curp = (datos.curp || "").trim().toUpperCase();
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

                const datos_cargados = await cargar_datos();

                if (!datos_cargados) {
                    return false;
                }

                mostrarPopup({
                    tipo: "exito",
                    titulo: "Paciente encontrado",
                    mensaje: `Nombre: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno} | CURP: ${Paciente.Curp} | Expediente: ${Paciente.Expediente}`,
                    boton: true
                });
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

    let solicitud_actual = 0;
    let temporizador = null;

    input.addEventListener("input", () => {
        hidden.value = "";

        if (temporizador) clearTimeout(temporizador);

        const nombre = input.value.trim();

        if (nombre.length < 2) {
            resultados.style.display = "none";
            resultados.replaceChildren();
            return;
        }

        temporizador = setTimeout(() => buscar_diagnostico(nombre), 300);
    });

    async function buscar_diagnostico(nombre) {
        const mi_solicitud = ++solicitud_actual;

        try {
            const response = await fetch(
                `http://localhost:3000/api/catalogos/diagnosticos/buscar?nombre=${encodeURIComponent(nombre)}`
            );

            const data = await response.json();

            if (mi_solicitud !== solicitud_actual) return; // llegó una búsqueda más reciente, se descarta esta

            if (!response.ok) {
                throw new Error(data.message || "Error al buscar diagnósticos.");
            }

            resultados.replaceChildren();

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
            if (mi_solicitud !== solicitud_actual) return;
            console.error("Error al buscar diagnósticos:", error);
            resultados.style.display = "none";
        }
    }

    document.addEventListener("click", event => {
        if (!input.contains(event.target) && !resultados.contains(event.target)) {
            resultados.style.display = "none";
        }
    });
}

// Obtiene la fecha de nacimiento de la CURP.
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

// Calcula la edad completa a la fecha de consulta.
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
            edad: Math.round((consulta - nacimiento) / 86400000),
            clave: "D"
        };
    }

    return meses < 12
        ? { edad: meses, clave: "M" }
        : { edad: Math.floor(meses / 12), clave: "A" };
}

// Rellena los campos de edad automáticamente o permite capturarlos manualmente.
function actualizar_edad() {
    const campo_edad = document.getElementById("edad");
    const campo_clave = document.getElementById("clave-edad");
    const fecha_consulta = document.getElementById("fecha-atencion").value;
    const curp = (Paciente?.Curp || "").trim();
    const estaba_bloqueado = campo_edad.readOnly;

    const desbloquear_para_captura_manual = () => {
        campo_edad.readOnly = false;
        campo_clave.disabled = false;
        if (estaba_bloqueado) {
            campo_edad.value = "";
            campo_clave.value = "";
        }
    };

    if (!curp) {
        desbloquear_para_captura_manual();
        return;
    }

    const nacimiento = obtener_fecha_nacimiento_curp(curp);
    const resultado = nacimiento
        ? calcular_edad(nacimiento, fecha_consulta)
        : null;

    if (!resultado) {
        desbloquear_para_captura_manual();
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

// Valida la edad antes de registrar la consulta.
function validar_edad() {
    const campo_edad = document.getElementById("edad");
    const campo_clave = document.getElementById("clave-edad");
    const curp = (Paciente?.Curp || "").trim();

    if (curp) {
        const nacimiento = obtener_fecha_nacimiento_curp(curp);
        const resultado = nacimiento
            ? calcular_edad(nacimiento, document.getElementById("fecha-atencion").value)
            : null;

        if (resultado) {
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
        // La CURP no permite calcular la edad (genérica, extranjera, fecha
        // de consulta anterior al nacimiento, etc.): se permite capturarla
        // a mano en vez de bloquear el registro.
    }

    const edad = campo_edad.value.trim();
    const clave = campo_clave.selectedOptions[0]?.textContent.trim().split("|")[0].trim();

    if (
        edad === "" ||
        !/^\d{1,3}$/.test(edad) ||
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
        // Identificación de unidad y prestador: se autollenan con el perfil
        // de la sesión (Usuario), igual que en consulta externa.
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
            return false;
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

        const discapacidades = catalogos.discapacidades || [];

        llenar_select("discapacidad-a", discapacidades.filter(d => d.Inciso === "a"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-b", discapacidades.filter(d => d.Inciso === "b"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-c", discapacidades.filter(d => d.Inciso === "c"), "Id_Cat_Discapacidad", d => `${d.Clave} | ${d.Nombre}`, "Selecciona una opción", true);

        llenar_select("rt-motivo", catalogos_json.rt, "Id_Cat_Rt", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);

        configurar_busqueda_diagnosticos("diagnostico-a-cie10");
        configurar_busqueda_diagnosticos("diagnostico-b-cie10");
        configurar_busqueda_diagnosticos("diagnostico-c-cie10");

        // Implante subdérmico: catálogo Cat_Implante_Subdermico (Id, Nombre,
        // Clave 0/1, Inciso a/b). Una sola lista con las 4 combinaciones.
        const implantes = catalogos.implante_subdermico || [];

        llenar_select("implante-subdermico", implantes, "Id_Cat_Implante_Subdermico", i => `${i.Clave} | ${i.Nombre} (${i.Inciso})`, "Selecciona una opción", true);

        llenar_select("referido-por", catalogos.referido_motivo, "Id_Cat_Referido_Motivo", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true);
        llenar_select("nivel", catalogos.referido_nivel, "Id_Cat_Referido_Nivel", n => `${n.Clave} | ${n.Nombre}`, "Selecciona una opción", true);
        llenar_select("especialidad", catalogos.servicios, "Id_Cat_Servicios", s => `${s.Clave} | ${s.Nombre}`, "Selecciona una opción", true);

        const teleconsulta = catalogos.teleconsulta_interpretacion || [];

        llenar_select("teleconsulta-a", teleconsulta.filter(t => t.Inciso === "a"), "Id_Cat_Teleconsulta_Interpretacion", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("interpretacion-diagnostica", teleconsulta.filter(t => t.Inciso === "b"), "Id_Cat_Teleconsulta_Interpretacion", t => `${t.Clave} | ${t.Nombre}`, "Selecciona una opción", true);
        llenar_select("modalidad", catalogos_json.modalidad, "Id_Cat_Modalidad", m => `${m.Clave} | ${m.Nombre}`, "Selecciona una opción", true);

        llenar_select("esquema-vacunacion", catalogos_json.esquema_vacunacion, "Id_Cat_Esquema_Vacunacion", e => `${e.Clave} | ${e.Nombre}`, "Selecciona una opción", true);

        // Actualiza la edad al terminar de cargar el catálogo de claves.
        actualizar_edad();

        return true;
    } catch (error) {
        console.error("Error al cargar los datos:", error);

        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje: error.message || "No fue posible cargar algunos datos. Intente nuevamente",
            boton: true
        });

        return false;
    }
}

function diagnostico_pendiente_de_seleccionar(id) {
    const texto = document.getElementById(id).value.trim();
    const seleccionado = document.getElementById(`${id}-id`).value;
    return texto !== "" && !seleccionado;
}

async function registrar_consulta() {
    if (!validar_edad()) return;

    const diagnosticos_sin_elegir = ["diagnostico-a-cie10", "diagnostico-b-cie10", "diagnostico-c-cie10"]
        .filter(diagnostico_pendiente_de_seleccionar);

    if (diagnosticos_sin_elegir.length > 0) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Diagnóstico sin confirmar",
            mensaje: "Elige el diagnóstico de la lista de resultados antes de guardar.",
            boton: true
        });
        return;
    }

    const clave_edad = document.getElementById("clave-edad")
        .selectedOptions[0]?.textContent.split("|")[0].trim();

    const data = {
        usuario: {
            Id_Usuario: Usuario.Id_Usuario,
        },
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
            Cat_Servicio_Id_Cat_Servicio: verificar_nulo("servicio"),
            Cat_I_G_Id_Cat_Intervenciones_Gerontologicas: null,
            Cat_Servicio_Id_Cat_Especialidad: verificar_nulo("especialidad"),
            Cat_Referido_Nivel_Id_Cat_Referido_Nivel: verificar_nulo("nivel"),
            Cat_Referido_Motivo_Id_Cat_Referido_Motivo: verificar_nulo("referido-por"),
            Cat_Derechohabiencia_Id_Cat_Derechohabiencia: verificar_nulo("derechohabiencia"),
            Edad: document.getElementById("edad").value,
            Clave_Edad: verificar_nulo("clave-edad"),
            Folio_Receta: verificar_nulo("folio-receta"),
            Primera_Vez_Uneme: null,
            Primera_Vez_Anio_Cobertura: verificar_nulo("primera-vez-anio"),
            Contrarreferido: verificar_nulo("contrarreferido"),
            Intervencion_Salud_Mental_Adicciones: null,
            Primera_Vez: null,
            Subsecuente: null,
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
            Resultado_Glucosa: null,
            Glucosa_Ayuno: verificar_nulo("glucosa-ayuno"),
            Numero_Tiras: null,
            Probable_Tb: null,
        },
        discapacidad: {
            discapacidad: { Cat_Discapacidades_Id_Discapacidad: verificar_nulo("discapacidad-a") },
            dificultad: { Cat_Discapacidades_Id_Discapacidad_B: verificar_nulo("discapacidad-b") },
            motivo: { Cat_Discapacidades_Id_Discapacidad_C: verificar_nulo("discapacidad-c") },
        },
        diagnosticos: [
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-a-cie10-id"),
                Primera_Vez: null
            },
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-b-cie10-id"),
                Primera_Vez: verificar_nulo("diagnostico-b-primera-vez")
            },
            {
                Cat_Diagnosticos_Id_Cat_Diagnosticos: verificar_nulo("diagnostico-c-cie10-id"),
                Primera_Vez: verificar_nulo("diagnostico-c-primera-vez")
            }
        ],
        // PENDIENTE: falta la tabla para los datos propios de Planificación
        // Familiar (puérpera aceptante, métodos entregados, implante
        // subdérmico, anticoncepción de emergencia, alta por azoospermia).
        // No existe todavía en esquema_SIGSS_MySQL.sql — ver aviso en el chat.
        planificacion_familiar: {
            Puerpera_Aceptante: verificar_nulo("puerpera-aceptante"),
            Anticoncepcion_Emergencia: verificar_nulo("anticoncepcion-emergencia"),
            Alta_Azoospermia: verificar_nulo("alta-azoospermia"),
            Metodo_Oral: verificar_nulo("metodo-oral"),
            Metodo_Inyectable_Mensual: verificar_nulo("metodo-inyectable-mensual"),
            Metodo_Inyectable_Bimestral: verificar_nulo("metodo-inyectable-bimestral"),
            Metodo_Inyectable_Trimestral: verificar_nulo("metodo-inyectable-trimestral"),
            Cat_Implante_Subdermico_Id_Cat_Implante_Subdermico: verificar_nulo("implante-subdermico"),
            Metodo_Parche_Dermico: verificar_nulo("metodo-parche-dermico"),
            Metodo_DIU: verificar_nulo("metodo-diu"),
            Metodo_DIU_Medicado: verificar_nulo("metodo-diu-medicado"),
            Metodo_Quirurgico: verificar_nulo("metodo-quirurgico"),
            Metodo_Preservativo: verificar_nulo("metodo-preservativo"),
            Metodo_Preservativo_Femenino: verificar_nulo("metodo-preservativo-femenino"),
            Metodo_Otro: verificar_nulo("metodo-otro"),
        },
        orientacion_consejeria: {
            Planificacion_Familiar: verificar_nulo("orientacion-planificacion-familiar"),
            Prevencion_ITS: verificar_nulo("orientacion-prevencion-its"),
            Prevencion_Embarazo: verificar_nulo("orientacion-prevencion-embarazo"),
            Otras_Atenciones_SSRA: verificar_nulo("orientacion-otras-ssra"),
        },
        promocion_salud: {
            Consulta_Integrada_Linea_Vida: verificar_nulo("consulta-linea-vida"),
            Presenta_Cartilla: verificar_nulo("presenta-cartilla"),
            Esquema_Vacunacion: verificar_nulo("esquema-vacunacion"),
            Promocion_Albendazol: null,
            Sobres_VSO: null
        },
        teleconsulta: {
            Unidad_Consultante: verificar_nulo("unidad-consultante"),
            Modalidad: verificar_nulo("modalidad"),
            Cat_Teleconsulta_Interpretacion_Id_Teleconsulta: verificar_nulo("teleconsulta-a"),
            Cat_Teleconsulta_Interpretacion_Id_Interpretacion_Diagnostica: verificar_nulo("interpretacion-diagnostica")
        }
    };
    console.log(data);

    try {
        const response = await fetch("http://localhost:3000/api/modules/planificacion-familiar/registrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            mostrarPopup({
                tipo: "exito",
                titulo: "Consulta registrada",
                mensaje: "La consulta se registró correctamente.",
                boton: true
            });
        }
    } catch (error) {
        console.error("Error al registrar consulta:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error de registro",
            mensaje: error.message || "No fue posible registrar la consulta.",
            boton: true
        });
    }
}

const boton_registrar = document.getElementById("guardar-datos");
boton_registrar.addEventListener("click", async () => {
    if (boton_registrar.disabled) return;

    boton_registrar.disabled = true;

    try {
        if (!validar_edad()) return;

        const diagnosticos_sin_elegir = [
            "diagnostico-a-cie10",
            "diagnostico-b-cie10",
            "diagnostico-c-cie10"
        ].filter(diagnostico_pendiente_de_seleccionar);

        if (diagnosticos_sin_elegir.length > 0) {
            mostrarPopup({
                tipo: "advertencia",
                titulo: "Diagnóstico sin confirmar",
                mensaje: "Elige el diagnóstico de la lista de resultados antes de guardar.",
                boton: true
            });

            return;
        }

        const confirmar = await mostrarPopup({
            tipo: "advertencia",
            titulo: "Confirmar registro de consulta",
            mensaje:
                `¿Estás seguro de registrar esta consulta?\n\n` +
                `Paciente: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno}\n` +
                `CURP: ${Paciente.Curp}\n` +
                `Expediente: ${Paciente.Expediente}\n` +
                `Fecha de atención: ${document.getElementById("fecha-atencion").value}\n\n` +
                `Verifique que la información capturada sea correcta.`,
            confirmar: true,
            textoConfirmar: "Registrar",
            textoCancelar: "Cancelar"
        });

        if (!confirmar) return;

        mostrarPopup({
            tipo: "carga",
            titulo: "Registrando consulta",
            mensaje: "Por favor espera mientras se registra la consulta.",
            boton: false
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula un retraso para mostrar el popup de carga.
        await registrar_consulta();

    } catch (error) {
        console.error("Error al registrar consulta:", error);

        mostrarPopup({
            tipo: "error",
            titulo: "Error de registro",
            mensaje: error.message || "No fue posible registrar la consulta.",
            boton: true
        });

    } finally {
        boton_registrar.disabled = false;
    }
});