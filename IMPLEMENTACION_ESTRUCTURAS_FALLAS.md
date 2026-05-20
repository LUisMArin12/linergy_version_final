# Implementación: visibilidad de estructuras y referencia de falla por estructura

## Cambios incluidos

1. **Filtro de visibilidad de estructuras**
   - Se agregó la opción **Mostrar estructuras** dentro del panel **Filtros operativos → Visibilidad**.
   - Al desactivar esta opción, las estructuras dejan de mostrarse en el mapa y en la lista lateral.
   - Las fallas siguen visibles si el filtro **Mostrar fallas** está activo.

2. **Referencia de estructuras en fallas**
   - Cada falla calcula automáticamente su referencia con base en el kilómetro y las estructuras de su misma línea.
   - La referencia puede indicar:
     - `Estructura X`, cuando el km coincide con una estructura.
     - `Entre estructuras X y Y`, cuando la falla cae entre dos estructuras.
     - `Antes de estructura X`, cuando la falla queda antes de la primera estructura registrada.
     - `Después de estructura X`, cuando queda después de la última estructura registrada.

3. **Lugares donde se muestra la referencia**
   - Popup de falla en el mapa.
   - Tarjeta de falla en la lista lateral.
   - Panel de detalle de falla.
   - Modal de reporte inmediato después de registrar una falla.
   - Reporte PDF generado desde el modal de falla.

4. **Correcciones técnicas adicionales**
   - Se corrigió compatibilidad del componente `Toast` para soportar el uso anterior de toast individual y el uso actual por lista.
   - Se agregó la propiedad opcional `hidden` al tipo `LineaCatalogEntry` para corregir errores de TypeScript en `InfoLineasPage`.

## Archivos principales modificados

- `src/components/map/MapFilters.tsx`
- `src/pages/MapPage.tsx`
- `src/components/map/LeafletMap.tsx`
- `src/components/map/ItemsList.tsx`
- `src/components/map/DetailPanel.tsx`
- `src/components/modals/RegisterFaultModal.tsx`
- `src/components/modals/FaultReportModal.tsx`
- `src/lib/reportUtils.ts`
- `src/lib/structureReference.ts`
- `src/components/ui/Toast.tsx`
- `src/lib/lineaCatalog.ts`

## Validación ejecutada

```bash
npm run typecheck
npm run lint
npm run build
```

Resultado: las tres validaciones finalizaron correctamente.

## Instalación recomendada

El ZIP no incluye `node_modules`. Para ejecutar el proyecto:

```bash
npm install
npm run dev
```

Para compilar producción:

```bash
npm run build
```
