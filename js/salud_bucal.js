import { llenar_select, verificar_nulo } from "./utils.js";

let Usuario = null;

try {
    Usuario = JSON.parse(sessionStorage.getItem("usuario"));
} catch (_) {}

const API = "http://localhost:3000";

let catalogosCargados = false;
let enviando = false;
let Paciente;

// Servicios correspondientes a Salud Bucal.
const SERVICIOS_SALUD_BUCAL = [10, 11, 12, 31];

/* =========================================================
   1. INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    if (!Usuario) {
        mostrarPopup({
            tipo: "error",
            titulo: "Sesión no válida",
            mensaje: "No fue posible recuperar los datos del usuario.",
            boton: true
        });

        window.location.href = "../../../index.html";
        return;
    }

    document.getElementById("titulo-bienvenida").textContent =
        "Salud bucal";

    document.getElementById("descripcion-bienvenida").textContent =
        "Módulo de registro de consultas de salud bucal (hoja diaria, intramuros).";

    configurar_interacciones();
    seleccionar_paciente();
});

/* =========================================================
   2. BÚSQUEDA DE PACIENTES
   ========================================================= */

function seleccionar_paciente() {

    window.modal_manager.mostrar({

        titulo: "Seleccionar paciente",
        icono: "fas fa-hospital-user",
        texto_guardar: "Buscar paciente",
        icono_guardar: "fas fa-search",

        descripcion:
            "Busca al paciente por CURP o por nombre y apellidos.",

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
            const paterno =
                (datos.apellido_paterno || "").trim();
            const materno =
                (datos.apellido_materno || "").trim();

            const nombre_completo =
                `${nombre} ${paterno} ${materno}`.trim();

            if (
                curp === "" &&
                (!nombre || !paterno || !materno)
            ) {
                mostrarPopup({
                    tipo: "advertencia",
                    titulo: "Datos incompletos",
                    mensaje:
                        "Ingresa la CURP o el nombre completo con ambos apellidos.",
                    boton: true
                });

                return false;
            }

            try {

                const result = await fetch(
                    `${API}/api/pacientes/buscar`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            criterios: {
                                Curp: curp || null,
                                Nombre_Completo:
                                    curp ? null : nombre_completo
                            }
                        })
                    }
                );

                const response = await result.json();

                if (result.status === 404) {

                    mostrarPopup({
                        tipo: "informacion",
                        titulo: "Paciente no encontrado",
                        mensaje:
                            response.message ||
                            "No se encontró ningún paciente con esos datos.",
                        boton: true
                    });

                    return false;
                }

                if (
                    !result.ok ||
                    response.success === false
                ) {
                    throw new Error(
                        response.message ||
                        "No fue posible buscar al paciente."
                    );
                }

                Paciente = response.paciente;

                if (!Paciente) {
                    throw new Error(
                        "El servidor no devolvió los datos del paciente."
                    );
                }

                mostrarPopup({
                    tipo: "exito",
                    titulo: "Paciente encontrado",
                    mensaje:
                        `Nombre: ${Paciente.Nombre} ` +
                        `${Paciente.Apellido_Paterno} ` +
                        `${Paciente.Apellido_Materno} | ` +
                        `CURP: ${Paciente.Curp} | ` +
                        `Expediente: ${Paciente.Expediente}`,
                    boton: true
                });

                await cargar_datos();

                return true;

            } catch (error) {

                console.error(
                    "Error al buscar paciente:",
                    error
                );

                mostrarPopup({
                    tipo: "error",
                    titulo: "Error de búsqueda",
                    mensaje:
                        error.message ||
                        "No fue posible buscar al paciente.",
                    boton: true
                });

                return false;
            }
        }
    });
}

/* =========================================================
   3. BÚSQUEDA DE DIAGNÓSTICOS CIE-10
   ========================================================= */

