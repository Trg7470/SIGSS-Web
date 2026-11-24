import {
    llenar_select,
    verificar_nulo,
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";
const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

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
    document.getElementById("titulo-bienvenida").textContent = `Detecciones`;
    document.getElementById("descripcion-bienvenida").textContent = `Módulo de registro de detecciones.`;
    seleccionar_paciente();
});

let Paciente;

function seleccionar_paciente() {
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
                        mensaje: "No se encontró ningún paciente con esos datos. Puedes registrar al paciente en el módulo de pacientes o pedir ayuda al personal administrativo.",
                        boton: true
                    });
                    return false;
                }

                if (!result.ok || response.success === false) {
                    throw new Error(response.message || mensaje_por_estado(result.status));
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
                    mensaje: es_error_de_red(error)
                        ? MENSAJE_SIN_CONEXION
                        : (error.message || "No fue posible buscar al paciente. Inténtalo nuevamente."),
                    boton: true
                });

                return false;
            }
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
            edad: Math.round((consulta - nacimiento) / 86400000),
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
    const estaba_bloqueado = campo_edad.readOnly;

    const desbloquear_para_captura_manual = () => {
        campo_edad.readOnly = false;
        campo_clave.disabled = false;
        // Solo se borra lo que el propio cálculo automático había puesto;
        // si el usuario ya estaba capturando a mano, se respeta lo que escribió.
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
            const mensaje = await obtener_mensaje_error(response, "No fue posible obtener la lista de catálogos.");
            mostrarPopup({
                titulo: "Error al cargar los catálogos",
                mensaje,
                tipo: "error",
                boton: true
            });
            return false;
        }

        const result = await response.json();
        const catalogos = result.catalogos;

        const response_j = await fetch("http://localhost:3000/api/data/catalogos.json");

        if (!response_j.ok) {
            const mensaje = await obtener_mensaje_error(response_j, "No fue posible cargar los catálogos estáticos.");
            throw new Error(mensaje);
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

        llenar_select("its-grupo-poblacional", catalogos.grupos_its, "Id_Cat_Grupos_Its", g => `${g.Clave} | ${g.Nombre}`, "Selecciona una opción", true);

        const resultados_its = catalogos.resultados_its || [];
        ["its-resultado-b24x", "its-resultado-a539", "its-resultado-gonorrea", "its-resultado-hepatitis-b", "its-resultado-herpes", "its-resultado-chlamydia", "its-resultado-vph"]
            .forEach(id => llenar_select(id, resultados_its, "Id_Cat_Resultados_ITS", r => `${r.Clave} | ${r.Nombre}`, "Selecciona una opción", true));

        llenar_select("espirometria-resultado", catalogos.espirometria_resultados, "Id_Cat_Espirometria_Resultados", e => `${e.Clave} | ${e.Nombre}`, "Selecciona una opción", true);

        // Nueva lógica: actualiza la edad al terminar de cargar el catálogo de claves.
        actualizar_edad();

        return true;
    } catch (error) {
        console.error("Error al cargar los datos:", error);

        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar algunos datos. Intente nuevamente"),
            boton: true
        });

        return false;
    }
}

// NOTA: registrar_consulta() se completará conforme se agreguen las
// siguientes partes del formulario (depresión/ansiedad, revaloraciones
// 60+, cardiometabólicas, consumo de sustancias, ITS, cáncer/violencia/
// Turner, hombres, TB/espirometría). Por ahora arma el payload con los
// bloques ya existentes en esta parte 1.
// El bloque ITS es "todo o nada": si se capturó algo en él, el schema exige
// el grupo poblacional y los 6 resultados (Tipo_Prueba es el único opcional,
// y solo aplica para sífilis/A539). Devuelve null si el bloque está vacío
// (no se registra), el objeto completo si está correctamente lleno, o
// lanza un mensaje de validación si está incompleto.
const CAMPOS_ITS_OBLIGATORIOS = [
    "its-grupo-poblacional",
    "its-resultado-b24x",
    "its-resultado-a539",
    "its-resultado-gonorrea",
    "its-resultado-hepatitis-b",
    "its-resultado-herpes",
    "its-resultado-chlamydia",
    "its-resultado-vph"
];

