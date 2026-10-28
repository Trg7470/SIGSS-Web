/* =========================================================
   1. SESIÓN DEL USUARIO
   ========================================================= */
let usuario = null;

try {
    usuario = JSON.parse(
        sessionStorage.getItem("usuario")
    );
} catch (error) {
    console.error(
        "Error al recuperar la sesión:",
        error
    );
}

/* =========================================================
   2. RUTAS DE LOS MÓDULOS HTML
   ========================================================= */
const rutas_modulos = {
    "consulta-externa":
        "../modules/consulta-externa/index.html",

    "salud-bucal":
        "../modules/salud-bucal/index.html",

    "detecciones":
        "../modules/detecciones/index.html",

    "planificacion-familiar":
        "../modules/planificacion-familiar/index.html"
};


/* =========================================================
   3. ESTADO ACTUAL
   ========================================================= */
let modulo_actual = null;
let vista_actual = "inicio";

// Identifica cada solicitud de carga.
// Evita que respuestas anteriores sobrescriban
// el módulo que el usuario acaba de seleccionar.
let solicitud_modulo = 0;


/* =========================================================
   4. INICIALIZACIÓN DEL DASHBOARD
   ========================================================= */
document.addEventListener(
    "DOMContentLoaded",
    async function () {
        await cargar_dashboard();
    }
);


/* =========================================================
   5. CARGAR DASHBOARD
   ========================================================= */
async function cargar_dashboard() {
    if (!usuario || !usuario.Rol) {

        if (typeof mostrarPopup === "function") {
            mostrarPopup({
                titulo: "No has iniciado sesión",
                mensaje:
                    "Redirigiendo a la página de inicio de sesión...",
                tipo: "error"
            });
            await new Promise(resolve =>
                setTimeout(resolve, 2000)
            );
        }
        window.location.href = "../../index.html";
        return;
    }

    // Título de bienvenida.
    const tituloBienvenida =
        document.getElementById("titulo-bienvenida");
    if (tituloBienvenida) {
        tituloBienvenida.textContent =
            `¡Bienvenido de nuevo a SIGSS, ${usuario.Nombre || "Usuario"}!`;
    }

    // Descripcion bienvenida
    const descripcionBienvenida =
        document.getElementById("descripcion-bienvenida");
    if (descripcionBienvenida) {
        descripcionBienvenida.textContent =
            `Sistema Integral de Gestión de Servicios de Salud.`;
    }

    // Nombre del usuario.
    const nombreUsuario =
        document.getElementById("nombre-usuario");
    if (nombreUsuario) {
        nombreUsuario.textContent =
            usuario.Nombre || "Usuario";
    }

    // Rol del usuario.
    const rolUsuario =
        document.getElementById("rol-usuario");
    if (rolUsuario) {
        rolUsuario.textContent = usuario.Rol;
    }

    // Generar el menú correspondiente al rol.
    switch (usuario.Rol) {
        case "Médico":
            generar_menu_medico();
            break;
        default:
            console.warn(
                "No existe un menú configurado para el rol:",
                usuario.Rol
            );
            break;
    }
    configurar_navegacion();
}


/* =========================================================
   6. GENERAR MENÚ DEL MÉDICO
   ========================================================= */
function generar_menu_medico() {
    const menu =
        document.getElementById("menu-principal");
    if (!menu) {
        console.error(
            "No se encontró #menu-principal."
        );
        return;
    }

    menu.innerHTML = `
        <!-- CONSULTA EXTERNA -->
        <li id="nav-consulta-externa" class="nav-item">
            <details id="grupo-consulta-externa">
                <summary
                    id="enlace-consulta-externa"
                    class="nav-link"
                >
                    <i class="typcn typcn-clipboard"></i>
                    Consulta Externa
                </summary>

                <nav
                    id="submenu-consulta-externa"
                    class="az-menu-sub"
                >
                    <a
                        href="#"
                        id="opcion-registrar-consulta-externa"
                        class="nav-link"
                        data-modulo="consulta-externa"
                        data-vista="registrar"
                    >
                        <i class="typcn typcn-plus-outline"></i>
                        Registrar consulta
                    </a>
                    <a
                        href="#"
                        id="opcion-consultar-consulta-externa"
                        class="nav-link"
                        data-modulo="consulta-externa"
                        data-vista="consultar"
                    >
                        <i class="typcn typcn-notes-outline"></i>
                        Consultar registros
                    </a>
                </nav>
            </details>
        </li>
        <!-- SALUD BUCAL -->
        <li id="nav-salud-bucal" class="nav-item">
            <a
                href="#"
                id="enlace-salud-bucal"
                class="nav-link with-sub"
                data-seccion="salud-bucal"
            >
                <i class="typcn typcn-heart-outline"></i>
                Salud Bucal
            </a>
            <nav
                id="submenu-salud-bucal"
                class="az-menu-sub"
            >
                <a
                    href="#"
                    id="opcion-registrar-salud-bucal"
                    class="nav-link"
                    data-modulo="salud-bucal"
                    data-vista="registrar"
                >
                    <i class="typcn typcn-plus-outline"></i>
                    Registrar consulta
                </a>
                <a
                    href="#"
                    id="opcion-consultar-salud-bucal"
                    class="nav-link"
                    data-modulo="salud-bucal"
                    data-vista="consultar"
                >
                    <i class="typcn typcn-notes-outline"></i>
                    Consultar registros
                </a>
            </nav>
        </li>
        <!-- DETECCIONES -->
        <li id="nav-detecciones" class="nav-item">
            <a
                href="#"
                id="enlace-detecciones"
                class="nav-link"
                data-modulo="detecciones"
                data-vista="inicio"
            >
                <i class="typcn typcn-beaker"></i>
                Detecciones
            </a>

        </li>
        <!-- PLANIFICACIÓN FAMILIAR -->
        <li
            id="nav-planificacion-familiar"
            class="nav-item"
        >
            <a
                href="#"
                id="enlace-planificacion-familiar"
                class="nav-link"
                data-modulo="planificacion-familiar"
                data-vista="inicio"
            >
                <i class="typcn typcn-contacts"></i>
                Planificación Familiar
            </a>
        </li>
    `;
}


