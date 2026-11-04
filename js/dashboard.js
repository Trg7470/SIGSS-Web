
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

        default:
            console.warn(
                "No existe un menú configurado para el rol:",
                usuario.Rol
            );
            break;
    }

    // Marcar la página actual en el menú.
    actualizar_navegacion();
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
                        href="../modules/consulta-externa/registrar.html"
                        id="opcion-registrar-consulta-externa"
                        class="nav-link"
                        data-modulo="consulta-externa"
                        data-vista="registrar"
                    >
                        <i class="typcn typcn-plus-outline"></i>
                        Registrar consulta
                    </a>

                    <a
                        href="../modules/consulta-externa/consultar.html"
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

            <details id="grupo-salud-bucal">

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
                        href="../modules/salud-bucal/registrar.html"
                        id="opcion-registrar-salud-bucal"
                        class="nav-link"
                        data-modulo="salud-bucal"
                        data-vista="registrar"
                    >
                        <i class="typcn typcn-plus-outline"></i>
                        Registrar consulta
                    </a>

                    <a
                        href="../modules/salud-bucal/consultar.html"
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

        </li>


        <!-- DETECCIONES -->
        <li id="nav-detecciones" class="nav-item">

            <a
                href="../modules/detecciones/index.html"
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
        <li id="nav-planificacion-familiar" class="nav-item">

            <details id="grupo-planificacion-familiar">

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
                        href="../modules/planificacion-familiar/registrar.html"
                        id="opcion-registrar-planificacion-familiar"
                        class="nav-link"
                        data-modulo="planificacion-familiar"
                        data-vista="registrar"
                    >
                        <i class="typcn typcn-plus-outline"></i>
                        Registrar consulta
                    </a>

                    <a
                        href="../modules/planificacion-familiar/consultar.html"
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

            // Mantener abierto el submenú correspondiente.
            const detalle =
                enlace.closest("details");

            if (detalle) {
                detalle.open = true;
            }

        }

    });

}
