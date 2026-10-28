const form_login = document.getElementById("form-login");

form_login.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
});

async function login() 
{
    if(document.getElementById("usuario").value.trim() === "" || document.getElementById("password").value.trim() === "")
    {
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
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                Usuario: document.getElementById("usuario").value,
                Password: document.getElementById("password").value,
            }),
        });
        const result = await response.json();
        if (response.ok) {
            mostrarPopup({
                titulo: "Inicio de sesión exitoso",
                mensaje: "Redirigiendo al dashboard...",
                tipo: "exito",
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            sessionStorage.setItem("usuario", JSON.stringify(result.usuario));
            window.location.href = "/pages/dashboard/dashboard.html";
        } else {
            mostrarPopup({
                titulo: "No se pudo iniciar sesión",
                mensaje: result.message || "Verifica tus datos e inténtalo de nuevo.",
                tipo: "error",
                boton: true,
            });
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarPopup({
            titulo: "Error de conexión",
            mensaje: "No fue posible conectar con el servidor. Inténtalo de nuevo.",
            tipo: "error",
            boton: true,
        });
    }
}