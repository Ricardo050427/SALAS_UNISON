# Entendiendo el Cerebro de tu Aplicación (Backend)

Vamos a meternos a las entrañas del código. Te voy a explicar línea por línea cómo funciona el cerebro de tu aplicación (el Backend) usando ejemplos reales de tu propio código. Todo está explicado paso a paso para que identifiques qué hace cada bloque de texto que programamos.

---

## 1. El Molde de la Base de Datos (`prisma/schema.prisma`)

Antes de guardar información, la base de datos (Neon) es un cuarto vacío. Necesita saber **qué forma** van a tener los datos que le vas a mandar. Para eso usamos el archivo `schema.prisma`. 

En tu código, creamos un "Molde" llamado **Modelo de Evento**:
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
* **`String`**: Significa "Texto". Le estamos diciendo a la base de datos que *nombre*, *evento* y *salasAsignadas* serán simplemente letras y palabras.
* **`Int`**: Significa "Número Entero" (Integer). Las horas (ej. 7, 8, 14) y el número de asistentes no pueden tener letras ni decimales, a fuerza deben ser números completos.
* **`DateTime`**: Es un formato especial mundial para Fechas y Tiempos.
* **`String[]`**: Esos corchetes `[]` significan "Lista". Los requerimientos no son un texto solo, son una *lista de textos* (Ej: `["Proyector", "Café"]`).
* **`String?` (con signo de interrogación)**: El signo de interrogación significa "Es Opcional". Si la coordinadora no escribe **notas**, la base de datos no se enoja, simplemente lo deja vacío (Null).
* **`id @default(cuid())`**: Imagina que haces dos eventos que se llaman igual, el mismo día y a la misma hora. ¿Cómo sabe el sistema cuál borrar si le das a la "X"? Para eso, la base de datos genera automáticamente un **`id`** (un número de placa irrepetible de letras y números aleatorios) por cada evento nuevo.

---

## 2. El Cable de Conexión (`src/lib/prisma.js`)

En tu proyecto hay un archivo cortito llamado `prisma.js`. Su única función es conectar tu página con la base de datos Neon usando tu contraseña secreta `.env`. 

¿Por qué lo pusimos en un archivo separado? Imagina que por cada persona que abre tu página, el código comprara un cable de internet nuevo para conectarse a Neon. Se acabarían los cables (se caería el servidor). Ese archivo asegura que **siempre se use el mismo cable** para todos, reciclando la conexión y haciendo tu app súper rápida y estable.

---

## 3. El Cerebro Lógico (`src/app/actions.js`)

Aquí es donde ocurre toda la magia de la página. Este archivo tiene la etiqueta `"use server";` hasta arriba, lo que significa que el navegador de tu celular jamás descarga este código; todo se ejecuta en las computadoras súper seguras de Vercel.

Vamos a analizar las 3 funciones más importantes que existen ahí:

### A. Función para Traer los Eventos (`getEvents`)
Cuando abres la página por primera vez, el calendario está en blanco y grita: *"¡Ey cerebro, dame los eventos!"*.

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
* **`async / await`**: En la programación, ir a buscar datos a internet toma tiempo (fracciones de segundo). `await` le dice al código: *"Espérame aquí congelado hasta que Neon me devuelva los datos, no avances a la siguiente línea todavía"*.
* **`prisma.event.findMany()`**: Significa *"Oye traductor Prisma, ve a la tabla de Eventos y encuentra MUCHOS (es decir, tráeme todos)"*.
* **`orderBy` (Ordenar por)**: Le decimos que no los traiga a lo loco. Primero acomódalos por Fecha (`'asc'` significa Ascendente, del más viejo al más nuevo), y si dos eventos caen en el mismo día, entonces pon primero al que empieza más temprano (`horaInicio`). 

### B. Función para Crear un Evento (`createEvent`)
Esta es la más grande. Cuando la coordinadora llena el formulario, le manda una caja llena de datos (a la que llamamos `formData`) a esta función.