function configurar_busqueda_diagnosticos(id) {

    const input = document.getElementById(id);

    const hidden =
        document.getElementById(`${id}-id`);

    const resultados =
        document.getElementById(`${id}-resultados`);

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
                `${API}/api/catalogos/diagnosticos/buscar?nombre=${
                    encodeURIComponent(nombre + "%")
                }`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Error al buscar diagnósticos."
                );
            }

            const diagnosticos =
                data.diagnosticos || [];

            diagnosticos.forEach(diagnostico => {

                const opcion =
                    document.createElement("button");

                opcion.type = "button";

                opcion.className =
                    "list-group-item list-group-item-action";

                opcion.textContent =
                    `${diagnostico.Clave} | ${diagnostico.Nombre}`;

                opcion.addEventListener("click", () => {

                    input.value = opcion.textContent;

                    hidden.value =
                        diagnostico.Id_Cat_Diagnosticos;

                    resultados.style.display = "none";
                    resultados.replaceChildren();
                });

                resultados.appendChild(opcion);
            });

            if (diagnosticos.length === 0) {
                resultados.textContent =
                    "No se encontraron diagnósticos.";
            }

            resultados.style.display = "block";

        } catch (error) {

            console.error(
                "Error al buscar diagnósticos:",
                error
            );

            resultados.style.display = "none";
        }
    });

    document.addEventListener("click", event => {

        if (
            !input.contains(event.target) &&
            !resultados.contains(event.target)
        ) {
            resultados.style.display = "none";
        }
    });
}

/* =========================================================
   4. CÁLCULO DE EDAD
   ========================================================= */

function obtener_fecha_nacimiento_curp(curp) {

    const coincidencia = curp?.toUpperCase().match(
        /^[A-Z]{4}(\d{2})(\d{2})(\d{2})[HM]/
    );

    if (!coincidencia) return null;

    const anio_corto = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);

    const siglo =
        /\d/.test(curp[16]) ? 1900 : 2000;

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

function calcular_edad(
    fecha_nacimiento,
    fecha_consulta
) {

    const nacimiento =
        new Date(fecha_nacimiento);

    const consulta =
        new Date(`${fecha_consulta}T00:00:00`);

    if (
        !fecha_consulta ||
        Number.isNaN(consulta.getTime()) ||
        nacimiento > consulta
    ) {
        return null;
    }

    let meses =
        (consulta.getFullYear() -
            nacimiento.getFullYear()) * 12 +
        consulta.getMonth() -
        nacimiento.getMonth();

    if (
        consulta.getDate() <
        nacimiento.getDate()
    ) {
        meses--;
    }

    if (meses < 0) return null;

    if (meses === 0) {

        return {
            edad: Math.floor(
                (consulta - nacimiento) / 86400000
            ),
            clave: "D"
        };
    }

    return meses < 12
        ? {
            edad: meses,
            clave: "M"
        }
        : {
            edad: Math.floor(meses / 12),
            clave: "A"
        };
}

function obtener_nacimiento_paciente() {

    if (Paciente?.Fecha_Nacimiento) {

        return new Date(
            `${String(Paciente.Fecha_Nacimiento).slice(0, 10)}T00:00:00`
        );
    }

    return obtener_fecha_nacimiento_curp(
        (Paciente?.Curp || "").trim()
    );
}

function actualizar_edad() {

    const campo_edad =
        document.getElementById("edad");

    const campo_clave =
        document.getElementById("clave-edad");

    const fecha_consulta =
        document.getElementById("fecha-atencion").value;

    const modo_manual = () => {

        campo_edad.value = "";
        campo_edad.readOnly = false;

        campo_clave.disabled = false;
        campo_clave.value = "";
    };

    const nacimiento =
        obtener_nacimiento_paciente();

    if (!nacimiento) {
        modo_manual();
        return;
    }

    const resultado = calcular_edad(
        nacimiento,
        fecha_consulta
    );

    if (!resultado) {
        modo_manual();
        return;
    }

    campo_edad.value = resultado.edad;

    const opcion = [...campo_clave.options].find(
        option =>
            option.textContent.trim().startsWith(
                `${resultado.clave} |`
            )
    );

    if (opcion) {
        campo_clave.value = opcion.value;
    }

    campo_edad.readOnly = true;
    campo_clave.disabled = true;
}

