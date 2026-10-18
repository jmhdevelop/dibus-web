# Packs remotos de Dibus

`catalog.json` lista los packs que la app descarga sin necesidad de una versión nueva.
Cada pack vive en su carpeta `<id>/` con las láminas en PNG (1200 px, escala de grises).

Títulos: `title` (español) y `title_en` (inglés) son los que leen las versiones ya instaladas y no se
quitan ni se renombran. `titles` trae el resto de idiomas de la app (`de`, `fr`, `it`, `pt-BR`); si falta
uno, la app enseña el inglés y, sin inglés, el español. El nombre de un pack es el de su compra en App
Store Connect sin la palabra «pack» (`fastlane/iap/localizaciones.json` en el repo de la app).

Para añadir un pack: en el repo de la app, `Tools/publish-pack.sh <id> "Título" "Title" <símbolo SF>`
genera las láminas del manifest, las copia aquí y actualiza `catalog.json`. Después:

1. Commit y push de este repo (GitHub Pages lo publica en https://dibus.softapp.tech/packs/).
2. Crear el producto no consumible `tech.softapp.dibu.pack.<id>` en App Store Connect
   (0,99 €, Family Sharing) y aprobarlo. Sin producto, la app muestra el pack pero no se puede comprar.
