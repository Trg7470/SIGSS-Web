import {
    llenar_select,
    verificar_nulo,
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION
} from "./utils.js";

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

// Servicios correspondientes a Detecciones (coincide con el listado oficial
// del instructivo SINBA-SIS-DET-P, el mismo que usa Consulta Externa). El
// catálogo Cat_Servicios es compartido por todo el sistema, así que trae
// servicios que no aplican aquí (Odontología, Homeopatía, Acupuntura,
// Nutrición, Optometría, Medicina Familiar, Oncología Pediátrica...); se
// filtra para mostrar solo estas claves.
const CLAVES_SERVICIO_DETECCIONES = [
    1, 2, 3, 4, 5, 7, 8, 9, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23,
    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 57, 59, 60,
    61, 62, 70, 88
];

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
        window.location.href = "/index.html";
        return;
    }

    document.getElementById("titulo-bienvenida").textContent = "Detecciones";
    document.getElementById("descripcion-bienvenida").textContent =
        "Módulo de registro de detecciones.";

    configurar_deteccion_cambios();
    configurar_confirmacion_salida();
    configurar_cancelar_busqueda_paciente();
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
// se puede deshacer antes de dejarlo salir.
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
// el fondo oscuro se dejan con su comportamiento normal.
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
            mensaje: "¿Estás seguro de cancelar? Se te redirigirá al panel principal.",
            confirmar: true,
            textoConfirmar: "Sí, cancelar",
            textoCancelar: "Seguir buscando"
        });

        if (!confirmar) return;

        window.modal_manager.cerrar("modal_generico");

        window.location.href = "/pages/dashboard/dashboard.html";
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
                const result = await fetch(`${API}/api/pacientes/buscar`, {
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
                        mensaje:
                            response.message ||
                            "No se encontró ningún paciente con esos datos. Puedes registrar al paciente en el módulo de pacientes o pedir ayuda al personal administrativo.",
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

                // Se rellena el propio modal con los datos encontrados (nombre,
                // apellidos y CURP) antes de avisar, para que se vea que el
                // paciente corresponde a lo que se buscó.
                window.modal_manager.establecer_valor("paciente_curp", Paciente.Curp);
                window.modal_manager.establecer_valor("paciente_nombre", Paciente.Nombre);
                window.modal_manager.establecer_valor("paciente_apellido_paterno", Paciente.Apellido_Paterno);
                window.modal_manager.establecer_valor("paciente_apellido_materno", Paciente.Apellido_Materno);

                await mostrarPopup({
                    tipo: "exito",
                    titulo: "Paciente encontrado",
                    mensaje: `Nombre: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno} | CURP: ${Paciente.Curp} | Expediente: ${Paciente.Expediente}`,
                    boton: true
                });

                await cargar_datos();

                return true;
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

/* =========================================================
   3. CÁLCULO DE EDAD
   ========================================================= */

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

// Prefiere la fecha de nacimiento que ya trae el registro del paciente; solo
// cae a derivarla de la CURP si el backend no la mandó (más confiable que
// depender únicamente de la CURP, que puede ser genérica o extranjera).
function obtener_nacimiento_paciente() {
    if (Paciente?.Fecha_Nacimiento) {
        return new Date(`${String(Paciente.Fecha_Nacimiento).slice(0, 10)}T00:00:00`);
    }

    return obtener_fecha_nacimiento_curp((Paciente?.Curp || "").trim());
}

// Rellena los campos automáticamente o permite capturarlos manualmente.
function actualizar_edad() {
    const campo_edad = document.getElementById("edad");
    const campo_clave = document.getElementById("clave-edad");
    const fecha_consulta = document.getElementById("fecha-atencion").value;

    const modo_manual = () => {
        campo_edad.value = "";
        campo_edad.readOnly = false;
        campo_clave.disabled = false;
        campo_clave.value = "";
    };

    const nacimiento = obtener_nacimiento_paciente();

    if (!nacimiento) {
        modo_manual();
        return;
    }

    const resultado = calcular_edad(nacimiento, fecha_consulta);

    if (!resultado) {
        modo_manual();
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
    const nacimiento = obtener_nacimiento_paciente();

    if (nacimiento) {
        const resultado = calcular_edad(nacimiento, document.getElementById("fecha-atencion").value);

        if (!resultado) {
            mostrarPopup({
                tipo: "advertencia",
                titulo: "Edad no válida",
                mensaje: "No fue posible calcular la edad a partir de la fecha de nacimiento y la fecha de consulta.",
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
                mensaje: "No se encontró la clave de edad correspondiente en el catálogo.",
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
            mensaje: "Captura una edad válida y selecciona su clave: D, M o A.",
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

/* =========================================================
   4. UTILIDADES
   ========================================================= */

// Resalta en rojo el campo que falló la validación y hace scroll hasta él
// (con el formulario tan largo, el popup dice qué falta pero no dónde
// está). El resaltado se quita solo en cuanto el usuario lo toca.
function resaltar_campo(id) {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.classList.add("is-invalid");

    campo.scrollIntoView({ behavior: "smooth", block: "center" });
    campo.focus({ preventScroll: true });

    const quitar_resaltado = () => {
        campo.classList.remove("is-invalid");
        campo.removeEventListener("input", quitar_resaltado);
        campo.removeEventListener("change", quitar_resaltado);
    };

    campo.addEventListener("input", quitar_resaltado);
    campo.addEventListener("change", quitar_resaltado);
}

function leer_contador(id) {
    const valor = document.getElementById(id)?.value.trim();
    return (valor === "" || valor === undefined) ? null : Number(valor);
}

const CAMPOS_CONTADOR = () => [...document.querySelectorAll("[data-contador]")];

function validar_contadores() {
    for (const campo of CAMPOS_CONTADOR()) {
        const valor = campo.value.trim();

        if (valor === "") continue;

        if (!Number.isInteger(Number(valor)) || Number(valor) < 0) {
            const etiqueta = document.querySelector(`label[for="${campo.id}"]`)?.textContent.trim() || campo.id;

            mostrarPopup({
                tipo: "advertencia",
                titulo: "Cantidad no válida",
                mensaje: `"${etiqueta}" debe ser un número entero igual o mayor a 0.`,
                boton: true
            });

            resaltar_campo(campo.id);
            return false;
        }
    }

    return true;
}

// Campos decimales no negativos (la razón VEF1/CVF y el LIN de
// espirometría; ambos van en DECIMAL(4,3) en la BD, ver
// migracion_espirometria.sql). A diferencia de [data-contador], aquí sí
// se permiten decimales.
const CAMPOS_DECIMAL = () => [...document.querySelectorAll("[data-decimal]")];

function validar_decimales() {
    for (const campo of CAMPOS_DECIMAL()) {
        const valor = campo.value.trim();

        if (valor === "") continue;

        if (Number.isNaN(Number(valor)) || Number(valor) < 0) {
            const etiqueta = document.querySelector(`label[for="${campo.id}"]`)?.textContent.trim() || campo.id;

            mostrarPopup({
                tipo: "advertencia",
                titulo: "Valor no válido",
                mensaje: `"${etiqueta}" debe ser un número igual o mayor a 0 (puede llevar decimales).`,
                boton: true
            });

            resaltar_campo(campo.id);
            return false;
        }
    }

    return true;
}

/* =========================================================
   5. VALIDACIÓN DEL BLOQUE ITS
   ========================================================= */

// El bloque ITS es "todo o nada": si se capturó algo en él, el schema exige
// el grupo poblacional y los 6 resultados (Tipo_Prueba es el único opcional,
// y solo aplica para sífilis/A539). Devuelve null si el bloque está vacío
// (no se registra), el objeto completo si está correctamente lleno, o
// bloquea el registro con un mensaje si está incompleto.
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

    const campo_faltante = CAMPOS_ITS_OBLIGATORIOS.find(id => valores[id] === "");

    if (campo_faltante) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Bloque de ITS incompleto",
            mensaje: "Si capturas el bloque de ITS, debes completar el grupo poblacional y los 6 resultados (VPH, Chlamydia, Herpes Genital, Hepatitis B, Gonorrea, B24X y A539).",
            boton: true
        });
        resaltar_campo(campo_faltante);
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

/* =========================================================
   6. VALIDACIÓN GENERAL DE LA CONSULTA
   ========================================================= */

function validar_consulta() {
    if (!Paciente?.Id_Paciente || !Usuario?.Id_Prestador || !Usuario?.Id_Unidad) {
        mostrarPopup({
            tipo: "error",
            titulo: "Datos incompletos",
            mensaje: "Falta identificar al paciente, prestador o unidad.",
            boton: true
        });
        return false;
    }

    if (!document.getElementById("fecha-atencion")?.value) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Fecha requerida",
            mensaje: "Selecciona la fecha de atención.",
            boton: true
        });
        resaltar_campo("fecha-atencion");
        return false;
    }

    if (!verificar_nulo("servicio")) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Servicio requerido",
            mensaje: "Selecciona el servicio correspondiente a Detecciones.",
            boton: true
        });
        resaltar_campo("servicio");
        return false;
    }

    if (!validar_edad()) return false;

    if (!validar_bloque_its().valido) return false;

    if (!validar_contadores()) return false;

    return validar_decimales();
}