function validar_edad() {

    const campo_edad =
        document.getElementById("edad");

    const campo_clave =
        document.getElementById("clave-edad");

    const nacimiento =
        obtener_nacimiento_paciente();

    if (nacimiento) {

        const resultado = calcular_edad(
            nacimiento,
            document.getElementById(
                "fecha-atencion"
            ).value
        );

        if (!resultado) {

            mostrarPopup({
                tipo: "advertencia",
                titulo: "Edad no válida",
                mensaje:
                    "No fue posible calcular la edad a partir de la fecha de nacimiento y la fecha de consulta.",
                boton: true
            });

            return false;
        }

        actualizar_edad();

        if (!campo_clave.value) {

            mostrarPopup({
                tipo: "error",
                titulo: "Clave de edad no disponible",
                mensaje:
                    "No se encontró la clave de edad correspondiente en el catálogo.",
                boton: true
            });

            return false;
        }

        return true;
    }

    const edad = campo_edad.value.trim();
    const clave = clave_edad_letra();

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
            mensaje:
                "Captura una edad válida y selecciona su clave: D, M o A.",
            boton: true
        });

        return false;
    }

    return true;
}

function clave_edad_letra() {

    return document.getElementById("clave-edad")
        .selectedOptions[0]
        ?.textContent.split("|")[0].trim();
}

function edad_en_anios() {

    const edad = Number(
        document.getElementById("edad").value
    );

    const clave = clave_edad_letra();

    if (Number.isNaN(edad)) return null;

    if (clave === "A") return edad;

    if (
        clave === "M" ||
        clave === "D"
    ) {
        return 0;
    }

    return null;
}

/* =========================================================
   5. UTILIDADES
   ========================================================= */

function leer_check(id) {

    return document.getElementById(id)?.checked
        ? 1
        : 0;
}

function leer_contador(id) {

    const valor =
        document.getElementById(id)?.value.trim();

    return (
        valor === "" ||
        valor === undefined
    )
        ? null
        : Number(valor);
}

const CAMPOS_CONTADOR = () => [
    ...document.querySelectorAll(
        "[data-contador]"
    )
];

/* =========================================================
   6. VALIDACIONES
   ========================================================= */

function validar_contadores() {

    for (const campo of CAMPOS_CONTADOR()) {

        const valor = campo.value.trim();

        if (valor === "") continue;

        if (
            !Number.isInteger(Number(valor)) ||
            Number(valor) < 0
        ) {

            const etiqueta = document.querySelector(
                `label[for="${campo.id}"]`
            )?.textContent.trim() || campo.id;

            mostrarPopup({
                tipo: "advertencia",
                titulo: "Cantidad no válida",
                mensaje:
                    `"${etiqueta}" debe ser un número entero igual o mayor a 0.`,
                boton: true
            });

            campo.focus();

            return false;
        }
    }

    return true;
}

