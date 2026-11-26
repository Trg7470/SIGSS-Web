const url_base = "http://localhost:3000/api";
const Usuario = JSON.parse(sessionStorage.getItem("usuario"));

document.addEventListener("DOMContentLoaded", () => {
    cargar_modulos();

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


    const formulario = document.getElementById("form_filtros_informe");
    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        exportar_informe_mensual();
    });

    document.getElementById("anio").value = new Date().getFullYear();
});

/**
 * Llena el <select> de módulos consultando al backend, para no tener
 * los nombres de los módulos hardcodeados dos veces (aquí y en el
 * servicio de Excel).
 */
async function cargar_modulos() {
    const selector_modulo = document.getElementById("modulo");
    try {
        const respuesta = await fetch(`${url_base}/informe-mensual/modulos`, {
            credentials: "include",
        });
        if (!respuesta.ok) throw new Error("No se pudieron cargar los módulos");

        const modulos = await respuesta.json();
        selector_modulo.innerHTML = '<option value="">Selecciona un módulo</option>';
        modulos.forEach((modulo) => {
            const opcion = document.createElement("option");
            opcion.value = modulo.id;
            opcion.textContent = modulo.titulo;
            selector_modulo.appendChild(opcion);
        });
    } catch (error) {
        console.error(error);
        mostrarPopup({
            titulo: "No se pudieron cargar los módulos",
            mensaje: "No se pudieron cargar los módulos disponibles.",
            tipo: "error",
            boton: true,
        });
    }
}

/**
 * Pide el Excel al backend y lo descarga, igual que
 * exportar_bitacora() en bitacora.js, usando el popup compartido
 * (carga → éxito/error) en vez de un mensaje aparte.
 */
async function exportar_informe_mensual() {
    const modulo = document.getElementById("modulo").value;
    const mes = document.getElementById("mes").value;
    const anio = document.getElementById("anio").value;
    const boton = document.getElementById("btn_generar_excel");
    const id_unidad = 8;
    const responsable = Usuario.Nombre + " " + Usuario.Apellido_Paterno + " " + Usuario.Apellido_Materno;

    if (!modulo || !mes || !anio) {
        mostrarPopup({
            titulo: "Datos incompletos",
            mensaje: "Selecciona módulo, mes y año.",
            tipo: "advertencia",
            boton: true,
        });
        return;
    }

    const parametros = new URLSearchParams({ modulo, mes, anio, id_unidad, responsable });

    const texto_original = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Generando...";

    mostrarPopup({
        titulo: "Generando informe...",
        mensaje: "Espere un momento mientras se genera el archivo.",
        tipo: "carga",
    });

    try {
        const respuesta = await fetch(`${url_base}/informe-mensual/exportar?${parametros}`, {
            credentials: "include",
        });

        if (!respuesta.ok) {
            const error = await respuesta.json().catch(() => ({}));
            throw new Error(error.mensaje || "No se pudo generar el informe mensual.");
        }

        const blob = await respuesta.blob();
        const nombre_descarga = obtener_nombre_descarga(respuesta, "Informe_Mensual_" + new Date().toISOString().slice(0, 10) + ".xlsx");
        descargar_blob(blob, nombre_descarga);

        cerrarPopup();
        mostrarPopup({
            titulo: "Informe generado",
            mensaje: "Informe mensual generado correctamente.",
            tipo: "exito",
            boton: true,
        });
    } catch (error) {
        console.error(error);
        cerrarPopup();
        mostrarPopup({
            titulo: "No se pudo generar el informe",
            mensaje: error.message,
            tipo: "error",
            boton: true,
        });
    } finally {
        boton.disabled = false;
        boton.textContent = texto_original;
    }
}

function descargar_blob(blob, nombre_archivo) {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre_archivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
}

function obtener_nombre_descarga(respuesta, nombre_por_defecto) {
    const disposicion = respuesta.headers.get("Content-Disposition");
    if (!disposicion) return nombre_por_defecto;

    const coincidencia = disposicion.match(/filename="?([^"]+)"?/);
    return coincidencia ? coincidencia[1] : nombre_por_defecto;
}