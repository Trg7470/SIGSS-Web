const url_base = "http://localhost:3000/api";
const por_pagina = 20;

let pagina_actual = 1;
let total_paginas = 1;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("form-filtros-bitacora").addEventListener("submit", (evento) => {
        evento.preventDefault();
        buscar_bitacora(1);
    });

    document.getElementById("boton-limpiar-filtros").addEventListener("click", () => {
        document.getElementById("form-filtros-bitacora").reset();
    });

    document.getElementById("pagina-anterior").addEventListener("click", (evento) => {
        evento.preventDefault();
        if (pagina_actual > 1) buscar_bitacora(pagina_actual - 1);
    });

    document.getElementById("pagina-siguiente").addEventListener("click", (evento) => {
        evento.preventDefault();
        if (pagina_actual < total_paginas) buscar_bitacora(pagina_actual + 1);
    });

    document.getElementById("pagina-primera").addEventListener("click", (evento) => {
        evento.preventDefault();
        if (pagina_actual > 1) buscar_bitacora(1);
    });

    document.getElementById("pagina-ultima").addEventListener("click", (evento) => {
        evento.preventDefault();
        if (pagina_actual < total_paginas) buscar_bitacora(total_paginas);
    });

    document.getElementById("boton-mis-acciones").addEventListener("click", () => {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");

        if (!usuario.Id_Usuario) {
            mostrarPopup({
                titulo: "Error",
                mensaje: "No se pudo identificar al usuario actual.",
                tipo: "error",
            });
            return;
        }

        document.getElementById("filtro-usuario").value = usuario.Id_Usuario;
        buscar_bitacora(1);
    });

    document.getElementById("boton-exportar-excel").addEventListener("click", () => exportar_bitacora("xlsx"));
    document.getElementById("boton-exportar-pdf").addEventListener("click", () => exportar_bitacora("pdf"));

    document.getElementById("titulo-bienvenida").textContent = "Bitácora de actividades";
    document.getElementById("descripcion-bienvenida").textContent = "Registro de todas las actividades realizadas en el sistema.";
    cargar_usuarios();
});