function validar_bloque_its() {
    const valores = Object.fromEntries(
        CAMPOS_ITS_OBLIGATORIOS.map(id => [id, document.getElementById(id).value])
    );
    const tipo_prueba = document.getElementById("its-tipo-prueba").value;

    const algo_capturado = Object.values(valores).some(v => v !== "") || tipo_prueba !== "";

    if (!algo_capturado) {
        return { its: null, valido: true };
    }

    const falta_algo = CAMPOS_ITS_OBLIGATORIOS.some(id => valores[id] === "");

    if (falta_algo) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Bloque de ITS incompleto",
            mensaje: "Si capturas el bloque de ITS, debes completar el grupo poblacional y los 6 resultados (VPH, Chlamydia, Herpes Genital, Hepatitis B, Gonorrea, B24X y A539).",
            boton: true
        });
        return { its: null, valido: false };
    }

    return {
        valido: true,
        its: {
            Cat_Grupos_Its_Id_Cat_Grupos_Its: valores["its-grupo-poblacional"],
            Cat_Resultados_ITS_Id_Cat_Resultados_B24X: valores["its-resultado-b24x"],
            Cat_Resultados_ITS_Id_Cat_Resultados_A539: valores["its-resultado-a539"],
            Cat_Resultados_ITS_Id_Cat_Resultados_Gonorrea: valores["its-resultado-gonorrea"],
            Cat_Resultados_ITS_Id_Cat_Resultados_HepatitisB: valores["its-resultado-hepatitis-b"],
            Cat_Resultados_ITS_Id_Cat_Resultados_Herpes_Genital: valores["its-resultado-herpes"],
            Cat_Resultados_ITS_Id_Cat_Resultados_Chlamydia: valores["its-resultado-chlamydia"],
            Cat_Resultados_ITS_Id_Cat_Resultados_VPH: valores["its-resultado-vph"],
            Tipo_Prueba: tipo_prueba || null
        }
    };
}

async function registrar_consulta() {
    if (!validar_edad()) return;

    const bloque_its = validar_bloque_its();
    if (!bloque_its.valido) return;

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
            Cat_Derechohabiencia_Id_Cat_Derechohabiencia: verificar_nulo("derechohabiencia"),
            Edad: document.getElementById("edad").value,
            Clave_Edad: verificar_nulo("clave-edad"),
            Folio_Receta: verificar_nulo("folio-receta"),
            Primera_Vez_Anio_Cobertura: verificar_nulo("primera-vez-anio"),
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
            Glucosa_Ayuno: verificar_nulo("glucosa-ayuno"),
        },
        discapacidad: {
            discapacidad: { Cat_Discapacidades_Id_Discapacidad: verificar_nulo("discapacidad-a") },
            dificultad: { Cat_Discapacidades_Id_Discapacidad_B: verificar_nulo("discapacidad-b") },
            motivo: { Cat_Discapacidades_Id_Discapacidad_C: verificar_nulo("discapacidad-c") },
        },
        promocion_salud: {
            Presenta_Cartilla: verificar_nulo("presenta-cartilla"),
        },
        // Campos directos de Consulta_Detecciones (partes 1 y 2).
        // Los de las siguientes partes (cardiometabólicas, consumo, ITS,
        // cáncer/violencia/Turner, hombres, TB/espirometría) se añadirán
        // aquí mismo más adelante.
        detecciones: {
            Tiras_Utilizadas: verificar_nulo("tiras-utilizadas"),
            Prueba_Rapida_HCG: verificar_nulo("prueba-rapida-hcg"),
            Esta_Embarazada: verificar_nulo("esta-embarazada"),
            Frecuentemente_Triste: verificar_nulo("frecuentemente-triste"),
            Depresion: verificar_nulo("depresion"),
            Ansiedad: verificar_nulo("ansiedad"),
            Riesgo_Fracturas_Osteoporosis: verificar_nulo("riesgo-fracturas-osteoporosis"),
            Exploracion_Cancer_Mama: verificar_nulo("exploracion-cancer-mama"),
            Violencia_Sexual: verificar_nulo("violencia-sexual"),
            Violencia_Mujeres_15_Anos: verificar_nulo("violencia-mujeres-15"),
            Sindrome_Turner: verificar_nulo("sindrome-turner"),
            Hiperplasia_Prostatica: verificar_nulo("hiperplasia-prostatica"),
            Reactivos_Antigeno_Prostatico: verificar_nulo("reactivos-antigeno-prostatico"),
            Probable_TB_Estudio: verificar_nulo("probable-tb-estudio"),
            Cancer_Cervicouterino_Realizado: verificar_nulo("cancer-cervicouterino-realizado"),
            Cancer_Cervicouterino_Resultado: verificar_nulo("cancer-cervicouterino-resultado"),
            Espirometria_VEF1: verificar_nulo("espirometria-vef1"),
            Espirometria_CVF: verificar_nulo("espirometria-cvf"),
            Espirometria_LIN: verificar_nulo("espirometria-lin"),
            Cat_Espirometria_Resultados_Id_Cat_Espirometria_Resultados: verificar_nulo("espirometria-resultado"),
        },
        // Bloque opcional "Detecciones y Revaloraciones 60+": solo se envía
        // si el prestador capturó al menos un dato de este bloque; el
        // servicio decide con Utils.tiene_datos() si lo registra o no.
        detecciones_revaloraciones: {
            Ha_Olvidado: verificar_nulo("ha-olvidado"),
            Alteracion_Memoria: verificar_nulo("alteracion-memoria"),
            Demencia: verificar_nulo("demencia"),
            Fuga_Orina: verificar_nulo("fuga-orina"),
            Incontinencia_Urinaria: verificar_nulo("incontinencia-urinaria"),
            Tiene_Caidas: verificar_nulo("tiene-caidas"),
            Sindrome_Caidas: verificar_nulo("sindrome-caidas"),
            Estabilidad_Marcha: verificar_nulo("estabilidad-marcha"),
            Estado_Nutricion: verificar_nulo("estado-nutricion"),
            Actividades_Basicas: verificar_nulo("actividades-basicas"),
            Evaluacion_ABVD: verificar_nulo("evaluacion-abvd"),
            Actividades_Instrumentales: verificar_nulo("actividades-instrumentales"),
            Evaluacion_AIVD: verificar_nulo("evaluacion-aivd"),
            Sobrecarga_Cuidador: verificar_nulo("sobrecarga-cuidador"),
            Grupo_Edad: verificar_nulo("cuidador-grupo-edad"),
            Sexo: verificar_nulo("cuidador-sexo"),
            Resultado: verificar_nulo("cuidador-resultado"),
        },
        // Bloque opcional "Enfermedades Cardiometabólicas" (20 años y más).
        enfermedades_cardiometabolicas: {
            Diabetes_Mellitus: verificar_nulo("cardio-diabetes"),
            Hipertension_Arterial_Sistemica: verificar_nulo("cardio-hipertension"),
            Obesidad: verificar_nulo("cardio-obesidad"),
            Dislipidemias: verificar_nulo("cardio-dislipidemias"),
            Enfermedad_Renal_Cronica: verificar_nulo("cardio-renal-cronica"),
        },
        // Bloque opcional "Consumo de Sustancias Psicoactivas".
        consumo_sustancias_psicoactivas: {
            Alcohol: verificar_nulo("consumo-alcohol"),
            Tabaco: verificar_nulo("consumo-tabaco"),
            Cannabis: verificar_nulo("consumo-cannabis"),
            Cocaina: verificar_nulo("consumo-cocaina"),
            Metanfetaminas: verificar_nulo("consumo-metanfetaminas"),
            Inhalables: verificar_nulo("consumo-inhalables"),
            Opiaceos: verificar_nulo("consumo-opiaceos"),
            Alucinogenos: verificar_nulo("consumo-alucinogenos"),
            Tranquilizantes: verificar_nulo("consumo-tranquilizantes"),
            Otras_Sustancias: verificar_nulo("consumo-otras-sustancias"),
        },
        // Bloque opcional "ITS" (todo o nada; null si no se capturó nada).
        its: bloque_its.its
    };
    console.log(data);

    try {
        const response = await fetch("http://localhost:3000/api/modules/detecciones/registrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const resultado = await response.json();

        mostrarPopup({
            tipo: "exito",
            titulo: "Detección registrada",
            mensaje: "La detección se registró correctamente. Redirigiendo al dashboard...",
            boton: true,
            redireccion: "/pages/dashboard/dashboard.html"
        });
    } catch (error) {
        console.error("Error al registrar detección:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error de registro",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible registrar la detección."),
            boton: true
        });
    }
}

