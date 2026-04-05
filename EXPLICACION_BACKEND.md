# Entendiendo el Cerebro de tu Aplicación (Backend)

Vamos a meternos a las entrañas del código. Te voy a explicar línea por línea cómo funciona el cerebro de tu aplicación usando ejemplos reales de tu propio código. Todo está explicado paso a paso para que identifiques qué hace cada bloque de texto que programamos. Este documento está diseñado para que cualquier persona, sin importar su experiencia previa, pueda aprender conceptos técnicos reales.

### ¿Qué es el Backend?
Antes de empezar, aclaramos este término. El **Backend** es toda la maquinaria, lógica y bases de datos que funcionan "detrás del escenario". Es el motor de un coche: el usuario no lo ve directamente (el usuario ve el "Frontend", que sería el volante, los asientos y la pintura), pero es lo que procese información de forma invisible, verifique reglas y guarde datos permanentemente y de manera segura.

---

## 1. El Molde de la Base de Datos (`prisma/schema.prisma`)

Antes de guardar información, necesitamos un lugar centralizado donde almacenarla. En nuestro proyecto usamos **PostgreSQL** montado sobre **Neon**.

### ¿Qué es PostgreSQL y qué es Neon?
- **PostgreSQL**: Es uno de los sistemas de **Base de Datos** más potentes, estables y seguros del mundo. Imagina una bóveda gigante y extremadamente organizada, llena de hojas de cálculo avanzadas (tablas) donde la información se relaciona entre sí de forma perfecta (por eso se le llama base de datos "relacional"). Es un estándar de oro utilizado por bancos y grandes empresas.
- **Neon**: Mantener una base de datos PostgreSQL tradicional implica rentar una computadora física y configurarla manualmente. **Neon** es un servicio super moderno que nos ofrece la potencia de PostgreSQL en la "nube" (en internet) de forma **Serverless** (sin servidor fijo). Esto significa que Neon se apaga o reposa cuando nadie usa tu página para ahorrar recursos, y se enciende en milisegundos cuando alguien necesita agendar, adaptando su poder de cómputo automáticamente según la cantidad de coordinadores usando el sistema al mismo tiempo.

Pero Neon es solo la bóveda vacía. Necesita saber por adelantado **qué forma** van a tener los datos que le vas a mandar para prevenir desastres. Para enseñarle esa estructura usamos **Prisma** a través del archivo `schema.prisma`.

### ¿Qué es Prisma?
**Prisma** es lo que en programación se conoce como un **ORM** (Mapeador Objeto-Relacional, por sus siglas en inglés). En palabras sencillas, es nuestro "Traductor Oficial". PostgreSQL habla un lenguaje estructurado muy antiguo y complejo llamado SQL. Nosotros, en nuestro código web, hablamos un lenguaje de programación veloz y moderno llamado JavaScript. 
Prisma se pone de intermediario: nosotros le damos órdenes simples y amigables en JavaScript, y Prisma se encarga de traducirlas instantáneamente a códigos SQL y viceversa de manera absolutamente segura para interactuar con PostgreSQL.

En tu código, usamos esta herramienta de Prisma para crear un "Molde" estricto llamado **Modelo de Evento**:
```prisma
model Event {
  id              String   @id @default(cuid())
  nombre          String
  evento          String
  fecha           DateTime
  horaInicio      Int
  horaFin         Int
  numAsistentes   Int
  requerimientos  String[]
  salasAsignadas  String
  notas           String?
}
```

### ¿Qué significa esto en español?
* **`String`**: Significa "Cadena de Texto". Le estamos diciendo a la base de datos que *nombre*, *evento* y *salasAsignadas* serán simplemente letras, símbolos y frases.
* **`Int`**: Significa "Número Entero" (Integer en inglés). Las horas (ej. 7, 8, 14) y el número de asistentes no pueden tener letras ni decimales, a fuerza deben ser números completos. Así PostgreSQL rechaza automáticamente si alguien con mala intención manda por internet "14.5 asistentes".
* **`DateTime`**: Es un tipo de dato global utilizado para estandarizar Fechas y Tiempos exactos, asegurándose de que todas las computadoras del mundo lo lean en el mismo idioma de calendario.
* **`String[]`**: Esos corchetes `[]` en la programación significan "Lista" (o Array). Los requerimientos no son un texto asilado, son una *lista de textos independientes* (Ej: `["Proyector", "Café"]`).
* **`String?` (con signo de interrogación)**: El signo de interrogación significa "Es Opcional". Si la coordinadora decide no escribir **notas**, la base de datos no se rompe ni devuelve un error de alerta, simplemente guarda ese espacio pacíficamente como vacío (en lenguaje de programación a ese vacío se le llama *Null*).
* **`id @default(cuid())`**: Imagina que guardas dos eventos que se llaman exactamente igual, el mismo día y a la misma hora del día. ¿Cómo sabe el sistema cuál borrar sin equivocarse cuando le das al botón rojo de borrar? Para eso, nuestra base de datos genera automáticamente e instantáneamente un **`id`** (un código de serie irrepetible inventado combinando letras y números aleatoriamente, conocido como algoritmo CUID) por cada evento nuevo. Es su huella digital única en todo el servidor.

