import { llenar_select } from "./utils.js";
export async function init({ vista, usuario }) { if (vista === "registrar") { seleccionar_paciente(usuario); } }
const peso = document.getElementById('peso');
peso.addEventListener('blur', function () { const valor = this.value.trim(); if (valor && !valor.toLowerCase().endsWith('kg')) { this.value = `${valor} kg`; } });
const circunferencia_cintura = document.getElementById('circunferencia-cintura');
circunferencia_cintura.addEventListener('blur', function () { const valor = this.value.trim(); if (valor && !valor.toLowerCase().endsWith('cm')) { this.value = `${valor} cm`; } });
const Usuario = JSON.parse(sessionStorage.getItem("usuario"));
if (!Usuario) {
    mostrarPopup({
        tipo: "error",
        titulo: "Sesión no válida",
        mensaje: "No fue posible recuperar los datos del usuario.",
        boton: true
    });
}
let Paciente;
function seleccionar_paciente(usuario) {
    window.modal_manager.mostrar({
        titulo: "Seleccionar paciente",
        icono: "fas fa-hospital-user",
        texto_guardar: "Buscar paciente",
        icono_guardar: "fas fa-search",
        descripcion: "Busca al paciente por CURP o por nombre y apellidos.",
        campos: [
            { id: "paciente_curp", nombre: "curp", etiqueta: "CURP", tipo: "text", columna: "col-md-12 mb-3", placeholder: "Ingresa la CURP", maxlength: 18 },
            { id: "paciente_nombre", nombre: "nombre", etiqueta: "Nombre(s)", tipo: "text", columna: "col-md-4 mb-3", placeholder: "Nombre(s)" },
            { id: "paciente_apellido_paterno", nombre: "apellido_paterno", etiqueta: "Apellido paterno", tipo: "text", columna: "col-md-4 mb-3", placeholder: "Apellido paterno" },
            { id: "paciente_apellido_materno", nombre: "apellido_materno", etiqueta: "Apellido materno", tipo: "text", columna: "col-md-4 mb-3", placeholder: "Apellido materno" }
        ],
        onSubmit: async (datos) => {
            const curp = (datos.curp || "").trim();
            const nombre = (datos.nombre || "").trim();
            const paterno = (datos.apellido_paterno || "").trim();
            const materno = (datos.apellido_materno || "").trim();
            const nombre_completo = `${nombre} ${paterno} ${materno}`.trim();
            if (curp === "" && (nombre === "" || paterno === "" || materno === "")) {
                mostrarPopup({ tipo: "advertencia", titulo: "Datos incompletos", mensaje: "Ingresa la CURP o el nombre completo con ambos apellidos.", boton: true });
                return false;
            }
            try {
                const result = await fetch("http://localhost:3000/api/pacientes/buscar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ criterios: { Curp: curp || null, Nombre_Completo: curp ? null : nombre_completo } })
                });
                const response = await result.json();
                if (result.status === 404) {
                    mostrarPopup({ tipo: "informacion", titulo: "Paciente no encontrado", mensaje: response.message || "No se encontró ningún paciente con esos datos.", boton: true });
                    return false;
                }
                if (!result.ok || response.success === false) throw new Error(response.message || "No fue posible buscar al paciente.");
                Paciente = response.paciente;
                if (!Paciente) throw new Error("El servidor no devolvió los datos del paciente.");
                mostrarPopup({ tipo: "exito", titulo: "Paciente encontrado", mensaje: `Nombre: ${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno} | CURP: ${Paciente.Curp} | Expediente: ${Paciente.Expediente}`, boton: true });
                await cargar_datos();
            } catch (error) {
                console.error("Error al buscar paciente:", error);
                mostrarPopup({ tipo: "error", titulo: "Error de búsqueda", mensaje: error.message || "No fue posible buscar al paciente. Inténtalo nuevamente.", boton: true });
                return false;
            }
        }
    });
}


