import {
    mensaje_por_estado,
    obtener_mensaje_error,
    es_error_de_red,
    MENSAJE_SIN_CONEXION,
    crear_paginador,
    llenar_select
} from "./utils.js";

const Usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

const BASE_API = "http://localhost:3000/api";
const LIMITE_POR_PAGINA = 10;

let roles_json = [];
let tipos_personal_json = [];
let paginador = null;
let pagina_actual_vista = 1;
const ID_ROL_MEDICO = 1;

document.addEventListener("DOMContentLoaded", async () => {
    if (!Usuario || Usuario.Rol !== "Administrador") {
        mostrarPopup({
            tipo: "error",
            titulo: "Acceso restringido",
            mensaje: "Este módulo es exclusivo del administrador.",
            boton: true
        });
        window.location.href = "/pages/dashboard/dashboard.html";
        return;
    }

    document.getElementById("form-filtros-usuarios")
        .addEventListener("submit", (evento) => {
            evento.preventDefault();
            listar_usuarios(1);
        });

    document.getElementById("boton-limpiar-filtros-usuarios")
        .addEventListener("click", () => {
            document.getElementById("form-filtros-usuarios").reset();
            listar_usuarios(1);
        });

    document.getElementById("boton-nuevo-usuario")
        .addEventListener("click", () => abrir_alta_usuario());

    document.getElementById("cuerpo-tabla-usuarios")
        .addEventListener("click", manejar_click_tabla);

    paginador = crear_paginador((nueva_pagina) => listar_usuarios(nueva_pagina));

    const roles_cargados = await cargar_catalogo_roles();
    if (!roles_cargados) return;

    await cargar_catalogo_tipo_personal();

    listar_usuarios(1);
});

async function cargar_roles() {
    const response = await fetch(`${BASE_API}/roles`, { credentials: "include" });

    if (!response.ok) {
        const mensaje = await obtener_mensaje_error(response, "No fue posible cargar el catálogo de roles.");
        throw new Error(mensaje);
    }

    const resultado = await response.json();
    return resultado.roles || [];
}

async function cargar_catalogo_roles() {
    try {
        roles_json = await cargar_roles();
        llenar_select(
            "filtro-rol",
            roles_json,
            "Id_Rol",
            "Nombre",
            "Todos los roles",
            true
        );
        return true;
    } catch (error) {
        console.error("Error al cargar roles:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al cargar catálogos",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar el catálogo de roles."),
            boton: true
        });
        return false;
    }
}

function opciones_roles(roles) {
    return (roles || []).map((rol) => ({ valor: rol.Id_Rol, texto: rol.Nombre }));
}

async function cargar_tipo_personal() {
    const response = await fetch(`${BASE_API}/tipo-personal`, { credentials: "include" });

    if (!response.ok) {
        const mensaje = await obtener_mensaje_error(response, "No fue posible cargar el catálogo de tipo de personal.");
        throw new Error(mensaje);
    }

    const resultado = await response.json();
    return resultado.tipos_personal || [];
}

async function cargar_catalogo_tipo_personal() {
    try {
        tipos_personal_json = await cargar_tipo_personal();
    } catch (error) {
        console.error("Error al cargar tipo de personal:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al cargar catálogos",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar el catálogo de tipo de personal."),
            boton: true
        });
    }
}

function opciones_tipo_personal(tipos) {
    return (tipos || []).map((tipo) => ({ valor: tipo.Id_Tipo_Personal, texto: tipo.Nombre }));
}

async function generar_contrasena() {
    const response = await fetch(`${BASE_API}/usuarios/generar-contrasena`, { credentials: "include" });

    if (!response.ok) {
        const mensaje = await obtener_mensaje_error(response, "No fue posible generar una contraseña.");
        throw new Error(mensaje);
    }

    const resultado = await response.json();
    return resultado.contrasena;
}

