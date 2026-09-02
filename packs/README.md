# Packs remotos de Dibus

`catalog.json` lista los packs que la app descarga sin necesidad de una versión nueva.
Cada pack vive en su carpeta `<id>/` con las láminas en PNG (1200 px, escala de grises).

Para añadir un pack: en el repo de la app, `Tools/publish-pack.sh <id> "Título" "Title" <símbolo SF>`
genera las láminas del manifest, las copia aquí y actualiza `catalog.json`. Después:

1. Commit y push de este repo (GitHub Pages lo publica en https://dibus.softapp.tech/packs/).
2. Crear el producto no consumible `tech.softapp.dibu.pack.<id>` en App Store Connect
   (0,99 €, Family Sharing) y aprobarlo. Sin producto, la app muestra el pack pero no se puede comprar.