function validar_consulta() {

    if (
        !Paciente?.Id_Paciente ||
        !Usuario?.Id_Prestador ||
        !Usuario?.Id_Unidad
    ) {

        mostrarPopup({
            tipo: "error",
            titulo: "Datos incompletos",
            mensaje:
                "Falta identificar al paciente, prestador o unidad.",
            boton: true
        });

        return false;
    }

    if (
        !document.getElementById(
            "fecha-atencion"
        )?.value
    ) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Fecha requerida",
            mensaje:
                "Selecciona la fecha de atención.",
            boton: true
        });

        return false;
    }

    if (!verificar_nulo("servicio")) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Servicio requerido",
            mensaje:
                "Selecciona el servicio correspondiente a Salud Bucal.",
            boton: true
        });

        return false;
    }

    if (!validar_edad()) return false;

    if (!verificar_nulo("rt-motivo")) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Relación temporal requerida",
            mensaje:
                "Indica si la consulta es de primera vez o subsecuente.",
            boton: true
        });

        return false;
    }

    if (
        !verificar_nulo(
            "diagnostico-a-cie10-id"
        )
    ) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Diagnóstico requerido",
            mensaje:
                "Busca y selecciona el diagnóstico CIE-10 principal.",
            boton: true
        });

        return false;
    }

    const anios = edad_en_anios();

    if (
        leer_check("prev-hilo") &&
        anios !== null &&
        anios < 6
    ) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Hilo dental no aplicable",
            mensaje:
                "La instrucción de uso de hilo dental se registra a partir de los 6 años.",
            boton: true
        });

        return false;
    }

    if (
        leer_check("cur-farmacoterapia") &&
        !verificar_nulo("folio-receta")
    ) {

        mostrarPopup({
            tipo: "advertencia",
            titulo: "Folio de receta requerido",
            mensaje:
                "Marcaste farmacoterapia; captura el folio de la receta.",
            boton: true
        });

        return false;
    }

    return validar_contadores();
}

/* =========================================================
   7. CARGA DE DATOS Y CATÁLOGOS
   ========================================================= */