document.getElementById("fecha-atencion").addEventListener("change", actualizar_edad);

/* =========================================================
   7. CARGA DE DATOS Y CATÁLOGOS
   ========================================================= */

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

        if (catalogosCargados) {
            actualizar_edad();
            return true;
        }

        const response = await fetch(`${API}/api/catalogos/`);

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

        const response_j = await fetch(`${API}/api/data/catalogos.json`);

        if (!response_j.ok) {
            const mensaje = await obtener_mensaje_error(response_j, "No fue posible cargar los catálogos estáticos.");
            throw new Error(mensaje);
        }

        const catalogos_json = await response_j.json();
        const opcion = x => `${x.Clave} | ${x.Nombre}`;
        const placeholder = "Selecciona una opción";

        const servicios_detecciones = (catalogos.servicios || [])
            .filter(s => CLAVES_SERVICIO_DETECCIONES.includes(Number(s.Clave)))
            .sort((a, b) => Number(a.Clave) - Number(b.Clave));

        llenar_select("servicio", servicios_detecciones, "Id_Cat_Servicios", opcion, "Selecciona un servicio", true);
        llenar_select("derechohabiencia", catalogos.derechohabiencia, "Id_Cat_Derechohabiencia", opcion, placeholder, true);
        llenar_select("clave-edad", catalogos_json.clave_edad, "Id_Cat_Clave_Edad", opcion, placeholder, true);
        llenar_select("sexo", catalogos_json.sexo_biologico, "Id_Cat_Sexo_Biologico", opcion, placeholder, true);
        llenar_select("migrante", catalogos_json.migrante, "Id_Cat_Migrante", opcion, placeholder, true);

        // Sexo del Cuidador (bloque "Detecciones y Revaloraciones 60+"):
        // corresponde a la pregunta 3 SEXO BIOLÓGICO (1.Hombre, 2.Mujer,
        // 3.Intersexual), el mismo catálogo que el sexo del paciente, no una
        // lista aparte de solo 2 opciones.
        llenar_select("cuidador-sexo", catalogos_json.sexo_biologico, "Id_Cat_Sexo_Biologico", opcion, placeholder, true);

        const discapacidades = catalogos.discapacidades || [];

        llenar_select("discapacidad-a", discapacidades.filter(d => d.Inciso === "a"), "Id_Cat_Discapacidad", opcion, placeholder, true);
        llenar_select("discapacidad-b", discapacidades.filter(d => d.Inciso === "b"), "Id_Cat_Discapacidad", opcion, placeholder, true);
        llenar_select("discapacidad-c", discapacidades.filter(d => d.Inciso === "c"), "Id_Cat_Discapacidad", opcion, placeholder, true);

        llenar_select("its-grupo-poblacional", catalogos.grupos_its, "Id_Cat_Grupos_Its", opcion, placeholder, true);

        // Las 7 ITS (B24X, A539, Gonorrea, Hepatitis B, Herpes, Chlamydia,
        // VPH) usan el mismo catálogo completo de "referencia 10.
        // RESULTADO ITS (en el año)" (confirmado con Ileana). Solo A539
        // lleva, además, el campo aparte "its-tipo-prueba" (pregunta 15:
        // Treponémica/No treponémica), que no aplica a las demás.
        const resultados_its = catalogos.resultados_its || [];
        ["its-resultado-b24x", "its-resultado-a539", "its-resultado-gonorrea", "its-resultado-hepatitis-b", "its-resultado-herpes", "its-resultado-chlamydia", "its-resultado-vph"]
            .forEach(id => llenar_select(id, resultados_its, "Id_Cat_Resultados_ITS", opcion, placeholder, true));

        llenar_select("espirometria-resultado", catalogos.espirometria_resultados, "Id_Cat_Espirometria_Resultados", opcion, placeholder, true);

        catalogosCargados = true;

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

