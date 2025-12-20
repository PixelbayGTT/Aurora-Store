import './globals.css'

export const metadata = {
  title: 'Aura Beauty Store',
  description: 'Sistema de Gestión y Punto de Venta',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  )
}