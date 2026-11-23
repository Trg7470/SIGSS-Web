/* =========================================================
   SIGSS | DASHBOARD
   Navegación tradicional mediante archivos HTML
   ========================================================= */


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
   2. INICIALIZACIÓN DEL DASHBOARD
   ========================================================= */

document.addEventListener("DOMContentLoaded", cargar_dashboard);


async function cargar_dashboard() {

    // Validar sesión.
    if (!usuario || !usuario.Rol) {

        if (typeof mostrarPopup === "function") {

            mostrarPopup({
                titulo: "No has iniciado sesión",
                mensaje: "Redirigiendo a la página de inicio de sesión...",
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

    // Descripción.
    const descripcionBienvenida =
        document.getElementById("descripcion-bienvenida");

    if (descripcionBienvenida) {
        descripcionBienvenida.textContent =
            "Sistema Integral de Gestión de Servicios de Salud.";
    }

    // Nombre del usuario.
    const nombreUsuario =
        document.getElementById("nombre-usuario");

    if (nombreUsuario) {
        nombreUsuario.textContent =
            usuario.Nombre || "Usuario";
    }

    // Rol.
    const rolUsuario =
        document.getElementById("rol-usuario");

    if (rolUsuario) {
        rolUsuario.textContent = usuario.Rol;
    }

    // Generar menú según el rol.
    switch (usuario.Rol) {

        case "Médico":
            generar_menu_medico();
            break;
        case "Personal administrativo":
            generar_menu_administrativo();
            break;
        default:
            console.warn(
                "No existe un menú configurado para el rol:",
                usuario.Rol
            );
            break;
    }

    // Marcar la página actual en el menú.
    actualizar_navegacion();

    // Mostrar/ocultar los submenús de los módulos al pasar el cursor.
    inicializar_submenus();

    // Mostrar/ocultar notificaciones y perfil (incluye cerrar sesión) al pasar el cursor.
    inicializar_menus_cabecera();

    // Vincular el botón de cerrar sesión.
    const botonCerrarSesion =
        document.getElementById("opcion-cerrar-sesion");

    if (botonCerrarSesion) {
        botonCerrarSesion.addEventListener("click", cerrar_sesion);
    }
}


/* =========================================================
   2.1 CERRAR SESIÓN
   ========================================================= */

async function cerrar_sesion(evento) {

    if (evento) evento.preventDefault();

    let confirmado = true;

    if (typeof mostrarPopup === "function") {
        confirmado = await mostrarPopup({
            titulo: "Cerrar sesión",
            mensaje: "¿Seguro que deseas cerrar tu sesión?",
            tipo: "advertencia",
            confirmar: true,
            textoConfirmar: "Sí, cerrar sesión",
            textoCancelar: "Cancelar"
        });
    }

    if (!confirmado) return;

    // Eliminar por completo los datos de la sesión del navegador.
    sessionStorage.clear();

    if (typeof mostrarPopup === "function") {
        mostrarPopup({
            titulo: "Sesión cerrada",
            mensaje: "Redirigiendo a la página de inicio de sesión...",
            tipo: "exito"
        });

        await new Promise(resolve => setTimeout(resolve, 1200));
    }

    window.location.href = "../../index.html";
}


/* =========================================================
   3. GENERAR MENÚ DEL MÉDICO
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
        <!-- HOME -->
        <li id="nav-home" class="nav-item">
            <a
                href="/pages/dashboard/dashboard.html"
                id="enlace-home"
                class="nav-link"
                data-modulo="home"
                data-vista="inicio"
            >
                <i class="typcn typcn-home"></i>
                Home
            </a>
        </li>
        <!-- MODULOS (agrupa consulta externa, salud bucal, detecciones y planificacion familiar) -->
        <li id="nav-modulos" class="nav-item">
            <details id="grupo-modulos">
                <summary
                    id="enlace-modulos"
                    class="nav-link"
                >
                    <i class="typcn typcn-th-list"></i>
                    Módulos
                </summary>
                <nav
                    id="submenu-modulos"
                    class="az-menu-sub"
                >
                    <!-- CONSULTA EXTERNA -->
                    <details id="grupo-consulta-externa" name="grupo-modulos-items">
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
                                href="/pages/modules/consulta-externa/registrar.html"
                                id="opcion-registrar-consulta-externa"
                                class="nav-link"
                                data-modulo="consulta-externa"
                                data-vista="registrar"
                            >
                                <i class="typcn typcn-plus-outline"></i>
                                Registrar consulta
                            </a>
                            <a
                                href="/pages/modules/consulta-externa/consultar.html"
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
                    <!-- SALUD BUCAL -->
                    <details id="grupo-salud-bucal" name="grupo-modulos-items">
                        <summary
                            id="enlace-salud-bucal"
                            class="nav-link"
                        >
                            <i class="typcn typcn-heart-outline"></i>
                            Salud Bucal
                        </summary>
                        <nav
                            id="submenu-salud-bucal"
                            class="az-menu-sub"
                        >
                            <a
                                href="/pages/modules/salud-bucal/registrar.html"
                                id="opcion-registrar-salud-bucal"
                                class="nav-link"
                                data-modulo="salud-bucal"
                                data-vista="registrar"
                            >
                                <i class="typcn typcn-plus-outline"></i>
                                Registrar consulta
                            </a>
                            <a
                                href="/pages/modules/salud-bucal/consultar.html"
                                id="opcion-consultar-salud-bucal"
                                class="nav-link"
                                data-modulo="salud-bucal"
                                data-vista="consultar"
                            >
                                <i class="typcn typcn-notes-outline"></i>
                                Consultar registros
                            </a>
                        </nav>
                    </details>
                    <!-- DETECCIONES -->
                    <a
                        href="/pages/modules/detecciones/index.html"
                        id="enlace-detecciones"
                        class="nav-link"
                        data-modulo="detecciones"
                        data-vista="inicio"
                    >
                        <i class="typcn typcn-beaker"></i>
                        Detecciones
                    </a>
                    <!-- PLANIFICACIÓN FAMILIAR -->
                    <details id="grupo-planificacion-familiar" name="grupo-modulos-items">
                        <summary
                            id="enlace-planificacion-familiar"
                            class="nav-link"
                        >
                            <i class="typcn typcn-clipboard"></i>
                            Planificación Familiar
                        </summary>
                        <nav
                            id="submenu-planificacion-familiar"
                            class="az-menu-sub"
                        >
                            <a
                                href="/pages/modules/planificacion-familiar/registrar.html"
                                id="opcion-registrar-planificacion-familiar"
                                class="nav-link"
                                data-modulo="planificacion-familiar"
                                data-vista="registrar"
                            >
                                <i class="typcn typcn-plus-outline"></i>
                                Registrar consulta
                            </a>
                            <a
                                href="/pages/modules/planificacion-familiar/consultar.html"
                                id="opcion-consultar-planificacion-familiar"
                                class="nav-link"
                                data-modulo="planificacion-familiar"
                                data-vista="consultar"
                            >
                                <i class="typcn typcn-notes-outline"></i>
                                Consultar registros
                            </a>
                        </nav>
                    </details>
                </nav>
            </details>
        </li>
        <!-- REPORTES -->
        <li id="nav-reportes" class="nav-item">
            <details id="grupo-reportes">
                <summary
                    id="enlace-reportes"
                    class="nav-link"
                >
                    <i class="typcn typcn-document-text"></i>
                    Reportes
                </summary>
                <nav
                    id="submenu-reportes"
                    class="az-menu-sub"
                >
                    <a
                        href="/pages/modules/reportes/hoja_diaria.html"
                        id="opcion-hoja-diaria"
                        class="nav-link"
                        data-modulo="reportes"
                        data-vista="hoja-diaria"
                    >
                        <i class="typcn typcn-calendar"></i>
                        Hoja diaria
                    </a>
                </nav>
            </details>
        </li>
        <!-- PACIENTES -->
        <li id="nav-pacientes" class="nav-item">
            <a
                href="/pages/modules/pacientes/index.html"
                id="opcion-registrar-pacientes"
                class="nav-link"
                data-modulo="pacientes"
                data-vista="pacientes"
            >
                <i class="typcn typcn-user"></i>
                Pacientes
            </a>
        </li>
    `;
}

function generar_menu_administrativo()
{
     const menu =
        document.getElementById("menu-principal");
    if (!menu) {
        console.error(
            "No se encontró #menu-principal."
        );
        return;
    }

    menu.innerHTML = `
        <!-- HOME -->
        <li id="nav-home" class="nav-item">
            <a
                href="/pages/dashboard/dashboard.html"
                id="enlace-home"
                class="nav-link"
                data-modulo="home"
                data-vista="inicio"
            >
                <i class="typcn typcn-home"></i>
                Home
            </a>
        </li>
        <!-- MODULOS (agrupa consulta externa, salud bucal, detecciones y planificacion familiar) -->
        <!-- REPORTES -->
        <li id="nav-reportes" class="nav-item">
            <details id="grupo-reportes">
                <summary
                    id="enlace-reportes"
                    class="nav-link"
                >
                    <i class="typcn typcn-document-text"></i>
                    Reportes
                </summary>
                <nav
                    id="submenu-reportes"
                    class="az-menu-sub"
                >
                    <a
                        href="/pages/modules/reportes/hoja_diaria.html"
                        id="opcion-hoja-diaria"
                        class="nav-link"
                        data-modulo="reportes"
                        data-vista="hoja-diaria"
                    >
                        <i class="typcn typcn-calendar"></i>
                        Hoja diaria
                    </a>
                </nav>
            </details>
        </li>
        <!-- PACIENTES -->
        <li id="nav-pacientes" class="nav-item">
            <a
                href="/pages/modules/pacientes/index.html"
                id="opcion-registrar-pacientes"
                class="nav-link"
                data-modulo="pacientes"
                data-vista="pacientes"
            >
                <i class="typcn typcn-user"></i>
                Pacientes
            </a>
        </li>
    `;
}
/* =========================================================
   4. ACTUALIZAR NAVEGACIÓN ACTIVA
   ========================================================= */

function actualizar_navegacion() {

    const menu =
        document.getElementById("menu-principal");

    if (!menu) return;

    const ruta_actual =
        window.location.pathname;

    // Quitar estados activos anteriores.
    menu.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    menu.querySelectorAll(".nav-link").forEach(enlace => {
        enlace.classList.remove("active");
        enlace.removeAttribute("aria-current");
    });

    // Identificar el enlace correspondiente a la página actual.
    const enlaces = menu.querySelectorAll(
        "a[data-modulo]"
    );

    enlaces.forEach(enlace => {

        const ruta_enlace =
            new URL(enlace.href).pathname;

        if (ruta_enlace === ruta_actual) {

            enlace.classList.add("active");

            enlace.setAttribute(
                "aria-current",
                "page"
            );

            const elemento_menu =
                enlace.closest(".nav-item");

            if (elemento_menu) {
                elemento_menu.classList.add("active");
            }

            // Mantener abierto el submenú correspondiente (y, si aplica,
            // también el/los <details> ancestro(s), como "Módulos").
            let detalle_ancestro =
                enlace.closest("details");

            while (detalle_ancestro) {
                detalle_ancestro.open = true;
                detalle_ancestro =
                    detalle_ancestro.parentElement
                        ? detalle_ancestro.parentElement.closest("details")
                        : null;
            }

        }

    });

}


/* =========================================================
   5. SUBMENÚS Y DESPLEGABLES (hover con margen para seleccionar)
   ========================================================= */

// Milisegundos de margen antes de ocultar, para dar tiempo a mover
// el cursor desde el botón hasta la lista sin que se cierre sola.
const RETARDO_CIERRE_HOVER = 350;

// Solo aplica el comportamiento de "hover" en escritorio; en móvil
// los desplegables se siguen abriendo con un toque (clic).
const esEscritorio = window.matchMedia("(min-width: 992px)");

/**
 * Activa mostrar/ocultar por hover (con margen de tiempo) sobre un
 * elemento, usando las funciones que se le pasan para leer y cambiar
 * su estado de "abierto".
 */
function activar_hover_con_retardo(elemento, { estaAbierto, establecerAbierto }) {

    let temporizador = null;

    const cancelarCierre = () => {
        if (temporizador) {
            clearTimeout(temporizador);
            temporizador = null;
        }
    };

    elemento.addEventListener("mouseenter", () => {
        if (!esEscritorio.matches) return;
        cancelarCierre();
        establecerAbierto(true);
    });

    elemento.addEventListener("mouseleave", () => {
        if (!esEscritorio.matches) return;
        cancelarCierre();
        temporizador = setTimeout(() => {
            establecerAbierto(false);
            temporizador = null;
        }, RETARDO_CIERRE_HOVER);
    });

    // Si el elemento vuelve a recibir el foco (teclado) mientras
    // estaba por cerrarse, cancelar el cierre.
    elemento.addEventListener("focusin", cancelarCierre);
}


function inicializar_submenus() {

    const menu =
        document.getElementById("menu-principal");

    if (!menu) return;

    const detalles =
        menu.querySelectorAll(".nav-item > details");

    detalles.forEach(detalle => {

        activar_hover_con_retardo(detalle, {
            estaAbierto: () => detalle.open,
            establecerAbierto: (abierto) => {

                if (abierto) {
                    // Cerrar cualquier otro submenú que haya quedado abierto.
                    detalles.forEach(otro => {
                        if (otro !== detalle) otro.open = false;
                    });
                }

                detalle.open = abierto;
            }
        });

        // Ocultarlo automáticamente solo al seleccionar un destino final
        // de navegación (un <a> con data-modulo). Importante: NO usar un
        // selector tipo ".az-menu-sub .nav-link", porque eso también
        // atrapa los <summary class="nav-link"> de los submenús anidados
        // (p. ej. "Consulta Externa" dentro de "Módulos"); si se hiciera,
        // al hacer clic en esos encabezados el navegador abriría su
        // <details> interno de forma nativa pero, en el mismo instante,
        // este listener cerraría el <details> exterior ("Módulos"),
        // dando la apariencia de que el menú "se cierra solo".
        detalle.querySelectorAll(".az-menu-sub a[data-modulo]")
            .forEach(enlace => {
                enlace.addEventListener("click", () => {
                    detalle.open = false;
                });
            });

    });

}


/* =========================================================
   6. NOTIFICACIONES Y PERFIL (hover con margen para seleccionar)
   ========================================================= */

function inicializar_menus_cabecera() {

    const notificaciones =
        document.getElementById("seccion-notificaciones");

    const perfil =
        document.getElementById("seccion-perfil");

    const contenedores =
        [notificaciones, perfil].filter(Boolean);

    contenedores.forEach(contenedor => {

        activar_hover_con_retardo(contenedor, {
            estaAbierto: () => contenedor.classList.contains("show"),
            establecerAbierto: (abierto) => {

                if (abierto) {
                    // Cerrar el otro desplegable si estaba abierto.
                    contenedores.forEach(otro => {
                        if (otro !== contenedor) otro.classList.remove("show");
                    });
                }

                contenedor.classList.toggle("show", abierto);
            }
        });

        // Ocultarlo automáticamente al seleccionar una opción.
        contenedor.querySelectorAll(".dropdown-item")
            .forEach(opcion => {
                opcion.addEventListener("click", () => {
                    contenedor.classList.remove("show");
                });
            });

    });

}