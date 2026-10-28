export function llenar_select(
    select,
    datos,
    valor,
    texto,
    placeholder = "Selecciona una opción",
    vacio = false
) {
    const elemento = typeof select === "string"
        ? document.getElementById(select)
        : select;

    if (!elemento || !Array.isArray(datos)) {
        console.error("Select inválido o datos incorrectos.");
        return false;
    }

    elemento.replaceChildren();

    const opcion_inicial = document.createElement("option");
    opcion_inicial.value = "";
    opcion_inicial.textContent = placeholder;
    opcion_inicial.disabled = !vacio;
    opcion_inicial.selected = true;

    elemento.appendChild(opcion_inicial);

    for (const dato of datos) {
        const opcion = document.createElement("option");

        opcion.value = dato[valor] ?? "";
        opcion.textContent = typeof texto === "function"
            ? texto(dato)
            : dato[texto] ?? "";

        elemento.appendChild(opcion);
    }

    return true;
}