import { ImageResponse } from 'next/og'

// Configuración de la imagen (Metadatos)
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Generación del Icono
export default function Icon() {
  return new ImageResponse(
    (
      // Este es el diseño visual del icono
      <div
        style={{
          fontSize: 22,
          background: '#db2777', // Color rosa fuerte (pink-600 de Tailwind)
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '8px', // Bordes redondeados
        }}
      >
        ✨
      </div>
    ),
    {
      ...size,
    }
  )
}