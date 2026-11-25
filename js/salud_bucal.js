import { llenar_select, verificar_nulo } from "./utils.js";

let Usuario = null;

try {
    Usuario = JSON.parse(sessionStorage.getItem("usuario"));
} catch (_) {}

const API = "http://localhost:3000";

let catalogosCargados = false;
let Paciente;

// Se activa en cuanto el usuario edita algo del formulario (no se activa
// con los autollenados por JS de cargar_datos/el modal de búsqueda, ya que
// asignar .value por código no dispara "input"/"change"). Sirve para saber
// si de verdad hay información capturada antes de advertir al salir.
let formulario_modificado = false;

// Servicios correspondientes a Salud Bucal.
const SERVICIOS_SALUD_BUCAL = [10, 11, 12, 31, 70];

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
    configurar_cancelar_busqueda_paciente();
    configurar_deteccion_cambios();
    configurar_confirmacion_salida();
    seleccionar_paciente();
});

/* =========================================================
   CONFIRMAR SALIDA DEL FORMULARIO (MENÚ DE NAVEGACIÓN)
   ========================================================= */

// Marca el formulario como modificado con cualquier edición real del
// usuario dentro de #contenedor-modulos (inputs, selects, checkboxes).
function configurar_deteccion_cambios() {

    const contenedor = document.getElementById("contenedor-modulos");

    if (!contenedor) return;

    const marcar = () => { formulario_modificado = true; };

    contenedor.addEventListener("input", marcar);
    contenedor.addEventListener("change", marcar);
}

// El logotipo (que funciona como "Inicio") y los enlaces del menú principal
// (#menu-principal, armado por dashboard.js con los módulos) llevan al
// usuario fuera de este formulario. Si ya capturó algo, se le avisa que no
// se puede deshacer antes de dejarlo salir. El resto del header (perfil,
// cerrar sesión, botón de menú móvil) no se toca, no se pidió.
function configurar_confirmacion_salida() {

    document.addEventListener("click", async evento => {

        const enlace = evento.target.closest(
            "#logo-sigss, #logo-sigss-movil, #menu-principal a"
        );

        if (!enlace || !enlace.href || !formulario_modificado) return;

        evento.preventDefault();

        const confirmar = await mostrarPopup({
            tipo: "advertencia",
            titulo: "Salir del formulario",
            mensaje:
                "Tienes información capturada sin guardar en este formulario. Si sales, se perderá y no se podrá deshacer. ¿Deseas continuar?",
            confirmar: true,
            textoConfirmar: "Sí, salir",
            textoCancelar: "Seguir capturando"
        });

        if (!confirmar) return;

        formulario_modificado = false;

        window.location.href = enlace.href;
    });
}

/* =========================================================
   CANCELAR BÚSQUEDA DE PACIENTE (MODAL)
   ========================================================= */

