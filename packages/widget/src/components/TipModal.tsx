import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

interface TipCurrency {
  code: string;
  name: string;
  symbol: string;
  type: string;
}

interface TipModalProps {
  targetPlayer: { id: string; username: string };
  onClose: () => void;
  onSend: (data: { targetPlayerId: string; amount: number; currency: string; isPublic: boolean }) => void;
  currencies: TipCurrency[];
  isLoading: boolean;
  error: string | null;
}

export function TipModal({ targetPlayer, onClose, onSend, currencies, isLoading, error }: TipModalProps) {
  const [currency, setCurrency] = useState(currencies[0]?.code || '');
  const [amount, setAmount] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Set default currency when currencies load
  useEffect(() => {
    if (currencies.length > 0 && !currency) {
      setCurrency(currencies[0].code);
    }
  }, [currencies]);

  const selectedCurrency = currencies.find((c) => c.code === currency);
  const step = selectedCurrency?.type === 'CRYPTO' ? '0.00000001' : '0.01';
  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleBackdropClick = useCallback((e: Event) => {
    if ((e.target as HTMLElement).classList.contains('cc-tip-modal__backdrop')) {
      onClose();
    }
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    if (!isValid || isLoading) return;
    onSend({
      targetPlayerId: targetPlayer.id,
      amount: parsedAmount,
      currency,
      isPublic,
    });
  }, [isValid, isLoading, targetPlayer.id, parsedAmount, currency, isPublic, onSend]);

  return (
    <div class="cc-tip-modal__backdrop" onClick={handleBackdropClick}>
      <div class="cc-tip-modal" onClick={(e: Event) => e.stopPropagation()}>
        {/* Header */}
        <div class="cc-tip-modal__header">
          <span class="cc-tip-modal__title">Tips for {targetPlayer.username}</span>
          <button class="cc-tip-modal__close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Currency selector */}
        <label class="cc-tip-modal__label">Currency</label>
        <select
          class="cc-tip-modal__currency-select"
          value={currency}
          onChange={(e) => { setCurrency((e.target as HTMLSelectElement).value); }}
          disabled={isLoading}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} - {c.name}
            </option>
          ))}
        </select>

        {/* Amount input */}
        <label class="cc-tip-modal__label">Amount</label>
        <div class="cc-tip-modal__amount-row">
          <input
            class="cc-tip-modal__amount-input"
            type="number"
            min="0"
            step={step}
            placeholder="0.00"
            value={amount}
            onInput={(e) => { setAmount((e.target as HTMLInputElement).value); }}
            disabled={isLoading}
          />
          {amount && (
            <button
              class="cc-tip-modal__amount-clear"
              onClick={() => setAmount('')}
              type="button"
              disabled={isLoading}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Public checkbox */}
        <label class="cc-tip-modal__checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic((e.target as HTMLInputElement).checked)}
            disabled={isLoading}
          />
          <span class="cc-tip-modal__checkbox-mark" />
          <span class="cc-tip-modal__checkbox-text">Make tip public (it will appear in chat)</span>
        </label>

        {/* Submit button */}
        <button
          class="cc-tip-modal__submit"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          type="button"
        >
          {isLoading ? (
            <span class="cc-tip-modal__spinner" />
          ) : (
            'Send Tips'
          )}
        </button>

        {/* Error message */}
        {error && (
          <div class="cc-tip-modal__error">{error}</div>
        )}
      </div>
    </div>
  );
}