---

## 2. El Cable de Conexión (`src/lib/prisma.js`)

En tu proyecto hay un archivo pequeñito llamado `prisma.js`. Su única función es conectar permanentemente a tu página con nuestra base de datos Postgres (Neon) usando tu contraseña súper secreta que vive en el archivo `.env`.

### ¿Qué es el archivo `.env`?
**`.env`** es un archivo de "Variables de Entorno" (Environment Variables). Es literalmente la caja fuerte de tu casa. En tu código web, usamos este archivo para guardar contraseñas delicadas, URLs de acceso y claves confidenciales que los hackers nunca pueden encontrar porque **nunca se hace público**. El código de conexión sabe que su misión es abrir de forma segura la caja fuerte `.env`, tomar la llave para Neon conectándose sin que nadie más lo vea.

¿Por qué pusimos la conexión en su propio archivo (`prisma.js`)? Imagina que por cada persona o celular que navega en el sitio web, el código fuera a comprar e instalara un cable de internet nuevecito hacia Neon. Al poco tiempo agotaríamos las conexiones y todo tu sitio web se colapsaría. Ese archivo de conexión asegura de forma inteligente que **siempre se recicle, mantenga vivo y reutilice el mismo punto de conexión inicial** para todos, asegurando la escalabilidad del sistema web y haciéndolo increíblemente rápido para procesar docenas de reservaciones al mismo tiempo.

---

## 3. El Cerebro Lógico o Endpoints (`src/app/actions.js`)

Aquí es donde reside todo el razonamiento frío e inteligente de nuestro sistema. Este archivo tiene la etiqueta superior `"use server";`. Esta bandera declara contundentemente que todo su contenido no pertenece al usuario; pertenece a sus guardianes y a su plataforma principal, en este caso **Vercel**.

### ¿Qué es Vercel y cómo funje en nuestro código?
**Vercel** es la plataforma de red global de alojamiento (Hosting) donde vive operativamente nuestra aplicación. Así como Neon resguarda la base de datos (información), Vercel corre procesadores y servidores super eficaces que controlan la interfaz (Frontend) y operan a la vez lo que programamos en este `actions.js`. Al declarar `"use server";` garantizamos blindaje absoluto: ni un atacante, ni el navegador en el teléfono de la coordinadora descargarán nunca jamás este código visible para ellos. Estas reglas de negocio viajan e interactúan privadamente en unos búnkeres de servidores administrados por Vercel.

Vamos a analizar sin prisa las 3 funciones más importantes en el corazón de nuestra solución:

### A. Función para Traer los Eventos (`getEvents`)
Cuando abres la página por primera vez, el calendario está vacío visualmente y le grita a Vercel con urgencia: *"¡Por favor entra al servidor interno y tráeme la lista de eventos!"*.

```javascript
export async function getEvents() {
    const events = await prisma.event.findMany({
      orderBy: [
        { fecha: 'asc' },
        { horaInicio: 'asc' }
      ]
    });
    return { events };
}
```
* **`async / await` (Asíncrono y Esperar)**: En la arquitectura web, salir de las pantallas de Vercel e ir por la red a preguntar datos a Neon toma fracciones diminutas de segundo pero es vital que ese proceso esté supervisado. La palabra `await` le ordena al código: *"Espérame aquí congelado un segundo aguardando que Neon me conteste y no te atrevas a avanzar procesando la otra línea del documento todavía"*.
* **`prisma.event.findMany()`**: Significa *"Oye Traductor Prisma, dirígete puntito por puntito a la tabla de Eventos del banco de datos Postgres y procede a encontrar MUCHOS a la vez (tráemelos todos ilesos)"*.
* **`orderBy` (Organizar por)**: Le explicamos al traductor que no nos tire la información revuelta. Le damos instrucciones jerárquicas organizativas: Primero que se formen estrictamente de menor a mayor por la fecha (`'asc'` significa Ascendente, del calendario antiguo al actual). Segundo, para esos eventos que casualmente caen el mismo dia, agrúpalos y organiza a quien se levanta más temprano (`horaInicio` de mañana al atardecer).

