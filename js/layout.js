/* =========================================================
   SIGSS | CARGADOR DE PARTIALS (layout.js)
   ---------------------------------------------------------
   Reemplaza cada <div data-layout="/ruta/al/partial.html">
   por el contenido de ese archivo, de forma SÍNCRONA, para
   que el resto de la página (azia.js, dashboard.js, etc.)
   encuentre el encabezado/pie de página ya insertados en el
   DOM cuando se disparen sus propios "DOMContentLoaded".

   Debe incluirse como el PRIMER <script> del bloque de
   bibliotecas (antes de jQuery), normalmente así:

     <script src="/js/layout.js"></script>
     <script src="/lib/jquery/jquery.min.js"></script>
     ...

   Al terminar, dispara el evento "layoutCargado" en
   document, que js/popup.js ya escucha para inicializarse.
   ========================================================= */

(function cargarPartials() {
  "use strict";

  var ATRIBUTO = "data-layout";

  function incluirPartial(contenedor) {
    var ruta = contenedor.getAttribute(ATRIBUTO);

    if (!ruta) return;

    var xhr = new XMLHttpRequest();

    // Síncrono a propósito: así el partial queda insertado en
    // el documento antes de que el navegador siga parseando el
    // resto del HTML (y antes de DOMContentLoaded).
    xhr.open("GET", ruta, false);

    try {
      xhr.send(null);

      if (xhr.status === 200 || xhr.status === 0) {
        contenedor.outerHTML = xhr.responseText;
      } else {
        console.error(
          "[layout.js] No se pudo cargar el partial:",
          ruta,
          "- HTTP " + xhr.status
        );
      }
    } catch (error) {
      console.error(
        "[layout.js] Error al cargar el partial:",
        ruta,
        error
      );
    }
  }

  var contenedores = document.querySelectorAll("[" + ATRIBUTO + "]");

  contenedores.forEach(incluirPartial);

  document.dispatchEvent(new CustomEvent("layoutCargado"));
})();
