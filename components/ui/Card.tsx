'use client'

import { theme } from '@/lib/theme'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
  href?: string
}

const paddings = {
  none: '0',
  sm: theme.spacing[3],
  md: theme.spacing[5],
  lg: theme.spacing[6],
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated, padding = 'md', children, style, href, ...props }, ref) => {
    const cardStyle: React.CSSProperties = {
      background: theme.colors.card,
      borderRadius: theme.radii.md,
      border: `1px solid ${theme.colors.sand}`,
      padding: paddings[padding],
      transition: `transform ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
      ...(elevated ? { boxShadow: theme.shadows.hover } : { boxShadow: theme.shadows.card }),
      ...style,
    }

    const hoverHandlers = elevated ? {} : {
      onMouseEnter: (e: React.MouseEvent) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = theme.shadows.hover
      },
      onMouseLeave: (e: React.MouseEvent) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = theme.shadows.card
      },
    }

    if (href) {
      return (
        <a href={href} style={{ ...cardStyle, textDecoration: 'none', color: 'inherit', display: 'block' }} {...hoverHandlers}>
          {children}
        </a>
      )
    }

    return (
      <div ref={ref} style={cardStyle} {...hoverHandlers} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