### B. Función para Crear un Evento (`createEvent`)
Esta es la central reguladora principal. Cuando la coordinadora oprime el botón azul de Guardar, su navegador empaqueta la información como una fotocopia en una carpeta (`formData`) enviada a velocidades estratosféricas desde su celular al centro de operaciones en Vercel.

**Paso 1: Extraer y contar lo que hay de forma matemática**
El cerebro saca y abre la carpeta. Procede a revisar el total puro de salas y a emplear una función imperativa llamada `parseInt` que traduce la tinta que escribió el humano sobre la cantidad en números puros e inamovibles.
```javascript
const salasSolicitadas = formData.salas;
let pax = parseInt(formData.numAsistentes);
```

**Paso 2: La regla estricta de Capacidad (El Controlador)**
```javascript
if (pax > salasSolicitadas.length * 40) {
  return { error: 'Excede la capacidad permitida (Máx 40 por sala).' };
}
```
*Traducción:* Si la cifra de pasajeros (`pax`) supera deliberadamente *más de* (>) el resultado de la multiplicación analógica de "número de salas marcadas" con su capacidad permitida de "40 personas"; entonces **RETROCEDE TODO EL SISTEMA INMEDIATAMENTE**  e invoca el código `return { error: ... }`. La directriz "return" ejerce un bloqueo en la carretera: paraliza la actividad ahí mismo, escupe la burbuja informativa en color rojo y erradica total probabilidad de avanzar un milímetro, protegiendo las reglas de negocio de cualquier sobrecupo.

**Paso 3: La regla analógica de los Choques de Horario y Cruces**
En este paso, el cerebro indaga directamente en Postgres de inmediato para hallar inconsistencias temporales en el mapa general que comprometan el salón.
```javascript
const choques = await prisma.event.findMany({
    where: {
        fecha: new Date(formData.fecha),
        horaInicio: { lt: formData.horaFin },
        horaFin: { gt: formData.horaInicio }
    }
});
```
*Traducción:* *"Atención Prisma, ve y búscame viejos eventos empadronados que caigan inexorablemente es estas 3 condiciones (`where` que significa "dónde") en particular:*
1. En esta precisa **fecha** exacta del mundo globalizada (Convertido mediante `new Date()`).
2. `{ lt }` (Las siglas de *Less Than* que significan "Estrictamente Menor que"): El viejo evento que encontraste arrancó tempranamente **antes** de que la reservación entrante siquiera acabase.
3. `{ gt }` (Las siglas de *Greater Than* que significan "Estrictamente Mayor que"): Además el evento añejo ha sido pautado para disiparse mucho **después** de cuando nuestro intruso deseara iniciar su junta.

*El Corolario en el Mundo Real:* Esto abarca todo rastro de empalme posible; si yo busco agendar un bautizo de 10am a 11am, nuestro algoritmo rastreará impecable y obsesivamente si alguna de las entidades añejas de ese mismo lugar por azares de su agenda termina a las 10:01 o finalizan más del mediodía. De ser el panorama positivo en el encuentro de tales hallazgos, con una pinza especial comprobará el código el cruce particular evaluando también las salas elegidas usando sintáxis de programación llamada `.some()`. Si concluyen empalme definitivo, el sistema emite el pitido, detiene el viaje y cancelará la operación dictando error insobornable por reservación anticipada de sala ya bloqueada.

**Paso 4: Guardado Definitivo Trascendental**
Habiendo cruzado pacíficamente y sin colisiones a los guardianes gemelos de Capacidad y Bloqueo de Horarios, nuestra orden pasa intacta a ser validada.
```javascript
const newEvent = await prisma.event.create({
  data: {
    nombre: formData.nombre,
    fecha: new Date(formData.fecha),
    horaInicio: parseInt(formData.horaInicio),
    // ... (siguen configurándose uno por uno los demás compartimentos)
  }
});
```
El traductor Prisma alza entonces en Postgres su comando constructivo `.create()` y procede a amarrar los datos: *"En nuestra boveda del servidor en la columna titulada 'nombre', vas a atornillar permanentemente lo que viene plasmado exactamente allí desde el documento digital subido en la carpeta y variable llamada `formData.nombre`"*. Todo se ancla firme de inmediato de manera perpetua e imperturbable hacia la nube en Neon. A su vez su eco satisfactorio viaja desde nuestras redes de bases de datos por puentes cibernéticos a Vercel certificando misión conseguida; mandado a repintar el calendario colorido en tu pantalla finalmente. 