function configurar_busqueda_diagnosticos(id) {
    const input = document.getElementById(id);
    const hidden = document.getElementById(`${id}-id`);
    const resultados = document.getElementById(`${id}-resultados`);

    if (!input || !hidden || !resultados) return;

    input.addEventListener("input", async () => {
        const nombre = input.value.trim();
        hidden.value = "";
        resultados.replaceChildren();

        if (nombre.length < 2) {
            resultados.style.display = "none";
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:3000/api/catalogos/diagnosticos/buscar?nombre=${encodeURIComponent(nombre + "%")}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error al buscar diagnósticos.");
            }

            const diagnosticos = data.diagnosticos || [];

            diagnosticos.forEach(diagnostico => {
                const opcion = document.createElement("button");
                opcion.type = "button";
                opcion.className = "list-group-item list-group-item-action";
                opcion.textContent = `${diagnostico.Clave} | ${diagnostico.Nombre}`;

                opcion.addEventListener("click", () => {
                    input.value = opcion.textContent;
                    hidden.value = diagnostico.Cat_Id_Diagnostico;
                    resultados.style.display = "none";
                    resultados.replaceChildren();
                });

                resultados.appendChild(opcion);
            });

            if (diagnosticos.length === 0) {
                resultados.textContent = "No se encontraron diagnósticos.";
            }

            resultados.style.display = "block";
        } catch (error) {
            console.error("Error al buscar diagnósticos:", error);
            resultados.style.display = "none";
        }
    });

    document.addEventListener("click", event => {
        if (!input.contains(event.target) && !resultados.contains(event.target)) {
            resultados.style.display = "none";
        }
    });
}


