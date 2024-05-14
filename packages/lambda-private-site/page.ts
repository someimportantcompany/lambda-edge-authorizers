export function renderHomepage(): string {
  return /* HTML */`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <meta name="robots" content="noindex, nofollow, nocache, noimageindex"/>
      <title>Super secure site</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4/dist/css/bootstrap.min.css" crossorigin="anonymous" />
    </head>
    <body class="flex-column">
      <div class="text-center mx-auto my-5 px-3" style="max-width: 512px;">
        <h1 class="h4 mb-3 font-weight-normal">Hello, world #1</h1>
        <p>Hello, world #2</p>
      </div>
    </body>
    </html>
  `;
}
