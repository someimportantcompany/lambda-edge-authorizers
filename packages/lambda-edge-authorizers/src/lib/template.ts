export function renderPage(page: {
  title: string,
  description: string,
  subtext?: string | undefined,
}): string {
  return /* HTML */`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <meta name="robots" content="noindex, nofollow, nocache, noimageindex"/>
      <title>${page.title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4/dist/css/bootstrap.min.css" crossorigin="anonymous" />
    </head>
    <body class="flex-column">
      <div class="text-center mx-auto my-5 px-3" style="max-width: 512px;">
        ${page.title ? `<h1 class="h4 mb-3 font-weight-normal">${page.title}</h1>` : ''}
        ${page.description ? `<p>${page.description}</p>` : ''}
        ${page.subtext ? `<p class="text-muted text-small">${page.subtext}</p>` : ''}
      </div>
    </body>
    </html>
  `;
}

export function renderLogoutPage() {
  return renderPage({
    title: 'Logout successful',
    description: 'You may now close this tab',
    subtext: 'Thank you!',
  })
}

export function renderErrorPage(err: {
  description: string,
  code?: string | undefined,
}) {
  return renderPage({
    title: 'An error occurred',
    description: err.description,
    subtext: err.code ? `(Error: ${err.code})` : undefined,
  })
}
