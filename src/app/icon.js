import { ImageResponse } from 'next/og'

// Configuración de la imagen
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Generación del icono
export default function Icon() {
  return new ImageResponse(
    (
      // Elemento JSX que representa el icono visualmente
      <div
        style={{
          fontSize: 20,
          background: '#db2777', // Color rosa (pink-600)
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '50%', // Forma circular
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
        }}
      >
        A
      </div>
    ),
    {
      ...size,
    }
  )
}