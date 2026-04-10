import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export function PromoCard({ message }: Props) {
  const { content } = message;
  const title = content?.title || 'Promotion';
  const subtitle = content?.subtitle || '';
  const detailText = content?.detailText || '';
  const ctaText = content?.ctaText || 'Learn More';
  const ctaUrl = content?.ctaUrl;
  const emoji = content?.emoji || '🎁';
  const accentColor = content?.accentColor || '#6366F1';

  const handleCta = () => {
    if (ctaUrl) {
      window.open(ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div class="cc-promo-card">
      <div
        class="cc-promo-card__card"
        style={{ borderLeftColor: accentColor }}
      >
        <div class="cc-promo-card__body">
          <div class="cc-promo-card__info">
            <div class="cc-promo-card__title">
              {emoji} {title}
            </div>
            {subtitle && (
              <div class="cc-promo-card__subtitle">{subtitle}</div>
            )}
            {detailText && (
              <div class="cc-promo-card__detail">{detailText}</div>
            )}
          </div>
          <button
            class="cc-promo-card__cta"
            style={{ backgroundColor: accentColor }}
            onClick={handleCta}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
