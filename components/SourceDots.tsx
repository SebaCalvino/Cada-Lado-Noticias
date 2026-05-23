import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  clarin:      '#004B87',
  lanacion:    '#1A3A5C',
  infobae:     '#E30613',
  pagina12:    '#1A1A1A',
  ambito:      '#FF6B00',
  cronista:    '#2C7BB6',
  perfil:      '#8B0000',
  laizquierda: '#CC0000',
  tn:          '#005BAC',
  eldestape:   '#e53e3e',
  mdzol:       '#0077b6',
  minutouno:   '#e67e22',
}

const SOURCE_NAMES: Record<string, string> = {
  clarin:      'Clarín',
  lanacion:    'La Nación',
  infobae:     'Infobae',
  pagina12:    'Página 12',
  ambito:      'Ámbito',
  cronista:    'El Cronista',
  perfil:      'Perfil',
  laizquierda: 'La Izquierda',
  tn:          'TN',
  eldestape:   'El Destape',
  mdzol:       'MDZ Online',
  minutouno:   'Minuto Uno',
}

export default function SourceDots({ sources }: { sources: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sources.map(slug => (
        <span
          key={slug}
          className="text-xs font-medium px-2 py-0.5 rounded text-white"
          style={{ backgroundColor: SOURCE_COLORS[slug] || '#666' }}
          title={SOURCE_NAMES[slug] || slug}
        >
          {SOURCE_NAMES[slug] || slug}
        </span>
      ))}
    </div>
  )
}