// Esta página solo usa el modal_generico para la búsqueda de paciente, así
// que aquí es seguro interceptar el botón "Cancelar" del pie para pedir
// confirmación antes de cerrarlo. La "x" del encabezado, ESC y el clic en
// el fondo oscuro se dejan con su comportamiento normal (cierran el modal
// sin pedir nada), solo el botón "Cancelar" lleva la confirmación + redirección.
function configurar_cancelar_busqueda_paciente() {

    const boton_cancelar = document.querySelector(
        '#modal_generico .modal-sigss-footer [data-dismiss="modal"]'
    );

    if (!boton_cancelar) return;

    boton_cancelar.addEventListener("click", async evento => {

        evento.preventDefault();
        evento.stopPropagation();

        const confirmar = await mostrarPopup({
            tipo: "advertencia",
            titulo: "Cancelar búsqueda de paciente",
            mensaje:
                "¿Estás seguro de cancelar? Se te redirigirá al panel principal.",
            confirmar: true,
            textoConfirmar: "Sí, cancelar",
            textoCancelar: "Seguir buscando"
        });

        if (!confirmar) return;

        window.modal_manager.cerrar("modal_generico");

        window.location.href =
            "../../dashboard/dashboard.html";
    });
}

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

                // Se rellena el propio modal con los datos encontrados
                // (nombre, apellidos y CURP) antes de avisar, para que se
                // vea que el paciente corresponde a lo que se buscó.
                window.modal_manager.establecer_valor(
                    "paciente_curp", Paciente.Curp
                );
                window.modal_manager.establecer_valor(
                    "paciente_nombre", Paciente.Nombre
                );
                window.modal_manager.establecer_valor(
                    "paciente_apellido_paterno", Paciente.Apellido_Paterno
                );
                window.modal_manager.establecer_valor(
                    "paciente_apellido_materno", Paciente.Apellido_Materno
                );

                await mostrarPopup({
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

// El checkbox "Diagnóstico de primera vez" (B y C) solo tiene sentido si
// ya hay un diagnóstico capturado; si no lo hay (o se borra), se deshabilita
// y se desmarca para no dejar marcado "primera vez" sin diagnóstico. No
// existe para el diagnóstico A (no tiene ese checkbox), por eso se busca
// con optional chaining y no hace nada si no lo encuentra.
function sincronizar_primera_vez(id) {

    const hidden = document.getElementById(`${id}-id`);

    const checkbox = document.getElementById(
        `${id.replace("-cie10", "")}-primera-vez`
    );

    if (!hidden || !checkbox) return;

    const tiene_diagnostico = hidden.value !== "";

    checkbox.disabled = !tiene_diagnostico;

    if (!tiene_diagnostico) {
        checkbox.checked = false;
    }
}

// "Folio de la Receta" solo es obligatorio si se marca Farmacoterapia
// (ver validar_consulta). Aquí nada más se refleja visualmente esa regla:
// borde rojo si falta y placeholder avisando que es obligatorio.
function actualizar_folio_receta_requerido() {

    const checkbox = document.getElementById("cur-farmacoterapia");

    const folio = document.getElementById("folio-receta");

    if (!checkbox || !folio) return;

    const requerido = checkbox.checked;

    folio.classList.toggle(
        "is-invalid",
        requerido && folio.value.trim() === ""
    );

    folio.placeholder = requerido
        ? "Folio de la Receta (obligatorio por Farmacoterapia)"
        : "Folio de la Receta";
}

function configurar_busqueda_diagnosticos(id) {

    const input = document.getElementById(id);

    const hidden =
        document.getElementById(`${id}-id`);

    const resultados =
        document.getElementById(`${id}-resultados`);

    if (!input || !hidden || !resultados) return;

    sincronizar_primera_vez(id);

    input.addEventListener("input", async () => {

        const nombre = input.value.trim();

        hidden.value = "";
        resultados.replaceChildren();
        sincronizar_primera_vez(id);

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

                    sincronizar_primera_vez(id);

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

            resaltar_campo("fecha-atencion");

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

            resaltar_campo("clave-edad");

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

        resaltar_campo(edad === "" ? "edad" : "clave-edad");

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

// Resalta en rojo el campo que falló la validación y hace scroll hasta él
// (con el formulario tan largo, el popup dice qué falta pero no dónde
// está). El resaltado se quita solo en cuanto el usuario lo toca.
function resaltar_campo(id) {

    const campo = document.getElementById(id);

    if (!campo) return;

    campo.classList.add("is-invalid");

    campo.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    campo.focus({ preventScroll: true });

    const quitar_resaltado = () => {
        campo.classList.remove("is-invalid");
        campo.removeEventListener("input", quitar_resaltado);
        campo.removeEventListener("change", quitar_resaltado);
    };

    campo.addEventListener("input", quitar_resaltado);
    campo.addEventListener("change", quitar_resaltado);
}

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

            resaltar_campo(campo.id);

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

        resaltar_campo("fecha-atencion");

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

        resaltar_campo("servicio");

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

        resaltar_campo("rt-motivo");

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

        resaltar_campo("diagnostico-a-cie10");

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

        resaltar_campo("prev-hilo");

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

        resaltar_campo("folio-receta");

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
        ).sort(
            (a, b) => Number(a.Clave) - Number(b.Clave)
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

        llenar_select(
            "migrante",
            catalogos_json.migrante,
            "Id_Cat_Migrante",
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
        // El instructivo de esta hoja (SINBA-SIS-02-P) no trae campo de
        // Medicina Tradicional Indígena ni de Confirmación Diagnóstica,
        // por eso aquí solo se configura la búsqueda de CIE-10 (a
        // diferencia de Consulta Externa, que sí los usa).
        ["a", "b", "c"].forEach(letra => {

            configurar_busqueda_diagnosticos(
                `diagnostico-${letra}-cie10`
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
        // BC de la hoja diaria es solo "¿Fue referido?" (Si/No), derivado
        // de si se capturó Nivel; esta hoja no usa el motivo del referido.
        llenar_select(
            "nivel",
            catalogos.referido_nivel,
            "Id_Cat_Referido_Nivel",
            opcion,
            placeholder,
            true
        );

        // "Especialidad" (pregunta 8) no es una elección aparte: según el
        // instructivo de la hoja diaria, 8. ESPECIALIDAD = SERVICIO, o sea
        // que siempre debe traer el mismo servicio ya elegido en el campo
        // "servicio". Se llena con el mismo catálogo filtrado (servicios_bucal)
        // para que comparta los mismos Id_Cat_Servicios como opciones, pero
        // queda deshabilitado y su valor se sincroniza solo (ver
        // actualizar_condicionales).
        llenar_select(
            "especialidad",
            servicios_bucal,
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

    // El instructivo de esta hoja (SINBA-SIS-02-P) no usa Medicina
    // Tradicional Indígena ni Confirmación Diagnóstica, por eso aquí no
    // se capturan; se mandan como null porque Consulta_Diagnosticos
    // (modelo compartido con otros módulos) siempre espera ambas
    // columnas en el INSERT.
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

        Cat_Medicina_Tradicional_Id_Cat_Medicina_Tradicional: null,

        Confirmacion_Diagnostica: null
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

            // Esta hoja no captura motivo de referido; se manda null
            // porque Consultas (modelo compartido con otros módulos)
            // siempre espera esta columna en el INSERT.
            Cat_Referido_Motivo_Id_Cat_Referido_Motivo: null,

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
            redireccion: `/pages/modules/nota-medica/registrar.html?id_consulta=${resultado.Id_Consulta}&modulo=salud-bucal`
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

    // Al limpiar también se borran los diagnósticos (el value="" de arriba
    // ya incluye los hidden -id), así que "primera vez" de B y C debe
    // volver a quedar deshabilitado.
    ["diagnostico-b-cie10", "diagnostico-c-cie10"].forEach(
        sincronizar_primera_vez
    );

    actualizar_folio_receta_requerido();

    actualizar_edad();
    actualizar_condicionales();
}

/* =========================================================
   10. CAMPOS CONDICIONALES
   ========================================================= */

function configurar_interacciones() {

    [
        "primera-vez-anio",
        "nivel",
        "Teleconsulta",
        "interpretacion-diagnostica",
        "unidad-consultante",
        "servicio"
    ].forEach(id => {

        document.getElementById(id)
            ?.addEventListener(
                "change",
                actualizar_condicionales
            );
    });

    document.getElementById("cur-farmacoterapia")
        ?.addEventListener("change", actualizar_folio_receta_requerido);

    document.getElementById("folio-receta")
        ?.addEventListener("input", actualizar_folio_receta_requerido);

    actualizar_folio_receta_requerido();

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

    // Referencias: "Especialidad" (pregunta 8) siempre es igual al
    // "Servicio" ya elegido de forma obligatoria en el formulario (8.
    // ESPECIALIDAD = SERVICIO, según el instructivo). No es una elección
    // aparte para el usuario: se sincroniza sola con el servicio elegido y
    // queda siempre deshabilitada, solo se muestra cuando hay "Referido a".
    const nivel =
        document.getElementById("nivel");

    const especialidad =
        document.getElementById(
            "especialidad"
        );

    const servicio =
        document.getElementById("servicio");

    if (especialidad && nivel && servicio) {

        especialidad.value =
            nivel.value ? servicio.value : "";

        especialidad.disabled = true;
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
).addEventListener("click", async () => {

    const confirmar = await mostrarPopup({
        tipo: "advertencia",
        titulo: "Limpiar formulario",
        mensaje:
            "¿Estás seguro de limpiar el formulario? Se perderá la información capturada.",
        confirmar: true,
        textoConfirmar: "Sí, limpiar",
        textoCancelar: "Seguir capturando"
    });

    if (!confirmar) return;

    limpiar_formulario();

    formulario_modificado = false;
});

document.getElementById(
    "cancelar"
).addEventListener("click", async () => {

    const confirmar = await mostrarPopup({
        tipo: "advertencia",
        titulo: "Cancelar registro",
        mensaje:
            "¿Estás seguro de cancelar? Se perderá la información capturada y se te redirigirá al panel principal.",
        confirmar: true,
        textoConfirmar: "Sí, cancelar",
        textoCancelar: "Seguir capturando"
    });

    if (!confirmar) return;

    window.location.href =
        "../../dashboard/dashboard.html";
});