async function cargar_datos() {
    try {
        document.getElementById("clues").value = Usuario.Clues;
        document.getElementById("nombre-unidad").value = Usuario.Nombre_Unidad;
        document.getElementById("curp-prestador").value = Usuario.Curp;
        document.getElementById("nombre-prestador").value = `${Usuario.Nombre} ${Usuario.Apellido_Paterno} ${Usuario.Apellido_Materno}`.trim();
        document.getElementById("tipo-personal").value = Usuario.Tipo_Personal;
        document.getElementById("cedula-profesional").value = Usuario.Cedula_Profesional;
        document.getElementById("fecha-atencion").value = new Date().toISOString().split("T")[0];
        document.getElementById("expediente").value = Paciente.Expediente;
        document.getElementById("curp-paciente").value = Paciente.Curp;
        document.getElementById("nombre-paciente").value = `${Paciente.Nombre} ${Paciente.Apellido_Paterno} ${Paciente.Apellido_Materno}`.trim();
        const response = await fetch("http://localhost:3000/api/catalogos/", { method: "GET" });
        if (!response.ok) {
            mostrarPopup({ titulo: "Error al cargar los catalogos", mensaje: "No fue posible obtener la lista de catalogos. Inténtalo nuevamente.", tipo: "error", boton: true });
            return;
        }
        const result = await response.json();
        const catalogos = result.catalogos;
        const response_j = await fetch("http://localhost:3000/api/data/catalogos.json");
        if (!response_j.ok) throw new Error("No fue posible cargar los catálogos estáticos.");
        const catalogos_json = await response_j.json();
        llenar_select("servicio", catalogos.servicios, 'Id_Cat_Servicios', servicio => `${servicio.Clave} | ${servicio.Nombre}`, "Selecciona un servicio", true);
        llenar_select("derechohabiencia", catalogos.derechohabiencia, 'Id_Cat_Derechohabiencia', derechohabiencia => `${derechohabiencia.Clave} | ${derechohabiencia.Nombre}`, "Selecciona una opción", true);
        llenar_select("clave-edad", catalogos_json.clave_edad, 'Id_Cat_Clave_Edad', clave_edad => `${clave_edad.Clave} | ${clave_edad.Nombre}`, "Selecciona una opción", true);
        llenar_select("sexo", catalogos_json.sexo_biologico, 'Id_Cat_Sexo_Biologico', sexo_biologico => `${sexo_biologico.Clave} | ${sexo_biologico.Nombre}`, "Selecciona una opción", true);
        const discapacidades = catalogos.discapacidades || [];
        const discapacidad_a = discapacidades.filter(discapacidad => discapacidad.Inciso === "a");
        const discapacidad_b = discapacidades.filter(discapacidad => discapacidad.Inciso === "b");
        const discapacidad_c = discapacidades.filter(discapacidad => discapacidad.Inciso === "c");
        llenar_select("discapacidad-a", discapacidad_a, 'Id_Cat_Discapacidad', discapacidad => `${discapacidad.Clave} | ${discapacidad.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-b", discapacidad_b, 'Id_Cat_Discapacidad', discapacidad => `${discapacidad.Clave} | ${discapacidad.Nombre}`, "Selecciona una opción", true);
        llenar_select("discapacidad-c", discapacidad_c, 'Id_Cat_Discapacidad', discapacidad => `${discapacidad.Clave} | ${discapacidad.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-motivo", catalogos_json.rt, 'Id_Cat_Rt', rt => `${rt.Clave} | ${rt.Nombre}`, "Selecciona una opción", true);
        configurar_busqueda_diagnosticos("diagnostico-a-cie10");
        configurar_busqueda_diagnosticos("diagnostico-b-cie10");
        configurar_busqueda_diagnosticos("diagnostico-c-cie10");
        llenar_select("diagnostico-a-medicina-indigena", catalogos.medicina_tradicional, 'Id_Cat_Medicina_Tradicional', medicina => `${medicina.Clave} | ${medicina.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-b-medicina-indigena", catalogos.medicina_tradicional, 'Id_Cat_Medicina_Tradicional', medicina => `${medicina.Clave} | ${medicina.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-c-medicina-indigena", catalogos.medicina_tradicional, 'Id_Cat_Medicina_Tradicional', medicina => `${medicina.Clave} | ${medicina.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-a-confirmacion", catalogos_json.confirmacion_diagnostica, 'Id_Cat_Confirmacion_Diagnostica', confirmacion => `${confirmacion.Clave} | ${confirmacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-b-confirmacion", catalogos_json.confirmacion_diagnostica, 'Id_Cat_Confirmacion_Diagnostica', confirmacion => `${confirmacion.Clave} | ${confirmacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("diagnostico-c-confirmacion", catalogos_json.confirmacion_diagnostica, 'Id_Cat_Confirmacion_Diagnostica', confirmacion => `${confirmacion.Clave} | ${confirmacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ap", catalogos_json.rt, 'Id_Cat_Rt', rt_ap => `${rt_ap.Clave} | ${rt_ap.Nombre}`, "Selecciona una opción", true);
        llenar_select("riesgos", catalogos.riesgos, 'Id_Cat_Riesgos', riesgo => `${riesgo.Clave} | ${riesgo.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-embarazo", catalogos_json.rt, 'Id_Cat_Rt', rt_embarazo => `${rt_embarazo.Clave} | ${rt_embarazo.Nombre}`, "Selecciona una opción", true);
        llenar_select("plan-seguridad", catalogos_json.plan_seguridad, 'Id_Cat_Plan_Seguridad', plan => `${plan.Clave} | ${plan.Nombre}`, "Selecciona una opción", true);
        llenar_select("trimestre-gestacional", catalogos_json.trimestre_gestacional, 'Id_Cat_Trimestre_Gestacional', trimestre => `${trimestre.Clave} | ${trimestre.Nombre}`, "Selecciona una opción", true);
        llenar_select("complicaciones", catalogos.complicaciones, 'Id_Cat_Complicaciones', complicacion => `${complicacion.Clave} | ${complicacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("otras-acciones",catalogos_json.otras_acciones_embarazadas,'Id_Cat_Otras_Acciones_Embarazadas',accion=>`${accion.Clave} | ${accion.Nombre}`,"Selecciona una opción",true);
        llenar_select("rt-puerperio", catalogos_json.rt, 'Id_Cat_Rt', rt_puerperio => `${rt_puerperio.Clave} | ${rt_puerperio.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ip", catalogos_json.rt, 'Id_Cat_Rt', rt_ip => `${rt_ip.Clave} | ${rt_ip.Nombre}`, "Selecciona una opción", true);
        llenar_select("primera-vez", catalogos_json.otros_eventos, 'Id_Cat_Otros_Eventos', evento => `${evento.Clave} | ${evento.Nombre}`, "Selecciona una opción", true);
        llenar_select("subsecuente", catalogos_json.otros_eventos, 'Id_Cat_Otros_Eventos', evento => `${evento.Clave} | ${evento.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-ns", catalogos_json.rt, 'Id_Cat_Rt', rt_ns => `${rt_ns.Clave} | ${rt_ns.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-edi", catalogos_json.rt, 'Id_Cat_Rt', rt_edi => `${rt_edi.Clave} | ${rt_edi.Nombre}`, "Selecciona una opción", true);
        llenar_select("tipo-edi", catalogos_json.edi_tipo, 'Id_Cat_Edi_Tipo', tipo => `${tipo.Clave} | ${tipo.Nombre}`, "Selecciona una opción", true);
        llenar_select("resultado-edi", catalogos_json.resultados_edi, 'Id_Cat_Resultados_Edi', resultado => `${resultado.Clave} | ${resultado.Nombre}`, "Selecciona una opción", true);
        llenar_select("resultado-batelle", catalogos_json.resultado_batelle, 'Id_Cat_Resultado_Batelle', resultado => `${resultado.Clave} | ${resultado.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-edas", catalogos_json.rt, 'Id_Cat_Rt', rt_edas => `${rt_edas.Clave} | ${rt_edas.Nombre}`, "Selecciona una opción", true);
        llenar_select("plan-tratamiento", catalogos_json.eda_plan_tratamiento, 'Id_Cat_Eda_Plan_Tratamiento', plan => `${plan.Clave} | ${plan.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-iras", catalogos_json.rt, 'Id_Cat_Rt', rt_iras => `${rt_iras.Clave} | ${rt_iras.Nombre}`, "Selecciona una opción", true);
        llenar_select("tipo-tratamiento-ira", catalogos_json.ira_tratamiento, 'Id_Cat_Ira_Tratamiento', tratamiento => `${tratamiento.Clave} | ${tratamiento.Nombre}`, "Selecciona una opción", true);
        llenar_select("rt-neumonia", catalogos_json.rt, 'Id_Cat_Rt', rt_neumonia => `${rt_neumonia.Clave} | ${rt_neumonia.Nombre}`, "Selecciona una opción", true);
        llenar_select("aplicacion-cedula-cancer", catalogos_json.aplicacion_cedula_cancer_anio, 'Id_Cat_Aplicacion_Cedula_Cancer_Anio', aplicacion => `${aplicacion.Clave} | ${aplicacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("intervencion-gerontologica", catalogos.intervenciones_gerontologicas, 'Id_Cat_Intervencion_Gerontologica', intervencion => `${intervencion.Clave} | ${intervencion.Nombre}`, "Selecciona una opción", true);
        llenar_select("esquema-vacunacion", catalogos_json.esquema_vacunacion, 'Id_Cat_Esquema_Vacunacion', esquema_vacunacion => `${esquema_vacunacion.Clave} | ${esquema_vacunacion.Nombre}`,"Selecciona una opcion", true);
        llenar_select("referido-por", catalogos.referido_motivo, 'Cat_Id_Referido_Motivo', referido_motivo => `${referido_motivo.Clave} | ${referido_motivo.Nombre}`, "Selecciona una opción", true);
        llenar_select("nivel", catalogos.referido_nivel, 'Cat_Id_Referido_Nivel', referido_nivel => `${referido_nivel.Clave} | ${referido_nivel.Nombre}`, "Selecciona una opción", true);
        llenar_select("especialidad", catalogos.servicios, 'Id_Cat_Servicios', servicio => `${servicio.Clave} | ${servicio.Nombre}`, "Selecciona una opción", true);
        const teleconsulta_interpretacion = catalogos.teleconsulta_interpretacion || [];
        const teleconsulta_interpretacion_a = teleconsulta_interpretacion.filter(tc => tc.Inciso === "a");
        const teleconsulta_interpretacion_b = teleconsulta_interpretacion.filter(tc => tc.Inciso === "b");
        llenar_select("Teleconsulta", teleconsulta_interpretacion_a, 'Id_Cat_Teleconsulta_Interpretacion', teleconsulta => `${teleconsulta.Clave} | ${teleconsulta.Nombre}`, "Selecciona una opción", true);
        llenar_select("interpretacion-diagnostica", teleconsulta_interpretacion_b, 'Id_Cat_Teleconsulta_Interpretacion', interpretacion => `${interpretacion.Clave} | ${interpretacion.Nombre}`, "Selecciona una opción", true);
        llenar_select("modalidad", catalogos_json.modalidad, 'Id_Cat_Modalidad', modalidad => `${modalidad.Clave} | ${modalidad.Nombre}`, "Selecciona una opción", true);
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        mostrarPopup({ tipo: "error", titulo: "Error", mensaje: error.message || "No fue posible cargar algunos datos. Intente nuevamente", boton: true });
    }
    function registrar_datos() { }
}