async function cargar_datos() {

    try {

        document.getElementById("clues").value =
            Usuario.Clues;

        document.getElementById(
            "nombre-unidad"
        ).value = Usuario.Nombre_Unidad;

        document.getElementById(
            "curp-prestador"
        ).value = Usuario.Curp;

        document.getElementById(
            "nombre-prestador"
        ).value = (
            `${Usuario.Nombre} ` +
            `${Usuario.Apellido_Paterno} ` +
            `${Usuario.Apellido_Materno}`
        ).trim();

        document.getElementById(
            "tipo-personal"
        ).value = Usuario.Tipo_Personal;

        document.getElementById(
            "cedula-profesional"
        ).value = Usuario.Cedula_Profesional;

        const ahora = new Date();

        document.getElementById(
            "fecha-atencion"
        ).value =
            `${ahora.getFullYear()}-` +
            `${String(
                ahora.getMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                ahora.getDate()
            ).padStart(2, "0")}`;

        document.getElementById(
            "expediente"
        ).value = Paciente.Expediente;

        document.getElementById(
            "curp-paciente"
        ).value = Paciente.Curp;

        document.getElementById(
            "nombre-paciente"
        ).value = (
            `${Paciente.Nombre} ` +
            `${Paciente.Apellido_Paterno} ` +
            `${Paciente.Apellido_Materno}`
        ).trim();

        if (catalogosCargados) {
            actualizar_edad();
            return;
        }

        const response = await fetch(
            `${API}/api/catalogos/`
        );

        if (!response.ok) {

            mostrarPopup({
                tipo: "error",
                titulo: "Error al cargar los catálogos",
                mensaje:
                    "No fue posible obtener la lista de catálogos.",
                boton: true
            });

            return;
        }

        const { catalogos } =
            await response.json();

        const response_j = await fetch(
            `${API}/api/data/catalogos.json`
        );

        if (!response_j.ok) {
            throw new Error(
                "No fue posible cargar los catálogos estáticos."
            );
        }

        const catalogos_json =
            await response_j.json();

        const opcion = x =>
            `${x.Clave} | ${x.Nombre}`;

        const placeholder =
            "Selecciona una opción";

        // Servicios de Salud Bucal.
        const servicios_bucal = (
            catalogos.servicios || []
        ).filter(
            s => SERVICIOS_SALUD_BUCAL.includes(
                Number(s.Clave)
            )
        );

        llenar_select(
            "servicio",
            servicios_bucal,
            "Id_Cat_Servicios",
            opcion,
            "Selecciona un servicio",
            true
        );

        llenar_select(
            "derechohabiencia",
            catalogos.derechohabiencia,
            "Id_Cat_Derechohabiencia",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "clave-edad",
            catalogos_json.clave_edad,
            "Id_Cat_Clave_Edad",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "sexo",
            catalogos_json.sexo_biologico,
            "Id_Cat_Sexo_Biologico",
            opcion,
            placeholder,
            true
        );

        // Discapacidades.
        const discapacidades =
            catalogos.discapacidades || [];

        llenar_select(
            "discapacidad-a",
            discapacidades.filter(
                d => d.Inciso === "a"
            ),
            "Id_Cat_Discapacidad",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "discapacidad-b",
            discapacidades.filter(
                d => d.Inciso === "b"
            ),
            "Id_Cat_Discapacidad",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "discapacidad-c",
            discapacidades.filter(
                d => d.Inciso === "c"
            ),
            "Id_Cat_Discapacidad",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "rt-motivo",
            catalogos_json.rt,
            "Id_Cat_Rt",
            opcion,
            placeholder,
            true
        );

        // Diagnósticos.
        ["a", "b", "c"].forEach(letra => {

            configurar_busqueda_diagnosticos(
                `diagnostico-${letra}-cie10`
            );

            llenar_select(
                `diagnostico-${letra}-medicina-indigena`,
                catalogos.medicina_tradicional,
                "Id_Cat_Medicina_Tradicional",
                opcion,
                placeholder,
                true
            );

            llenar_select(
                `diagnostico-${letra}-confirmacion`,
                catalogos_json.confirmacion_diagnostica,
                "Id_Cat_Confirmacion_Diagnostica",
                opcion,
                placeholder,
                true
            );
        });

        // Promoción de la salud.
        llenar_select(
            "esquema-vacunacion",
            catalogos_json.esquema_vacunacion,
            "Id_Cat_Esquema_Vacunacion",
            opcion,
            placeholder,
            true
        );

        // Referencias.
        llenar_select(
            "referido-por",
            catalogos.referido_motivo,
            "Id_Cat_Referido_Motivo",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "nivel",
            catalogos.referido_nivel,
            "Id_Cat_Referido_Nivel",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "especialidad",
            catalogos.servicios,
            "Id_Cat_Servicios",
            opcion,
            placeholder,
            true
        );

        // Teleconsulta.
        const teleconsulta =
            catalogos.teleconsulta_interpretacion || [];

        llenar_select(
            "Teleconsulta",
            teleconsulta.filter(
                t => t.Inciso === "a"
            ),
            "Id_Cat_Teleconsulta_Interpretacion",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "interpretacion-diagnostica",
            teleconsulta.filter(
                t => t.Inciso === "b"
            ),
            "Id_Cat_Teleconsulta_Interpretacion",
            opcion,
            placeholder,
            true
        );

        llenar_select(
            "modalidad",
            catalogos_json.modalidad,
            "Id_Cat_Modalidad",
            opcion,
            placeholder,
            true
        );

        catalogosCargados = true;

        actualizar_edad();

    } catch (error) {

        console.error(
            "Error al cargar los datos:",
            error
        );

        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje:
                error.message ||
                "No fue posible cargar algunos datos.",
            boton: true
        });
    }
}

/* =========================================================
   8. REGISTRO DE LA CONSULTA
   ========================================================= */