/* =========================================================
   7. CONFIGURAR NAVEGACIÓN
   ========================================================= */
function configurar_navegacion() {
    const menu =
        document.getElementById("menu-principal");
    if (!menu) {
        console.error(
            "No se encontró #menu-principal."
        );
        return;
    }
    // Delegación de eventos.
    // El listener funciona con los enlaces creados
    // dinámicamente mediante innerHTML.
    menu.addEventListener(
        "click",
        async function (evento) {
            const enlace = evento.target.closest(
                "[data-modulo], [data-seccion]"
            );
            if (!enlace || !menu.contains(enlace)) {
                return;
            }
            evento.preventDefault();
            const nombre_modulo =
                enlace.dataset.modulo ||
                enlace.dataset.seccion;
            const vista =
                enlace.dataset.vista || "inicio";
            if (!rutas_modulos[nombre_modulo]) {
                console.warn(
                    "No existe una ruta para el módulo:",
                    nombre_modulo
                );
                return;
            }
            await cargar_modulo(
                nombre_modulo,
                vista
            );
        }
    );
}


/* =========================================================
   8. CARGAR UN MÓDULO
   ========================================================= */

async function cargar_modulo(
    nombre_modulo,
    vista = "inicio"
) {
    const contenedor =
        document.getElementById("contenedor-modulos");
    if (!contenedor) {
        console.error(
            "No se encontró #contenedor-modulos."
        );
        return;
    }
    const ruta = rutas_modulos[nombre_modulo];
    if (!ruta) {
        console.error(
            "Módulo no reconocido:",
            nombre_modulo
        );
        return;
    }
    // Registrar la solicitud actual.
    const id_solicitud = ++solicitud_modulo;

    modulo_actual = nombre_modulo;
    vista_actual = vista;

    // Mostrar directamente el contenedor de módulos.
    // Ya no existe contenido-por-rol.
    contenedor.hidden = false;
    contenedor.innerHTML = `
        <div class="text-center p-4">
            <div
                class="spinner-border"
                role="status"
                aria-label="Cargando"
            ></div>

            <p class="mt-2">
                Cargando módulo...
            </p>
        </div>
    `;

    try {
        // Obtener el HTML del módulo.
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) {
            throw new Error(
                `Error HTTP ${respuesta.status}: ${ruta}`
            );
        }
        const html = await respuesta.text();
        // Ignorar respuestas de solicitudes anteriores.
        if (id_solicitud !== solicitud_modulo) {
            return;
        }
        // Insertar el HTML en el contenedor único.
        contenedor.innerHTML = html;
        // Actualizar la opción activa del menú.
        actualizar_navegacion(
            nombre_modulo,
            vista
        );

        // Inicializar el JS del módulo.
        await inicializar_modulo(
            nombre_modulo,
            vista,
            id_solicitud    
        );

    } catch (error) {
        if (id_solicitud !== solicitud_modulo) {
            return;
        }
        console.error(
            "Error al cargar el módulo:",
            error
        );
        contenedor.innerHTML = `
            <div
                class="alert alert-danger"
                role="alert"
            >
                <h5>Error al cargar el módulo</h5>
                <p>
                    No fue posible cargar el módulo solicitado.
                    Verifica la conexión, la ruta del archivo
                    y vuelve a intentarlo.
                </p>
                <button
                    type="button"
                    id="btn-reintentar-modulo"
                    class="btn btn-outline-danger"
                >
                    Reintentar
                </button>
            </div>
        `;

        const botonReintentar =
            document.getElementById(
                "btn-reintentar-modulo"
            );

        if (botonReintentar) {
            botonReintentar.addEventListener(
                "click",
                function () {
                    cargar_modulo(
                        nombre_modulo,
                        vista
                    );
                }
            );
        }
    }
}