async function cargar_usuarios() {
    try {
        const respuesta = await fetch(`${url_base}/usuarios`, {
            credentials: "include"
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.error || "No fue posible cargar los usuarios");
        }

        const select_usuario = document.getElementById("filtro-usuario");
        resultado.data.forEach((usuario) => {
            const opcion = document.createElement("option");
            opcion.value = usuario.Id_Usuario;
            opcion.textContent = `${usuario.Nombre} ${usuario.Apellido_Paterno} ${usuario.Apellido_Materno}`;
            select_usuario.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
    }
}

async function buscar_bitacora(pagina) {
    const fecha_inicio = document.getElementById("filtro-fecha-inicial").value;
    const fecha_fin = document.getElementById("filtro-fecha-final").value;
    const id_usuario = document.getElementById("filtro-usuario").value;
    const modulo = document.getElementById("filtro-modulo").value;
    const busqueda = document.getElementById("filtro-busqueda").value.trim();

    if (!fecha_inicio || !fecha_fin) {
        mostrarPopup({
            titulo: "Error",
            mensaje: "Debes seleccionar fecha inicial y final.",
            tipo: "error",
        });
        return;
    }

    pagina_actual = pagina;

    const parametros = new URLSearchParams({ fecha_inicio, fecha_fin, pagina });
    if (id_usuario) parametros.append("id_usuario", id_usuario);
    if (modulo) parametros.append("modulo", modulo);
    if (busqueda) parametros.append("busqueda", busqueda);

    try {
        const respuesta = await fetch(`${url_base}/bitacora/consultar?${parametros.toString()}`, {
            credentials: "include"
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.error || "Error al consultar la bitácora");
        }

        pintar_tabla(resultado.data);
        actualizar_paginacion(resultado.total, pagina);
    } catch (error) {
        console.error("Error al consultar la bitácora:", error);
        mostrarPopup({
            titulo: "Error",
            mensaje: "No fue posible cargar los registros de la bitácora.",
            tipo: "error",
        });
    }
}

function pintar_tabla(registros) {
    const cuerpo_tabla = document.getElementById("cuerpo-tabla-bitacora");
    cuerpo_tabla.innerHTML = "";

    if (registros.length === 0) {
        cuerpo_tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    No se encontraron registros con los filtros aplicados.
                </td>
            </tr>`;
        return;
    }

    registros.forEach((registro) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
    <td>${formatear_fecha_hora(registro.Fecha_Hora)}</td>
    <td>${registro.Usuario}</td>
    <td>${registro.Modulo}</td>
    <td>${obtener_badge_accion(registro.Accion)}</td>
    <td>${registro.Tabla_Afectada ?? "—"}</td>
`;
        cuerpo_tabla.appendChild(fila);
    });
}

function formatear_fecha_hora(fecha_hora) {
    const fecha = new Date(fecha_hora);
    return fecha.toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function actualizar_paginacion(total, pagina) {
    total_paginas = Math.max(Math.ceil(total / por_pagina), 1);
    document.getElementById("contador-resultados").textContent = total;

    const inicio = total === 0 ? 0 : (pagina - 1) * por_pagina + 1;
    const fin = Math.min(pagina * por_pagina, total);
    document.getElementById("texto-paginacion").textContent =
        `Mostrando ${inicio} a ${fin} de ${total} registros`;

    const lista_paginacion = document.getElementById("paginacion-bitacora");
    lista_paginacion
        .querySelectorAll(".page-item:not(#pagina-primera):not(#pagina-anterior):not(#pagina-siguiente):not(#pagina-ultima)")
        .forEach((elemento) => elemento.remove());

    const item_actual = document.createElement("li");
    item_actual.className = "page-item active";
    item_actual.innerHTML = `<a class="page-link" href="#">${pagina}</a>`;
    document.getElementById("pagina-siguiente").insertAdjacentElement("beforebegin", item_actual);

    document.getElementById("pagina-primera").classList.toggle("disabled", pagina === 1);
    document.getElementById("pagina-anterior").classList.toggle("disabled", pagina === 1);
    document.getElementById("pagina-siguiente").classList.toggle("disabled", pagina === total_paginas);
    document.getElementById("pagina-ultima").classList.toggle("disabled", pagina === total_paginas);
}

function obtener_badge_accion(accion) {
    const mapa_colores = {
        'CREAR': 'success',
        'ACTUALIZAR': 'primary',
        'DESACTIVAR': 'danger',
        'Inicio de sesión': 'secondary',
        'Cierre de sesión': 'secondary'
    };
    const color = mapa_colores[accion] || 'info';
    return `<span class="badge badge-${color}">${accion}</span>`;
}

async function exportar_bitacora(tipo_salida) {
    const fecha_inicio = document.getElementById("filtro-fecha-inicial").value;
    const fecha_fin = document.getElementById("filtro-fecha-final").value;
    const id_usuario = document.getElementById("filtro-usuario").value;
    const modulo = document.getElementById("filtro-modulo").value;
    const busqueda = document.getElementById("filtro-busqueda").value.trim();

    if (!fecha_inicio || !fecha_fin) {
        mostrarPopup({
            titulo: "Error",
            mensaje: "Debes seleccionar fecha inicial y final para exportar.",
            tipo: "error",
        });
        return;
    }

    const parametros = new URLSearchParams({ fecha_inicio, fecha_fin, tipo_salida });
    if (id_usuario) parametros.append("id_usuario", id_usuario);
    if (modulo) parametros.append("modulo", modulo);
    if (busqueda) parametros.append("busqueda", busqueda);

    try {
        const respuesta = await fetch(`${url_base}/bitacora/exportar?${parametros.toString()}`, {
            credentials: "include"
        });

        if (!respuesta.ok) {
            const resultado = await respuesta.json().catch(() => ({}));
            throw new Error(resultado.error || "No fue posible generar el reporte.");
        }

        const blob = await respuesta.blob();
        const nombre_archivo = obtener_nombre_descarga(respuesta) || `bitacora.${tipo_salida}`;

        const url_descarga = window.URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url_descarga;
        enlace.download = nombre_archivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.URL.revokeObjectURL(url_descarga);
    } catch (error) {
        console.error("Error al exportar bitácora:", error);
        mostrarPopup({
            titulo: "Error",
            mensaje: error.message || "No fue posible generar el reporte.",
            tipo: "error",
        });
    }
}

function obtener_nombre_descarga(respuesta) {
    const disposicion = respuesta.headers.get("Content-Disposition");
    if (!disposicion) return null;
    const coincidencia = /filename="?([^"]+)"?/.exec(disposicion);
    return coincidencia ? coincidencia[1] : null;
}