async function listar_usuarios(pagina = 1) {
    pagina_actual_vista = pagina;
    const rol = document.getElementById("filtro-rol").value;
    const estado = document.getElementById("filtro-estado").value;
    const busqueda = document.getElementById("filtro-busqueda-usuarios").value.trim();

    mostrarPopup({
        tipo: "carga",
        titulo: "Buscando",
        mensaje: "Buscando usuarios...",
        boton: false
    });

    const parametros = new URLSearchParams({
        pagina: String(pagina),
        por_pagina: String(LIMITE_POR_PAGINA)
    });
    if (rol) parametros.set("rol", rol);
    if (estado) parametros.set("activo", estado);
    if (busqueda) parametros.set("busqueda", busqueda);

    try {
        const response = await fetch(`${BASE_API}/usuarios?${parametros.toString()}`, {
            credentials: "include"
        });

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }

        const datos = await response.json();
        pintar_resultados(datos);
    } catch (error) {
        console.error("Error al listar usuarios:", error);
        obtener_cuerpo_tabla().replaceChildren();
        paginador.actualizar(0, 1, LIMITE_POR_PAGINA);
        mostrarPopup({
            tipo: "error",
            titulo: "Error al buscar",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || mensaje_por_estado(500)),
            boton: true
        });
    }
}

// ======================= RENDER DE LA TABLA =======================

function obtener_cuerpo_tabla() {
    return document.getElementById("cuerpo-tabla-usuarios");
}

function nombre_rol(id_rol) {
    const encontrado = roles_json.find((rol) => rol.Id_Rol === id_rol);
    return encontrado ? encontrado.Nombre : "—";
}

function formatear_ultimo_acceso(fecha) {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function badge_estado(activo) {
    return activo
        ? `<span class="bc-accion-chip bc-accion-activar"><i class="fa-solid fa-circle-check"></i>Activo</span>`
        : `<span class="bc-accion-chip bc-accion-desactivar"><i class="fa-solid fa-circle-xmark"></i>Inactivo</span>`;
}

function construir_fila(usuario) {
    const fila = document.createElement("tr");
    fila.dataset.idUsuario = usuario.Id_Usuario;

    const celda_nombre = document.createElement("td");
    celda_nombre.textContent =
        `${usuario.Nombre} ${usuario.Apellido_Paterno} ${usuario.Apellido_Materno}`.trim();
    fila.appendChild(celda_nombre);

    const celda_usuario = document.createElement("td");
    celda_usuario.textContent = usuario.Nombre_Usuario;
    fila.appendChild(celda_usuario);

    const celda_rol = document.createElement("td");
    celda_rol.textContent = nombre_rol(usuario.Roles_Id_Rol);
    fila.appendChild(celda_rol);

    const celda_estado = document.createElement("td");
    celda_estado.innerHTML = badge_estado(Boolean(usuario.Activo));
    fila.appendChild(celda_estado);

    const celda_acceso = document.createElement("td");
    celda_acceso.textContent = formatear_ultimo_acceso(usuario.Ultimo_Acceso);
    fila.appendChild(celda_acceso);

    const celda_acciones = document.createElement("td");
    celda_acciones.className = "text-center us-celda-acciones";

    const boton_editar = document.createElement("button");
    boton_editar.type = "button";
    boton_editar.className = "btn btn-sm btn-outline-primary";
    boton_editar.dataset.accion = "editar";
    boton_editar.setAttribute("aria-label", "Editar usuario");
    boton_editar.setAttribute("title", "Editar");
    boton_editar.innerHTML = `<i class="fas fa-pen"></i>`;
    celda_acciones.appendChild(boton_editar);

    const boton_contrasena = document.createElement("button");
    boton_contrasena.type = "button";
    boton_contrasena.className = "btn btn-sm btn-outline-secondary";
    boton_contrasena.dataset.accion = "contrasena";
    boton_contrasena.setAttribute("aria-label", "Cambiar contraseña");
    boton_contrasena.setAttribute("title", "Cambiar contraseña");
    boton_contrasena.innerHTML = `<i class="fas fa-key"></i>`;
    celda_acciones.appendChild(boton_contrasena);

    const es_uno_mismo = String(usuario.Id_Usuario) === String(Usuario?.Id_Usuario);
    const boton_estado = document.createElement("button");
    boton_estado.type = "button";
    boton_estado.className = usuario.Activo
        ? "btn btn-sm btn-outline-danger"
        : "btn btn-sm btn-outline-success";
    boton_estado.dataset.accion = "estado";
    boton_estado.setAttribute("aria-label", usuario.Activo ? "Desactivar" : "Activar");
    boton_estado.setAttribute("title", usuario.Activo ? "Desactivar" : "Activar");
    boton_estado.innerHTML = usuario.Activo
        ? `<i class="fas fa-ban"></i>`
        : `<i class="fas fa-rotate-left"></i>`;
    if (es_uno_mismo) {
        boton_estado.disabled = true;
        boton_estado.title = "No puedes desactivar tu propio usuario";
    }
    celda_acciones.appendChild(boton_estado);

    fila.appendChild(celda_acciones);

    return fila;
}

function pintar_resultados(datos) {
    const { data: usuarios = [], total = 0, pagina = 1, por_pagina = LIMITE_POR_PAGINA } = datos;

    const cuerpo = obtener_cuerpo_tabla();
    cuerpo.replaceChildren();

    if (usuarios.length === 0) {
        mostrarPopup({
            tipo: "advertencia",
            titulo: "Sin resultados",
            mensaje: "No se encontraron usuarios con esos filtros.",
            boton: true
        });
    } else {
        for (const usuario of usuarios) {
            cuerpo.appendChild(construir_fila(usuario));
        }
        cerrarPopup();
    }

    paginador.actualizar(total, pagina, por_pagina);
}

function manejar_click_tabla(evento) {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton || boton.disabled) return;

    const fila = boton.closest("tr");
    const id_usuario = fila?.dataset.idUsuario;
    if (!id_usuario) return;

    switch (boton.dataset.accion) {
        case "editar":
            abrir_edicion_usuario(id_usuario);
            break;
        case "contrasena":
            abrir_formulario_contrasena(id_usuario);
            break;
        case "estado":
            confirmar_cambio_estado(id_usuario, fila);
            break;
    }
}