async function registrar_consulta() {

    if (!validar_consulta()) return;

    const diagnostico = letra => ({

        Cat_Diagnosticos_Id_Cat_Diagnosticos:
            verificar_nulo(
                `diagnostico-${letra}-cie10-id`
            ),

        Primera_Vez:
            letra === "a"
                ? null
                : leer_check(
                    `diagnostico-${letra}-primera-vez`
                ),

        Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional:
            verificar_nulo(
                `diagnostico-${letra}-medicina-indigena`
            ),

        Confirmacion_Diagnostica:
            verificar_nulo(
                `diagnostico-${letra}-confirmacion`
            )
    });

    const data = {

        usuario: {
            Id_Usuario: Usuario.Id_Usuario
        },

        /* -----------------------------------------
           PACIENTE
           ----------------------------------------- */

        paciente: {

            Sexo:
                verificar_nulo("sexo"),

            Es_Afromexicano:
                verificar_nulo("afromexicano"),

            Es_Indigena:
                verificar_nulo("indigena"),

            Es_Migrante:
                verificar_nulo("migrante")
        },

        /* -----------------------------------------
           CONSULTA
           ----------------------------------------- */

        consultas: {

            Fecha_Consulta:
                document.getElementById(
                    "fecha-atencion"
                ).value,

            Unidades_Id_Unidad:
                Usuario.Id_Unidad,

            Prestadores_Id_Prestador:
                Usuario.Id_Prestador,

            Pacientes_Id_Paciente:
                Paciente.Id_Paciente,

            Cat_Servicio_Id_Cat_Servicio:
                verificar_nulo("servicio"),

            Cat_Servicio_Id_Cat_Especialidad:
                verificar_nulo("especialidad"),

            Cat_Referido_Nivel_Id_Cat_Referido_Nivel:
                verificar_nulo("nivel"),

            Cat_Referido_Motivo_Id_Cat_Referido_Motivo:
                verificar_nulo("referido-por"),

            Cat_Derechohabiencia_Id_Cat_Derechohabiencia:
                verificar_nulo("derechohabiencia"),

            Edad:
                document.getElementById(
                    "edad"
                ).value,

            Clave_Edad:
                verificar_nulo("clave-edad"),

            Folio_Receta:
                verificar_nulo("folio-receta"),

            Primera_Vez_Anio_Cobertura:
                verificar_nulo("primera-vez-anio"),

            Contrarreferido:
                verificar_nulo("contrarreferido"),

            RT_Por_Motivo:
                verificar_nulo("rt-motivo"),

            Fecha_Proxima_Cita:
                verificar_nulo(
                    "fecha-proxima-consulta"
                )
        },

        /* -----------------------------------------
           MEDICIONES
           ----------------------------------------- */

        mediciones: {

            Peso:
                verificar_nulo("peso"),

            Talla:
                verificar_nulo("talla"),

            Circunferencia_Cintura:
                verificar_nulo(
                    "circunferencia-cintura"
                ),

            Presion_Sistolica:
                verificar_nulo(
                    "presion-sistolica"
                ),

            Presion_Diastolica:
                verificar_nulo(
                    "presion-diastolica"
                ),

            Frecuencia_Cardiaca:
                verificar_nulo(
                    "frecuencia-cardiaca"
                ),

            Frecuencia_Respiratoria:
                verificar_nulo(
                    "frecuencia-respiratoria"
                ),

            Temperatura:
                verificar_nulo("temperatura"),

            Saturacion_Oxigeno:
                verificar_nulo(
                    "saturacion-oxigeno"
                ),

            Glucosa:
                verificar_nulo("glucosa"),

            Glucosa_Ayuno:
                verificar_nulo(
                    "glucosa-ayuno"
                )
        },

        /* -----------------------------------------
           DISCAPACIDAD
           ----------------------------------------- */

        discapacidad: {

            discapacidad: {
                Cat_Discapacidades_Id_Discapacidad:
                    verificar_nulo(
                        "discapacidad-a"
                    )
            },

            dificultad: {
                Cat_Discapacidades_Id_Discapacidad_B:
                    verificar_nulo(
                        "discapacidad-b"
                    )
            },

            motivo: {
                Cat_Discapacidades_Id_Discapacidad_C:
                    verificar_nulo(
                        "discapacidad-c"
                    )
            }
        },

        /* -----------------------------------------
           DIAGNÓSTICOS
           ----------------------------------------- */

        diagnosticos: ["a", "b", "c"]
            .map(diagnostico)
            .filter(
                d =>
                    d.Cat_Diagnosticos_Id_Cat_Diagnosticos != null
            ),

        /* -----------------------------------------
           ATENCIÓN PREVENTIVA
           ----------------------------------------- */

        atencion_preventiva: {

            Deteccion_Placa_Bacteriana:
                leer_check("prev-placa"),

            Instruccion_Tecnica_Cepillado:
                leer_check("prev-cepillado"),

            Instruccion_Uso_Hilo:
                leer_check("prev-hilo"),

            Aplicacion_Topica_Fluor:
                leer_check("prev-fluor"),

            Aplicacion_Barniz_Fluor:
                leer_check("prev-barniz"),

            Limpieza_Dental:
                leer_check("prev-limpieza"),

            Raspado_Aislado_Periodontal:
                leer_check("prev-raspado"),

            Rev_Instruccion_Higiene_Protesis:
                leer_check("prev-protesis"),

            Rev_Tejidos_Bucales:
                leer_check("prev-tejidos"),

            Instruccion_Autoexamen:
                leer_check(
                    "prev-autoexploracion"
                ),

            Sellado_Fosetas_Fisuras:
                leer_contador("prev-sellado")
        },

        /* -----------------------------------------
           ATENCIÓN CURATIVA
           ----------------------------------------- */

        atencion_curativa: {

            Amalgama:
                leer_contador("cur-amalgama"),

            Resinas:
                leer_contador("cur-resinas"),

            Ionomero_Vidrio:
                leer_contador("cur-ionomero"),

            Alcasite:
                leer_contador("cur-alkasite"),

            Material_Temporal:
                leer_contador(
                    "cur-material-temporal"
                ),

            Diente_Temporal:
                leer_contador(
                    "cur-extraccion-temporal"
                ),

            Diente_Permanente:
                leer_contador(
                    "cur-extraccion-permanente"
                ),

            Terapia_Pulpar:
                leer_contador(
                    "cur-terapia-pulpar"
                ),

            Cirugia_Bucal:
                leer_check(
                    "cur-cirugia-bucal"
                ),

            Farmacoterapia:
                leer_check(
                    "cur-farmacoterapia"
                ),

            Otras_Atenciones:
                leer_contador(
                    "cur-otras-atenciones"
                )
        },

        /* -----------------------------------------
           SALUD BUCAL
           ----------------------------------------- */

        salud_bucal: {

            Radiografias:
                leer_contador("radiografias"),

            Tratamiento_Integral_Terminado:
                leer_check(
                    "tratamiento-integral"
                ),

            Orientacion_Salud:
                leer_check(
                    "orientacion-salud"
                )
        },

        /* -----------------------------------------
           PROMOCIÓN DE LA SALUD
           ----------------------------------------- */

        promocion_salud: {

            Consulta_Integrada_Linea_Vida:
                leer_check("consulta-linea-vida")
                    ? "X"
                    : null,

            Presenta_Cartilla:
                leer_check("presenta-cartilla"),

            Esquema_Vacunacion:
                verificar_nulo(
                    "esquema-vacunacion"
                )
        },

        /* -----------------------------------------
           TELECONSULTA
           ----------------------------------------- */

        teleconsulta: {

            Unidad_Consultante:
                verificar_nulo(
                    "unidad-consultante"
                ),

            Modalidad:
                verificar_nulo("modalidad"),

            Cat_Teleconsulta_Interpretacion_Id_Teleconsulta:
                verificar_nulo("Teleconsulta"),

            Cat_Teleconsulta_Interpretacion_Id_Interpretacion_Diagnostica:
                verificar_nulo(
                    "interpretacion-diagnostica"
                )
        }
    };

    try {

        const response = await fetch(
            "http://localhost:3000/api/modules/salud-bucal/registrar",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const resultado = await response.json();

        mostrarPopup({
            tipo: "exito",
            titulo: "Consulta registrada",
            mensaje:
                "La consulta se registró correctamente. A continuación se abrirá el formulario de la nota médica.",
            boton: true,
            redireccion: `/pages/modules/nota-medica/formulario.html?id_consulta=${resultado.Id_Consulta}`
        });

    } catch (error) {

        console.error(
            "Error al registrar la consulta de salud bucal:",
            error
        );

        mostrarPopup({
            tipo: "error",
            titulo: "Error de registro",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible registrar la consulta."),
            boton: true
        });
    }
}

/* =========================================================
   9. LIMPIAR FORMULARIO
   ========================================================= */

function limpiar_formulario() {

    const contenedor =
        document.getElementById(
            "contenedor-modulos"
        );

    contenedor.querySelectorAll(
        "input, select"
    ).forEach(campo => {

        if (
            campo.readOnly ||
            campo.id === "fecha-atencion"
        ) {
            return;
        }

        if (campo.type === "checkbox") {
            campo.checked = false;
        } else {
            campo.value = "";
        }
    });

    contenedor.querySelectorAll(
        ".list-group"
    ).forEach(lista => {

        lista.replaceChildren();
        lista.style.display = "none";
    });

    actualizar_edad();
    actualizar_condicionales();
}

/* =========================================================
   10. CAMPOS CONDICIONALES
   ========================================================= */

function configurar_interacciones() {

    [
        "primera-vez-anio",
        "referido-por",
        "nivel",
        "Teleconsulta",
        "interpretacion-diagnostica",
        "unidad-consultante"
    ].forEach(id => {

        document.getElementById(id)
            ?.addEventListener(
                "change",
                actualizar_condicionales
            );
    });

    actualizar_condicionales();
}

function actualizar_condicionales() {

    // Discapacidad.
    const primera =
        document.getElementById(
            "primera-vez-anio"
        )?.value === "1";

    [
        "discapacidad-a",
        "discapacidad-b",
        "discapacidad-c"
    ].forEach(id => {

        const campo =
            document.getElementById(id);

        if (!campo) return;

        campo.disabled = !primera;

        if (!primera) {
            campo.value = "";
        }
    });

    // Referencias.
    const nivel =
        document.getElementById("nivel");

    const especialidad =
        document.getElementById(
            "especialidad"
        );

    if (especialidad && nivel) {

        especialidad.disabled =
            !nivel.value;

        if (!nivel.value) {
            especialidad.value = "";
        }
    }

    // Teleconsulta.
    const tele = [
        "Teleconsulta",
        "interpretacion-diagnostica",
        "unidad-consultante"
    ].some(id => {

        const valor =
            document.getElementById(id)?.value;

        return (
            valor !== undefined &&
            valor !== "" &&
            valor !== "0"
        );
    });

    const modalidad =
        document.getElementById(
            "modalidad"
        );

    if (modalidad) {

        modalidad.disabled = !tele;

        if (!tele) {
            modalidad.value = "";
        }
    }
}

/* =========================================================
   11. EVENTOS
   ========================================================= */

document.getElementById(
    "fecha-atencion"
).addEventListener(
    "change",
    actualizar_edad
);

const boton_registrar = document.getElementById("guardar-datos");

boton_registrar.addEventListener("click", async () => {

    if (boton_registrar.disabled) return;

    boton_registrar.disabled = true;

    try {

        if (!validar_consulta()) return;

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

        await registrar_consulta();

    } catch (error) {

        console.error(
            "Error al registrar la consulta de salud bucal:",
            error
        );

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

document.getElementById(
    "limpiar-formulario"
).addEventListener(
    "click",
    limpiar_formulario
);

document.getElementById(
    "cancelar"
).addEventListener("click", () => {

    window.location.href =
        "../../dashboard/dashboard.html";
});