**Paso 1: Extraer y contar las cosas**
El sistema primero revisa cuántas salas eligió la coordinadora y la cantidad de asistentes (`pax`).
```javascript
const salasSolicitadas = formData.salas;
let pax = parseInt(formData.numAsistentes);
```

**Paso 2: La regla de Capacidad (El Cadenero)**
```javascript
if (pax > salasSolicitadas.length * 40) {
  return { error: 'Excede la capacidad permitida (Máx 40 por sala).' };
}
```
*Traducción:* Si los pasajeros (`pax`) son *mayores* que la (Cantidad de Salas Seleccionadas multiplicadas por 40), entonces **ABORTA LA MISIÓN** (`return { error: ... }`). Al hacer un `return`, el código se frena en seco ahí mismo, arroja tu ventana emergente ("Toast") rojo con el texto de error en la página, y jamás llega a guardarse en la base de datos.

**Paso 3: La regla de los Choques de Horario**
El código tiene que revisar en la base de datos si ya existe alguien ocupando esa sala a esa hora antes de guardar el nuevo evento.
```javascript
const choques = await prisma.event.findMany({
    where: {
        fecha: new Date(formData.fecha),
        horaInicio: { lt: formData.horaFin },
        horaFin: { gt: formData.horaInicio }
    }
});
```
*Traducción:* *"Oye Prisma, búscame eventos antiguos que cumplan estas 3 condiciones:*
1. Que sean en la misma **fecha**.
2. `{ lt }` (Menor que): Que el evento viejo haya empezado **antes** de que termine el evento nuevo.
3. `{ gt }` (Mayor que): Que el evento viejo termine **después** de que inicie el evento nuevo.

*Ejemplo:* Si quiero reservar de 10 a 11, buscará si existe un evento que termine a las 10:01 o más tarde. Si encuentra uno, entonces revisará (con un comando llamado `.some()`) si la reservación de sala que pedí (ej. "8A-1") choca con la de ese evento viejo. Si es así, **¡Vuelve a Arrojar Error y aborta la misión!**.

**Paso 4: Guardado Definitivo**
Si superó las dos barreras anteriores, significa que está autorizado.
```javascript
const newEvent = await prisma.event.create({
  data: {
    nombre: formData.nombre,
    fecha: new Date(formData.fecha),
    horaInicio: parseInt(formData.horaInicio),
    // ... (siguen los campos)
  }
});
```
Aquí simplemente llama al comando `.create()` y mapea los datos: *"En el cajón de 'nombre', pega el texto que venía en `formData.nombre`"*, etc. Y listo, se guardó exitosamente y Vercel le avisa a tu página web que ya puede dibujar el bloque en el calendario.

### C. Función para Borrar un Evento (`deleteEvent`)
Es la más pequeña y eficiente de todas. Cuando le das al botón rojo de basurero, la página no manda todos los datos por internet, **solo manda el número de placa (el `id` larguísimo)**.
```javascript
export async function deleteEvent(id) {
    await prisma.event.delete({
      where: { id: id }
    });
    return { success: true };
}
```
*Traducción:* *"Prisma, entra a la tabla de Eventos, ejecuta la acción de borrar (`delete`) únicamente `donde` (where) la placa de identificación sea exactamente igual a la placa que te acabo de dar en tu mano"*. Si el `id` no coincidiera por error humano, la base de datos arrojaría un error, asegurándose de jamás borrar la reservación equivocada.

---

### Resumen del Flujo de la App:
1. El usuario da clic en "Guardar Nuevo Evento" desde su celular (Frontend).
2. Se envía el Formulario lleno volando por internet a la cocina completamente blindada de Vercel (`actions.js`).
3. La cocina lee tus reglas estrictas de capacidad y empalme de horarios.
4. Si está todo bien, le pasa el reporte al traductor automatizado llamado `Prisma`.
5. El traductor lo mete en los cajones virtuales de la nube llamados `Neon`.
6. Neon confirma el guardado, Vercel envía la señal verde de regreso al celular, y el calendario se actualiza.

Todo esto pasa en unos 200 milisegundos.