/* =========================================================
   8. REGISTRO DE LA CONSULTA
   ========================================================= */

async function registrar_consulta() {
    if (!validar_consulta()) return;

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
        detecciones: {
            Tiras_Utilizadas: leer_contador("tiras-utilizadas"),
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
            Reactivos_Antigeno_Prostatico: leer_contador("reactivos-antigeno-prostatico"),
            Probable_TB_Estudio: verificar_nulo("probable-tb-estudio"),
            Cancer_Cervicouterino_Realizado: verificar_nulo("cancer-cervicouterino-realizado"),
            Cancer_Cervicouterino_Resultado: verificar_nulo("cancer-cervicouterino-resultado"),
            // El formato oficial (SINBA-SIS-DET-P) solo trae UNA casilla
            // "VEF1/CVF": la razón entre ambos valores, no dos campos
            // separados. Se captura como un solo decimal.
            Espirometria_VEF1_CVF: verificar_nulo("espirometria-vef1-cvf"),
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
            // Sobrecarga_Cuidador ya no existe como columna en la BD (se
            // eliminó); no se captura ni se envía.
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

    try {
        const response = await fetch(`${API}/api/modules/detecciones/registrar`, {
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

        await response.json();

        formulario_modificado = false;

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

/* =========================================================
   9. LIMPIAR FORMULARIO
   ========================================================= */

function limpiar_formulario() {
    const contenedor = document.getElementById("contenedor-modulos");

    if (!contenedor) return;

    contenedor.querySelectorAll("input, select").forEach(campo => {
        if (campo.readOnly || campo.id === "fecha-atencion") {
            return;
        }

        campo.value = "";
        campo.classList.remove("is-invalid");
    });

    actualizar_edad();
}

/* =========================================================
   10. EVENTOS
   ========================================================= */

const boton_registrar = document.getElementById("guardar-datos");

boton_registrar.addEventListener("click", async () => {
    if (boton_registrar.disabled) return;

    boton_registrar.disabled = true;

    try {
        if (!validar_consulta()) return;

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

        if (!confirmar) return;

        mostrarPopup({
            tipo: "carga",
            titulo: "Registrando detección",
            mensaje: "Por favor espera mientras se registra la detección.",
            boton: false
        });

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

document.getElementById("limpiar-formulario").addEventListener("click", async () => {
    const confirmar = await mostrarPopup({
        tipo: "advertencia",
        titulo: "Limpiar formulario",
        mensaje: "¿Estás seguro de limpiar el formulario? Se perderá la información capturada.",
        confirmar: true,
        textoConfirmar: "Sí, limpiar",
        textoCancelar: "Seguir capturando"
    });

    if (!confirmar) return;

    limpiar_formulario();

    formulario_modificado = false;
});

document.getElementById("cancelar").addEventListener("click", async () => {
    const confirmar = await mostrarPopup({
        tipo: "advertencia",
        titulo: "Cancelar registro",
        mensaje: "¿Estás seguro de cancelar? Se perderá la información capturada y se te redirigirá al panel principal.",
        confirmar: true,
        textoConfirmar: "Sí, cancelar",
        textoCancelar: "Seguir capturando"
    });

    if (!confirmar) return;

    formulario_modificado = false;

    window.location.href = "/pages/dashboard/dashboard.html";
});