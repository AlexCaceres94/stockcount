# Guía de defensa — StockCount

Esto no es para memorizar. Es para que entiendas el *por qué* de cada pieza, para que cuando te pregunten algo puedas razonar la respuesta aunque no la tengas exacta en la cabeza.

## 1. El discurso de 30 segundos (memorízate esto, literal)

> "StockCount es una app de conteo de inventario que funciona sin internet. Cada producto tiene un contador grande con botones de + y −, se puede escanear su código de barras, y cada conteo queda guardado con la ubicación GPS de dónde se hizo. Lo construí con Expo y TypeScript, con Supabase de backend, y la parte que más trabajo me costó fue que funcione offline: si cuentas algo sin señal, se guarda localmente y se sincroniza solo cuando vuelve la conexión."

Con eso ya cubriste: el problema, navegación implícita (mencionas pantallas), hardware (cámara+GPS), backend, y el requisito más difícil (offline). El profesor ya sabe que entendiste el proyecto en 30 segundos.

## 2. Los 3 archivos que MÁS te van a preguntar (en ese orden de probabilidad)

### `src/state/countReducer.ts` — el más fácil, empieza por aquí si te preguntan por state management

Es una función pura: recibe un número y una acción (`increment`, `decrement`, `set`), devuelve el número nuevo. Nunca baja de 0.

**Si preguntan "¿por qué useReducer y no useState?"**
Respuesta: "Porque la lógica de contar tiene reglas (nunca bajar de cero, redondear a entero) que quería tener en un solo lugar, separada de la pantalla, para poder probarla con Jest sin tener que renderizar ningún componente." (Y de hecho la pruebas en `__tests__/countReducer.test.ts` — ábrelo y muéstralo si te lo piden.)

**Si preguntan "¿por qué no lo hiciste con useState y ya?"**
Respuesta honesta: "Podría haberlo hecho con useState, pero el curso enseñó useReducer para esto justamente porque el estado tiene varias transiciones (+1, -1, fijar un valor) y quería practicar el patrón."

### `src/hooks/useItemCounts.ts` — la función `useAdjustCount`

Qué hace, en tus palabras: "Cuando tocas +/-, esta función calcula la cantidad nueva, intenta guardar la ubicación GPS, guarda el cambio en el teléfono inmediatamente (para no perderlo si cierras la app), y luego, si hay internet, lo manda a Supabase. Si no hay internet, lo mete en una cola para mandarlo después."

**Si preguntan "¿por qué guardas primero localmente y después mandas a Supabase, y no al revés?"**
Respuesta: "Porque si mando primero a Supabase y falla (sin señal), pierdo el cambio si no lo guardé antes en algún lado. Guardando local primero, el dato nunca se pierde, pase lo que pase con la red."

**Si preguntan "¿qué pasa si falla el guardado en Supabase aunque haya internet?"**
Respuesta: "Lo meto en la misma cola de sincronización que uso para cuando no hay internet — así no tengo que escribir el manejo de errores dos veces."

### `src/offline/syncQueue.ts` — la cola de sincronización

Qué hace: "Es una lista guardada en el teléfono (AsyncStorage) de 'cosas pendientes por mandar a Supabase'. Cuando el teléfono detecta que volvió el internet (eso pasa en `useNetworkStatus.ts`), recorro la lista en orden y mando cada una. Si una falla, la dejo en la lista para reintentar después; si funciona, la borro."

**Si preguntan "¿qué pasa si mandas la misma cosa dos veces por accidente?"**
Respuesta honesta (esto es una limitación real, dilo así): "Para crear o borrar un ítem no debería duplicarse porque cada operación tiene un id único. Para los conteos, cada fila de historial tiene un `client_op_id` único, así que si por algún error se reenvía, la base de datos lo rechaza en vez de duplicarlo. No implementé resolución de conflictos más avanzada (como si dos celulares editan el mismo ítem offline al mismo tiempo) — con más tiempo lo mejoraría, lo dejé anotado en el reporte."

## 3. Preguntas generales que casi seguro te hacen, con respuesta corta

**"¿Por qué Supabase y no Firebase, si el curso enseñó Firebase?"**
→ "Es el equivalente aprobado: mismo trío auth + base de datos + storage. Elegí Supabase porque usa Postgres, que me da relaciones reales entre tablas (ítems y su historial de conteos), y Row Level Security, que hace que la base de datos misma rechace si un usuario intenta leer el inventario de otro — no depende de que yo lo valide bien en el código de la app."

**"¿Qué es Row Level Security (RLS)?"**
→ "Son reglas dentro de la base de datos que dicen quién puede leer o escribir cada fila. En mi caso: `auth.uid() = user_id`, o sea, cada fila solo la puede ver el usuario dueño. Está en `supabase/migrations/0001_initial_schema.sql`."

**"¿Por qué TypeScript estricto, qué te dio eso?"**
→ "Que si intento usar un campo que no existe en un ítem, o pasar un string donde va un número, me lo marca al escribir el código, no cuando la app ya está corriendo en el teléfono."

**"¿Cómo pruebas la app? ¿Qué cubren los tests?"**
→ "Jest para la lógica pura del contador (countReducer) y un test de componente para ItemRow que verifica que el badge de 'stock bajo' aparezca solo cuando corresponde. No tengo tests end-to-end de la sincronización con Supabase — lo digo directo en el reporte como algo pendiente."

**"¿Qué pasa si el GPS no tiene permiso?"**
→ "El conteo se guarda igual, solo que con latitud/longitud null. Nunca bloqueo el conteo por el GPS — está en `tryGetLocation()` en useItemCounts.ts, tiene un try/catch que devuelve null en vez de fallar."

**"¿Cuál fue la parte más difícil?"**
→ Sé honesto: "Que todo coincida — lo que ves en pantalla, lo que está guardado en el teléfono, y lo que hay en Supabase — sin que se desincronicen entre sí. Terminé con la regla simple de 'guardar local primero, después mandar al servidor, y al final refrescar todo desde el servidor para que todos estén de acuerdo'."

## 4. Si te preguntan algo que NO sabes responder

No inventes. Di algo como:

> "Esa parte específica no la tengo 100% clara en este momento — sé que [lo que sí sabes de esa zona del código] pero el detalle exacto de [lo que no sabes] tendría que revisarlo."

Es una respuesta perfectamente válida y mejor que inventar algo incorrecto en vivo.

## 5. Antes de presentar — checklist rápido

- [ ] Corre `npx expo start -c` ANTES de la clase, no durante — así ya está compilado y no pierdes tiempo en vivo.
- [ ] Ten el teléfono cargado y con Expo Go ya abierto en el proyecto.
- [ ] Practica el demo en este orden: login → lista → detalle (+/-) → escanear un código → crear un ítem con foto → apagar el wifi del teléfono, contar algo offline, prender wifi, mostrar que se sincronizó solo (esto es tu mejor momento, el requisito más difícil bien demostrado).
- [ ] Ten `countReducer.ts`, `useItemCounts.ts` y `syncQueue.ts` abiertos en pestañas del editor, listos para compartir pantalla si te piden ver código.
