import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #172554 48%, #0369a1 100%)',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#bae6fd',
          }}
        >
          Backer Sonar
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          Find the signal before you build.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 30,
            color: '#e2e8f0',
            maxWidth: 900,
          }}
        >
          Evidence-first Kickstarter research, backed by the full historical dataset.
        </div>
      </div>
    ),
    { ...size },
  )
}