async function guardar_usuario(datos, id_usuario) {
    const cuerpo = {
        nombre: datos.nombre?.trim(),
        apellido_paterno: datos.apellido_paterno?.trim(),
        apellido_materno: datos.apellido_materno?.trim(),
        nombre_usuario: datos.nombre_usuario?.trim(),
        roles_id_rol: datos.roles_id_rol ? Number(datos.roles_id_rol) : null
    };

    if (!id_usuario) {
        cuerpo.contrasena = datos.contrasena;

        if (Number(datos.roles_id_rol) === ID_ROL_MEDICO) {
            cuerpo.curp = datos.curp?.trim().toUpperCase();
            cuerpo.cedula_profesional = datos.cedula_profesional?.trim();
            cuerpo.cat_tipo_personal_id_tipo_personal = datos.cat_tipo_personal_id_tipo_personal
                ? Number(datos.cat_tipo_personal_id_tipo_personal)
                : null;
        }
    }

    const url = id_usuario
        ? `${BASE_API}/usuarios/${id_usuario}`
        : `${BASE_API}/usuarios`;
    const metodo = id_usuario ? "PUT" : "POST";

    const response = await fetch(url, {
        method: metodo,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok || resultado.success === false) {
        throw new Error(resultado.error || mensaje_por_estado(response.status));
    }

    return resultado;
}

async function abrir_formulario_usuario(id_usuario, datos_usuario, al_guardar) {
    const campos = [
        { id: "usuario-nombre", nombre: "nombre", etiqueta: "Nombre(s)", tipo: "text", columna: "col-md-4 mb-3", requerido: true },
        { id: "usuario-apellido-paterno", nombre: "apellido_paterno", etiqueta: "Apellido paterno", tipo: "text", columna: "col-md-4 mb-3", requerido: true },
        { id: "usuario-apellido-materno", nombre: "apellido_materno", etiqueta: "Apellido materno", tipo: "text", columna: "col-md-4 mb-3", requerido: true },
        { id: "usuario-nombre-usuario", nombre: "nombre_usuario", etiqueta: "Nombre de usuario", tipo: "text", columna: "col-md-6 mb-3", requerido: true },
        {
            id: "usuario-rol", nombre: "roles_id_rol", etiqueta: "Rol", tipo: "select", columna: "col-md-6 mb-3", requerido: true,
            opciones: opciones_roles(roles_json)
        }
    ];

    let contrasena_generada = "";
    if (!id_usuario) {
        try {
            contrasena_generada = await generar_contrasena();
        } catch (error) {
            console.error("Error al generar contraseña inicial:", error);
        }
        campos.push({
            id: "usuario-contrasena", nombre: "contrasena", etiqueta: "Contraseña", tipo: "text", columna: "col-md-12 mb-3",
            requerido: true,
            ayuda: "Se generó automáticamente; puedes editarla antes de guardar. Compártesela al usuario por un medio seguro."
        });

        campos.push({
            id: "usuario-tipo-personal", nombre: "cat_tipo_personal_id_tipo_personal", etiqueta: "Tipo de personal",
            tipo: "select", columna: "col-md-4 mb-3", opciones: opciones_tipo_personal(tipos_personal_json)
        });
        campos.push({
            id: "usuario-curp", nombre: "curp", etiqueta: "CURP", tipo: "text", columna: "col-md-4 mb-3", maxlength: 18
        });
        campos.push({
            id: "usuario-cedula-profesional", nombre: "cedula_profesional", etiqueta: "Cédula profesional",
            tipo: "text", columna: "col-md-4 mb-3"
        });
    }

    window.modal_manager.mostrar({
        titulo: id_usuario ? "Editar usuario" : "Nuevo usuario",
        icono: id_usuario ? "fas fa-user-pen" : "fas fa-user-plus",
        texto_guardar: id_usuario ? "Guardar cambios" : "Registrar usuario",
        icono_guardar: "fas fa-save",
        descripcion: id_usuario
            ? "Modifica los datos del usuario y guarda los cambios."
            : "Captura los datos del nuevo usuario del sistema.",
        id: id_usuario || "",
        campos,
        datos: id_usuario
            ? (datos_usuario || {})
            : { contrasena: contrasena_generada },
        onSubmit: async (datos) => {
            try {
                if (!id_usuario && Number(datos.roles_id_rol) === ID_ROL_MEDICO &&
                    (!datos.curp?.trim() || !datos.cedula_profesional?.trim() || !datos.cat_tipo_personal_id_tipo_personal)) {
                    throw new Error("Para el rol Médico, CURP, Cédula profesional y Tipo de personal son obligatorios.");
                }

                const confirmar = await mostrarPopup({
                    tipo: "advertencia",
                    titulo: id_usuario ? "Guardar cambios" : "Registrar usuario",
                    mensaje: id_usuario
                        ? "¿Deseas guardar los cambios de este usuario?"
                        : "¿Deseas registrar este nuevo usuario?",
                    confirmar: true,
                    textoConfirmar: id_usuario ? "Sí, guardar" : "Sí, registrar",
                    textoCancelar: "Cancelar"
                });

                if (!confirmar) return false;

                const resultado = await guardar_usuario(datos, id_usuario);

                mostrarPopup({
                    tipo: "exito",
                    titulo: id_usuario ? "Usuario actualizado" : "Usuario registrado",
                    mensaje: id_usuario
                        ? "Los datos del usuario se actualizaron correctamente."
                        : "El usuario se registró correctamente.",
                    boton: true
                });

                if (al_guardar) await al_guardar(resultado);
                return true;
            } catch (error) {
                console.error("Error al guardar usuario:", error);
                throw new Error(
                    es_error_de_red(error) ? MENSAJE_SIN_CONEXION : (error.message || "No fue posible guardar el usuario.")
                );
            }
        }
    });

    if (!id_usuario) {
        const select_rol = document.getElementById("usuario-rol");
        const ids_campos_medico = ["usuario-tipo-personal", "usuario-curp", "usuario-cedula-profesional"];

        const actualizar_visibilidad_campos_medico = () => {
            const es_medico = Number(select_rol.value) === ID_ROL_MEDICO;
            ids_campos_medico.forEach((id) => {
                const campo = document.getElementById(id);
                if (campo) campo.parentElement.style.display = es_medico ? "" : "none";
            });
        };

        select_rol.addEventListener("change", actualizar_visibilidad_campos_medico);
        actualizar_visibilidad_campos_medico();
    }
}

function abrir_alta_usuario() {
    abrir_formulario_usuario(null, null, () => {
        listar_usuarios(1);
    });
}

async function abrir_edicion_usuario(id_usuario) {
    try {
        const response = await fetch(`${BASE_API}/usuarios/${id_usuario}`, { credentials: "include" });
        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            throw new Error(mensaje);
        }
        const resultado = await response.json();
        const usuario = resultado.data;

        const datos_formulario = {
            nombre: usuario.Nombre,
            apellido_paterno: usuario.Apellido_Paterno,
            apellido_materno: usuario.Apellido_Materno,
            nombre_usuario: usuario.Nombre_Usuario,
            roles_id_rol: usuario.Roles_Id_Rol
        };

        abrir_formulario_usuario(id_usuario, datos_formulario, () => {
            listar_usuarios(pagina_actual_vista);
        });
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cargar los datos del usuario."),
            boton: true
        });
    }
}

