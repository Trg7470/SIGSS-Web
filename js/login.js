import { obtener_mensaje_error, es_error_de_red, MENSAJE_SIN_CONEXION } from "/js/utils.js";

const form_login = document.getElementById("form-login");

form_login?.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
});

async function login() {
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    if (usuario === "" || password === "") {
        mostrarPopup({
            titulo: "Datos incompletos",
            mensaje: "Por favor, completa todos los campos.",
            tipo: "error",
            boton: true,
        });
        return;
    }

    mostrarPopup({
        titulo: "Iniciando sesión",
        mensaje: "Espere un momento, por favor...",
        tipo: "carga",
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Usuario: usuario, Password: password }),
        });

        if (!response.ok) {
            const mensaje = await obtener_mensaje_error(response);
            mostrarPopup({
                titulo: "No se pudo iniciar sesión",
                mensaje,
                tipo: "error",
                boton: true,
            });
            return;
        }

        const result = await response.json();
        mostrarPopup({
            titulo: "Inicio de sesión exitoso",
            mensaje: "Redirigiendo al dashboard...",
            tipo: "exito",
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        sessionStorage.setItem("usuario", JSON.stringify(result.usuario));
        window.location.href = "/pages/dashboard/dashboard.html";

    } catch (error) {
        console.error("Error:", error);
        mostrarPopup({
            titulo: "Error de conexión",
            mensaje: es_error_de_red(error) ? MENSAJE_SIN_CONEXION : "Ocurrió un error inesperado.",
            tipo: "error",
            boton: true,
        });
    }
}