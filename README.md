# Clasificador de citas A, B y C

Herramienta web para auxiliar la asignación de la clasificación de citas por documento en la plataforma Rizoma. Está dirigida a investigadores, bibliotecarios y otras personas relacionadas con procesos de revisión bibliométrica.

La aplicación examina referencias que citan un trabajo académico y propone su clasificación en tres categorías. La información se procesa en el navegador: los nombres, las referencias y los resultados no se guardan en una base de datos.

> **Advertencia:** la clasificación automática es orientativa y no sustituye la revisión humana. El sistema compara variantes escritas de nombres, pero no confirma identidades ni consulta ORCID u otras bases externas.

## Sitio público

[Abrir el Clasificador de citas A, B y C](https://rick666t.github.io/clasificador-citas/)

## Criterios de clasificación

- **Cita tipo A:** ningún autor del documento original aparece en la referencia que cita el trabajo.
- **Cita tipo B:** aparece uno o más coautores del documento original, pero no el investigador evaluado.
- **Cita tipo C o autocita:** aparece el investigador evaluado como autor de la referencia citante.

Las categorías son excluyentes. Si aparecen simultáneamente el investigador evaluado y uno o más coautores, prevalece la clasificación C. El indicador **Citas consideradas** suma únicamente A + B; las autocitas C se muestran por separado.

## Cómo utilizar la herramienta

1. Pegue la referencia completa del documento original.
2. Escriba sus autores, preferentemente uno por línea y con el formato `Apellidos, Nombres`.
3. Revise las etiquetas de autores detectados.
4. Seleccione al investigador evaluado.
5. Pegue una referencia citante por línea.
6. Pulse **Analizar citas**.
7. Revise la coincidencia localizada y corrija manualmente cualquier resultado dudoso.
8. Use **Copiar resumen** o **Copiar reporte completo** para obtener el reporte profesional.

Los dos botones de copia tienen funciones distintas:

- **Copiar resumen** incluye solamente los datos generales y los conteos A, B y C, sin el detalle de las referencias.
- **Copiar reporte completo** incluye los datos generales, los conteos y el detalle de todas las referencias analizadas.

Cuando el navegador y la aplicación de destino lo permiten, se conservan en negritas los títulos de las secciones y las etiquetas principales. El reporte completo mantiene una separación moderada entre los datos generales, el resumen y cada referencia.

## Reconocimiento de nombres

La herramienta normaliza diferencias frecuentes, entre ellas:

- mayúsculas, minúsculas y acentos;
- espacios y guiones;
- orden directo e invertido;
- nombres completos e iniciales;
- primer apellido acompañado por nombre o inicial;
- apellidos compuestos, partículas y apóstrofos;
- una errata tipográfica leve en determinados casos.

La forma recomendada para registrar a los autores es `Apellidos, Nombres`. También se admiten variantes como `Nombre Apellido` y `Apellido, I.`.

La búsqueda de nombres se realiza dentro de los primeros 1,600 caracteres de cada referencia citante, donde normalmente se encuentra la autoría. La referencia completa se conserva en los resultados y en el reporte.

## Corrección manual y gráfica dinámica

La clasificación automática y la clasificación visible se conservan por separado. Cada fila puede reclasificarse como A, B o C, y el botón de restablecimiento recupera la propuesta original.

Después de cualquier corrección, la herramienta actualiza inmediatamente:

- los conteos de A, B y C;
- el total de citas consideradas;
- la gráfica de distribución;
- las cantidades y porcentajes de la gráfica;
- el reporte que se copia al portapapeles.

La gráfica se genera únicamente con CSS y JavaScript, sin bibliotecas externas.

## Capacidad y límites prácticos

No existe un máximo numérico programado para autores, referencias o resultados. Cada línea no vacía en el campo de referencias citantes produce una clasificación.

La tabla muestra inicialmente 100 resultados y permite cargar otros 100 o mostrarlos todos. Los conteos, la gráfica y el reporte siempre consideran la lista completa. El límite práctico depende de la memoria y la capacidad del dispositivo.

## Privacidad y contador de visitas

Los datos bibliográficos se procesan localmente en el navegador y no se envían al contador. Los botones de copia acceden al portapapeles únicamente cuando la persona los pulsa.

El sitio muestra un contador público y agregado proporcionado por [Hits](https://hits.sh/). 

## Archivos principales

- `index.html`: estructura, contenido e interfaz accesible.
- `app.js`: separación de autores, reconocimiento de variantes, clasificación, correcciones, gráfica y copiado de reportes.
- `styles.css`: diseño visual adaptable a computadoras y dispositivos móviles.
- `README.md`: documentación pública del proyecto.

## Verificaciones

La versión fue comprobada mediante pruebas de regresión que incluyen:

- separación de listas de autores;
- variantes con y sin acentos;
- espacios, guiones e iniciales;
- orden directo e invertido;
- nombres y apellidos compuestos;
- listas APA consecutivas;
- controles para reducir coincidencias incorrectas;
- clasificación de ejemplos A, B y C;
- reclasificación manual y actualización de conteos;
- presencia y actualización de la gráfica;
- orden, negritas y espaciado del reporte copiable.

## Historial resumido

### Versión 3.7.1

- Se diferenciaron claramente los dos botones de copia.
- **Copiar resumen** entrega únicamente los datos generales y los conteos.
- **Copiar reporte completo** conserva el detalle por referencia.
- Se mantuvieron la gráfica dinámica, el contador compatible con GitHub Pages.

### Versión 3.7.0

- Se adaptó el proyecto definitivo a GitHub Pages.
- Se conservó la gráfica dinámica incorporada en la versión 3.6.0.
- Se mantuvo el formato profesional y el espaciado equilibrado del reporte de la versión 3.6.1.
- Se sustituyó el contador basado en PHP por uno compatible con páginas estáticas.
- Se actualizó la documentación para el repositorio de GitHub.

### Versión 3.6.1

- Se equilibró el espaciado del reporte copiado para separar con claridad el título, los datos generales, el resumen y el detalle.
- Se añadió una separación moderada entre referencias consecutivas.

### Versión 3.6.0

- Se incorporó la gráfica de distribución de citas A, B y C.
- La gráfica se hizo sensible a la reclasificación manual.
- Se añadieron títulos y etiquetas en negritas al reporte copiado en aplicaciones compatibles.

### Versiones 3.0.0 a 3.5.0

- Se consolidó la herramienta independiente.
- Se ampliaron las variantes de nombres, iniciales, acentos, guiones y apellidos compuestos.
- Se incorporaron la corrección manual, los conteos dinámicos, las listas grandes y el reporte copiable.
- Se reorganizó la interfaz, se añadieron instrucciones, criterios visibles, créditos y licencia.

## Autoría y licencia

Desarrollo: **Mtro. Ricardo Tavira Sánchez**, Subdirección de Servicios de Información Especializada de la DGBSDI, UNAM.

El proyecto se distribuye bajo la licencia [Creative Commons Atribución-No Comercial-CompartirIgual 4.0 Internacional](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Esta licencia permite compartir y adaptar la obra, siempre que se reconozca la autoría, no se utilice con fines comerciales y cualquier versión derivada se distribuya bajo la misma licencia.