async function abrir_formulario_contrasena(id_usuario) {
    let contrasena_generada = "";
    try {
        contrasena_generada = await generar_contrasena();
    } catch (error) {
        console.error("Error al generar contraseña:", error);
    }

    window.modal_manager.mostrar({
        titulo: "Cambiar contraseña",
        icono: "fas fa-key",
        texto_guardar: "Guardar contraseña",
        icono_guardar: "fas fa-save",
        descripcion: "Se generó una contraseña nueva; puedes editarla antes de guardar. Compártesela al usuario por un medio seguro.",
        id: id_usuario || "",
        campos: [
            {
                id: "usuario-contrasena-nueva", nombre: "contrasena", etiqueta: "Nueva contraseña", tipo: "text",
                columna: "col-md-12 mb-3", requerido: true
            }
        ],
        datos: { contrasena: contrasena_generada },
        onSubmit: async (datos) => {
            try {
                const confirmar = await mostrarPopup({
                    tipo: "advertencia",
                    titulo: "Cambiar contraseña",
                    mensaje: "¿Deseas guardar esta nueva contraseña para el usuario?",
                    confirmar: true,
                    textoConfirmar: "Sí, guardar",
                    textoCancelar: "Cancelar"
                });

                if (!confirmar) return false;

                const response = await fetch(`${BASE_API}/usuarios/${id_usuario}/contrasena`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contrasena: datos.contrasena })
                });

                const resultado = await response.json().catch(() => ({}));
                if (!response.ok || resultado.success === false) {
                    throw new Error(resultado.error || mensaje_por_estado(response.status));
                }

                mostrarPopup({
                    tipo: "exito",
                    titulo: "Contraseña actualizada",
                    mensaje: "La contraseña del usuario se actualizó correctamente.",
                    boton: true
                });

                return true;
            } catch (error) {
                console.error("Error al cambiar contraseña:", error);
                throw new Error(
                    es_error_de_red(error) ? MENSAJE_SIN_CONEXION : (error.message || "No fue posible cambiar la contraseña.")
                );
            }
        }
    });
}

