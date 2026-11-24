let usuario = null;
const RETARDO_CIERRE_HOVER = 350;
const escritorio = window.matchMedia("(min-width: 992px)");

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

document.addEventListener("DOMContentLoaded", cargar_dashboard);
async function cargar_dashboard() {

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

    const titulo_bienvenida =
        document.getElementById("titulo-bienvenida");
    if (titulo_bienvenida) {
        titulo_bienvenida.textContent =
            `¡Bienvenido de nuevo a SIGSS, ${usuario.Nombre || "Usuario"}!`;
    }

    const descripcion_bienvenida =
        document.getElementById("descripcion-bienvenida");
    if (descripcion_bienvenida) {
        descripcion_bienvenida.textContent =
            "Sistema Integral de Gestión de Servicios de Salud.";
    }

    const nombre_usuario =
        document.getElementById("nombre-usuario");
    if (nombre_usuario) {
        nombre_usuario.textContent =
            usuario.Nombre || "Usuario";
    }

    const rol_usuario =
        document.getElementById("rol-usuario");
    if (rol_usuario) {
        rol_usuario.textContent = usuario.Rol;
    }

    switch (usuario.Rol) {

        case "Médico":
            generar_menu_medico();
            break;
        case "Personal administrativo":
            generar_menu_administrativo();
            break;
        case "Administrador":
            generar_menu_administrador();
            break;
        default:
            console.warn(
                "No existe un menú configurado para el rol:",
                usuario.Rol
            );
            break;
    }

    actualizar_navegacion();
    inicializar_submenus();
    inicializar_menus_cabecera();

    const btn_cerrar_sesion =
        document.getElementById("opcion-cerrar-sesion");
    if (btn_cerrar_sesion) {
        btn_cerrar_sesion.addEventListener("click", cerrar_sesion);
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

function generar_menu_administrador()
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
        <!-- BITACORA -->
        <li id="nav-bitacora" class="nav-item">
            <a
                href="/pages/modules/bitacora/index.html"
                id="opcion-bitacora"
                class="nav-link"
                data-modulo="bitacora"
                data-vista="bitacora"
            >
                <i class="typcn typcn-time"></i>
                Bitácora
            </a>
        </li>
        <!-- USUARIOS -->
        <li id="nav-usuarios" class="nav-item">
            <a
                href="/pages/modules/usuarios/index.html"
                id="opcion-usuarios"
                class="nav-link"
                data-modulo="usuarios"
                data-vista="usuarios"
            >
                <i class="typcn typcn-group"></i>
                Usuarios
            </a>
        </li>
    `;
}

function actualizar_navegacion() {
    const menu =
        document.getElementById("menu-principal");
    if (!menu) return;
    const ruta_actual =
        window.location.pathname;

    menu.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    menu.querySelectorAll(".nav-link").forEach(enlace => {
        enlace.classList.remove("active");
        enlace.removeAttribute("aria-current");
    });

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
            let detalle =
                enlace.closest("details");

            while (detalle) {
                detalle.open = true;
                detalle =
                    detalle.parentElement
                        ? detalle.parentElement.closest("details")
                        : null;
            }

        }

    });

}




function activar_hover(elemento, { abierto, establecer_abierto }) {

    let temporizador = null;

    const cancelarCierre = () => {
        if (temporizador) {
            clearTimeout(temporizador);
            temporizador = null;
        }
    };

    elemento.addEventListener("mouseenter", () => {
        if (!escritorio.matches) return;
        cancelarCierre();
        establecer_abierto(true);
    });

    elemento.addEventListener("mouseleave", () => {
        if (!escritorio.matches) return;
        cancelarCierre();
        temporizador = setTimeout(() => {
            establecer_abierto(false);
            temporizador = null;
        }, RETARDO_CIERRE_HOVER);
    });
    elemento.addEventListener("focusin", cancelarCierre);
}


function inicializar_submenus() {

    const menu =
        document.getElementById("menu-principal");

    if (!menu) return;

    const detalles =
        menu.querySelectorAll(".nav-item > details");

    detalles.forEach(detalle => {

        activar_hover(detalle, {
            abierto: () => detalle.open,
            establecer_abierto: (abierto) => {

                if (abierto) {
                    // Cerrar cualquier otro submenú que haya quedado abierto.
                    detalles.forEach(otro => {
                        if (otro !== detalle) otro.open = false;
                    });
                }

                detalle.open = abierto;
            }
        });
        detalle.querySelectorAll(".az-menu-sub a[data-modulo]")
            .forEach(enlace => {
                enlace.addEventListener("click", () => {
                    detalle.open = false;
                });
            });

    });

}


function inicializar_menus_cabecera() {

    const notificaciones =
        document.getElementById("seccion-notificaciones");

    const perfil =
        document.getElementById("seccion-perfil");

    const contenedores =
        [notificaciones, perfil].filter(Boolean);

    contenedores.forEach(contenedor => {

        activar_hover(contenedor, {
            abierto: () => contenedor.classList.contains("show"),
            establecer_abierto: (abierto) => {

                if (abierto) {
                    contenedores.forEach(otro => {
                        if (otro !== contenedor) otro.classList.remove("show");
                    });
                }

                contenedor.classList.toggle("show", abierto);
            }
        });

        contenedor.querySelectorAll(".dropdown-item")
            .forEach(opcion => {
                opcion.addEventListener("click", () => {
                    contenedor.classList.remove("show");
                });
            });

    });

}