### C. Función quirúrgica para Borrar un Evento (`deleteEvent`)
De las tres arterias operativas es la más discreta, veloz pero potente. Porque al elegir la "X" roja para descartar, el servidor y tu móvil deciden obviar transferir detalles engorrosos por las frecuencias electromagnéticas como el 'nombre', 'notas'  o 'salas' a aniquilarse; ahorrando recursos **pasa y confía el transporte exclusivamente de  la placa unívoca irreproducible (el identificador `id` único CUID)**.

```javascript
export async function deleteEvent(id) {
    await prisma.event.delete({
      where: { id: id }
    });
    return { success: true };
}
```
*La Última Traducción Sistémica:* *"Dirígete directamente a modo prioritario Prisma, entra por el portal al esquema vital en PostgreSQL en Neon, localiza la bóveda matriz nombrando en tabla maestra a Eventos, ejecuta la guadaña de aniquilación y olvido universal de bases (`delete`) operando el milagro tajantemente **ÚNICA Y ESTRICTAMENTE AHÍ ELÁCTICAMENTE DÓNDE** (where) la huella biológica grabada como `id` corresponda milimétrica, sin discursos extras y exactitud rigurosa a mi identificación en tu mano en este instante"*.
El recurso del `id` convierte esta operación irrefutablemente en segura. Si una hecatombe electrónica fragmentase fallas distorsionando la señal, Postgres se negará por mandato a matar o reaccionar porque el `id` jamás fue certero, demostrando el nivel de certidumbre irreal donde anular compromisos equivocados es tajantemente imposible en esta tecnología.

---

### Resumen Arquitectónico del Flujo Operacional (The Big Picture):

1. **La chispa de ignición**: La dinámica comienza en el interfaz; cuando el Coordinador decide dictaminar y oprimir el botón "Guardar"  en tu portal web usando su celular (el cual llamamos **Frontend**).
2. **Viaje sin Escalas**: Esta interfaz de cristal sella digitalmente y comprime el bulto del formulario arrojándolo a velocidades de luz encriptadas de internet hasta la colmena gigantesca y centro de control seguro mundial de servidores programadores de **Vercel** en la función maestra (`actions.js`).
3. **Puestos de Migración y Revisión y Filtración (Lógica Backend)**: Vercel detiene la misiva; procede a someter lo capturado al interrogatorio riguroso de reglas inviolables de tu empresa: *Que la gente inscrita lógicamente quepa y que los horarios por espacios físicos jamás traslapen contra el cosmos ya pautado.*
4. **Pasaporte y Traducción oficial (Prisma ORM)**: Al ver los certificados del punto 3 limpios, el procesador  Vercel le transfiere estas carpetas limpias a su experto burócrata llamado **Prisma**, la entidad software habilitadora que muta un texto cualquiera a lengua estricta de Base de Datos inentendible por el resto.
5. **Guardia, Custodia y Registro Vitalicio (Neon y PostgreSQL)**: Prisma viaja invisible sobre cables sin fallos, encesta y confía los registros SQL complejos recién creados para soltarlos delicadamente en las tablas y columnas organizadísimas de la mega fortaleza flotante **Neon**, nuestra base de alta disponibilidad inquebrantable impulsada con el inigualable empuje relacional por excelencia de **PostgreSQL** para resguardarse ahí mismo firmemente hasta decenios completos de ser precisos y evitar desvanecimientos.
6. **Campanada de Triunfo**: Neon estampa su marca avalando victoria guardada, emite el comunicado verde; Vercel captura este mensaje triunfal, retroalimenta  via web socket / llamadas hasta tu teléfono celular lo cual en cuestión visual refresca, recorta y engalana pintando una tarjeta radiante de una junta recién orquestada dentro la agenda misma de forma magistral y brillante en tu mano.

A nivel de tiempo, **todo esto abarcando continentes** puede demorarse tanto como el aleteo fugaz y veloz de un colibrí real ante los ojos. Alrededor de un quinto de segundo (apenas ~200 milisegundos). Así de sofisticada es su existencia y su arte informático real subyacente.