/* =========================================================
   9. INICIALIZAR EL JAVASCRIPT DEL MÓDULO
   ========================================================= */

async function inicializar_modulo(
    nombre_modulo,
    vista,
    id_solicitud
) {

    /*
     * dashboard.js se encuentra en js/
     * Los scripts de módulos están en js/modules/
     *
     * Por eso los imports se escriben como:
     * ./modules/nombre-modulo.js
     */

    const inicializadores = {

        "consulta-externa": () =>
            import("./consulta_externa.js"),

        "salud-bucal": () =>
            import("./modules/salud-bucal.js"),

        "detecciones": () =>
            import("./modules/detecciones.js"),

        "planificacion-familiar": () =>
            import("./modules/planificacion-familiar.js")

    };

    const cargar_inicializador =
        inicializadores[nombre_modulo];
    if (!cargar_inicializador) {
        console.warn(
            "No existe un inicializador para:",
            nombre_modulo
        );
        return;
    }

    const modulo = await cargar_inicializador();
    // Evitar inicializar un módulo que ya fue sustituido
    // mientras se descargaba su archivo JavaScript.
    if (id_solicitud !== solicitud_modulo) {
        return;
    }

    if (typeof modulo.init === "function") {

        await modulo.init({
            vista,
            usuario
        });

    } else {

        console.warn(
            `El módulo ${nombre_modulo} no exporta init().`
        );
    }
}


/* =========================================================
   10. ACTUALIZAR LA OPCIÓN ACTIVA DEL MENÚ
   ========================================================= */

function actualizar_navegacion(nombre_modulo, vista) {
    const menu = document.getElementById("menu-principal");

    if (!menu) {
        return;
    }

    // Quitar el estado activo anterior.
    menu.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    menu.querySelectorAll(".nav-link").forEach(enlace => {
        enlace.classList.remove("active");
        enlace.removeAttribute("aria-current");
    });

    // Buscar la opción seleccionada.
    const enlaces = Array.from(
        menu.querySelectorAll("[data-modulo], [data-seccion]")
    );

    const enlace_activo = enlaces.find(enlace => {
        const modulo_enlace =
            enlace.dataset.modulo || enlace.dataset.seccion;

        const vista_enlace =
            enlace.dataset.vista || "inicio";

        return modulo_enlace === nombre_modulo &&
               vista_enlace === vista;
    });

    if (enlace_activo) {
        enlace_activo.classList.add("active");
        enlace_activo.setAttribute("aria-current", "page");

        const elemento_menu = enlace_activo.closest(".nav-item");

        if (elemento_menu) {
            elemento_menu.classList.add("active");
        }
    }

    // Cerrar los submenús desplegables.
    menu.querySelectorAll("details").forEach(detalle => {
        detalle.open = false;
    });
}


function abrir_modal_nuevo_paciente() {

    modal_manager.mostrar({

        titulo: 'Registrar paciente',

        icono: 'fa-solid fa-hospital-user',

        texto_guardar: 'Registrar paciente',

        icono_guardar: 'fa-solid fa-user-plus',

        descripcion:
            'Ingresa los datos generales del paciente.',

        campos: [

            {
                id: 'paciente_curp',
                nombre: 'curp',
                etiqueta: 'CURP',
                tipo: 'text',
                columna: 'col-md-6 mb-3',
                placeholder: 'Ingresa la CURP',
                requerido: true,
                maxlength: 18
            },

            {
                id: 'paciente_nombre',
                nombre: 'nombre',
                etiqueta: 'Nombre(s)',
                tipo: 'text',
                columna: 'col-md-6 mb-3',
                placeholder: 'Nombre del paciente',
                requerido: true
            },

            {
                id: 'paciente_apellido_paterno',
                nombre: 'apellido_paterno',
                etiqueta: 'Apellido paterno',
                tipo: 'text',
                columna: 'col-md-6 mb-3',
                requerido: true
            },

            {
                id: 'paciente_apellido_materno',
                nombre: 'apellido_materno',
                etiqueta: 'Apellido materno',
                tipo: 'text',
                columna: 'col-md-6 mb-3'
            },

            {
                id: 'paciente_fecha_nacimiento',
                nombre: 'fecha_nacimiento',
                etiqueta: 'Fecha de nacimiento',
                tipo: 'date',
                columna: 'col-md-6 mb-3',
                requerido: true
            },

            {
                id: 'paciente_sexo',
                nombre: 'sexo',
                etiqueta: 'Sexo',
                tipo: 'select',
                columna: 'col-md-6 mb-3',
                requerido: true,

                opciones: [
                    { valor: 'M', texto: 'Masculino' },
                    { valor: 'F', texto: 'Femenino' }
                ]
            }

        ],

        onSubmit: async (datos) => {

            console.log('Datos del paciente:', datos);

            // Aquí conectarás tu operación de guardado.
            // Ejemplo: llamar a tu API o backend.

        }

    });
}

