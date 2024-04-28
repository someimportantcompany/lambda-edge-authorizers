export function renderPage(page: {
  title: string,
  hero?: {
    title?: string,
    description: string,
  },
}): string {
  return /* HTML */`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${page.title}</title>
    </head>
    <body>
      <h1>${page.hero?.title}</h1>
      <p>${page.hero?.description}</p>
      <p>${page.hero?.subtext}</p>
    </body>
    </html>
  `
}

export function renderLogoutPage() {
  return renderPage({
    title: 'Successfully logged-out',
    hero: {
      title: 'You have successfully logged out',
      description: 'You may now close this tab',
    }
  })
}

export function renderErrorPage(err: {
  title: string,
  description: string,
  code?: string,
}) {
  return renderPage({
    title: 'An error occurred',
    hero: {
      title: err.title,
      description: err.description,
    }
  })
}