const boton_registrar = document.getElementById("guardar-datos");
boton_registrar.addEventListener("click", async () => {
    if (boton_registrar.disabled) return;

    boton_registrar.disabled = true;

    try {
        // Validar edad.
        if (!validar_edad()) return;

        // Validar bloque ITS (todo o nada).
        if (!validar_bloque_its().valido) return;

        // Mostrar confirmación.
        const confirmar = await mostrarPopup({
            tipo: "advertencia",
            titulo: "Confirmar registro de detección",
            mensaje:
                `¿Estás seguro de registrar esta detección?\n\n` +
                `Paciente: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno}\n` +
                `CURP: ${Paciente.Curp}\n` +
                `Expediente: ${Paciente.Expediente}\n` +
                `Fecha de atención: ${document.getElementById("fecha-atencion").value}\n\n` +
                `Verifique que la información capturada sea correcta.`,
            confirmar: true,
            textoConfirmar: "Registrar",
            textoCancelar: "Cancelar"
        });

        // Si cancela, no continúa.
        if (!confirmar) return;

        mostrarPopup({
            tipo: "carga",
            titulo: "Registrando detección",
            mensaje: "Por favor espera mientras se registra la detección.",
            boton: false
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula un retraso para mostrar el popup de carga.
        await registrar_consulta();

    } catch (error) {
        console.error("Error al registrar detección:", error);

        mostrarPopup({
            tipo: "error",
            titulo: "Error de registro",
            mensaje: error.message || "No fue posible registrar la detección.",
            boton: true
        });

    } finally {
        boton_registrar.disabled = false;
    }
});