async function confirmar_cambio_estado(id_usuario, fila) {
    const esta_activo = fila.querySelector("button[data-accion='estado']").classList.contains("btn-outline-danger");
    const nombre_usuario = fila.children[0].textContent;

    const confirmar = await mostrarPopup({
        tipo: "advertencia",
        titulo: esta_activo ? "Desactivar usuario" : "Activar usuario",
        mensaje: esta_activo
            ? `¿Seguro que deseas desactivar a "${nombre_usuario}"? No podrá iniciar sesión mientras esté inactivo.`
            : `¿Deseas reactivar a "${nombre_usuario}"?`,
        confirmar: true,
        textoConfirmar: esta_activo ? "Sí, desactivar" : "Sí, activar",
        textoCancelar: "Cancelar"
    });

    if (!confirmar) return;

    try {
        const response = await fetch(`${BASE_API}/usuarios/${id_usuario}/estado`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: !esta_activo })
        });

        const resultado = await response.json().catch(() => ({}));
        if (!response.ok || resultado.success === false) {
            throw new Error(resultado.error || mensaje_por_estado(response.status));
        }

        mostrarPopup({
            tipo: "exito",
            titulo: esta_activo ? "Usuario desactivado" : "Usuario activado",
            mensaje: "El estado del usuario se actualizó correctamente.",
            boton: true
        });

        listar_usuarios(pagina_actual_vista);
    } catch (error) {
        console.error("Error al cambiar estado del usuario:", error);
        mostrarPopup({
            tipo: "error",
            titulo: "Error",
            mensaje: es_error_de_red(error)
                ? MENSAJE_SIN_CONEXION
                : (error.message || "No fue posible cambiar el estado del usuario."),
            boton: true
        });
    }
}