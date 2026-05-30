import { PrivacyOptions } from '../types';

export class PrivacyProtector {
  private config: Required<PrivacyOptions>;
  private defaultRedactKeywords = [
    'password', 'passwd', 'secret', 'card', 'credit', 'cvv', 'cvc',
    'pin', 'ssn', 'email', 'phone', 'token', 'billing', 'ssn', 'key'
  ];

  constructor(options?: PrivacyOptions) {
    this.config = {
      maskAllInputs: options?.maskAllInputs ?? true,
      maskedInputClasses: options?.maskedInputClasses ?? ['fricta-mask'],
      unmaskedInputClasses: options?.unmaskedInputClasses ?? ['fricta-unmask'],
      consentGiven: options?.consentGiven ?? false,
      redactKeywords: options?.redactKeywords ?? this.defaultRedactKeywords,
      enableDomRedaction: options?.enableDomRedaction ?? true,
    };
  }

  /**
   * Sets the user consent state dynamically.
   */
  setConsent(consent: boolean): void {
    this.config.consentGiven = consent;
  }

  /**
   * Checks if consent is currently granted.
   */
  isConsentGranted(): boolean {
    return this.config.consentGiven;
  }

  /**
   * Sanitizes DOM element text if it matches redacting conditions.
   */
  sanitizeText(text: string, element?: HTMLElement): string {
    if (!this.config.enableDomRedaction || !text) return text;

    if (element) {
      // If class matches masked input classes
      if (this.config.maskedInputClasses.some(cls => element.classList.contains(cls))) {
        return '***';
      }

      // Check element attribute names (id, name, data-*) for sensitive keywords
      const textToScan = [
        element.id,
        element.getAttribute('name'),
        element.getAttribute('placeholder'),
        element.className
      ].filter(Boolean).join(' ').toLowerCase();

      if (this.config.redactKeywords.some(keyword => textToScan.includes(keyword))) {
        return '***';
      }
    }

    return text;
  }

  /**
   * Masks input elements client-side to prevent leakage.
   */
  sanitizeInput(value: string, inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (!value) return '';

    // Passwords must always be masked
    if (inputElement && 'type' in inputElement && (inputElement as any).type === 'password') {
      return '••••••••';
    }

    // Check name, id, placeholder, autocomplete attributes for sensitive indicators
    const id = inputElement.id || '';
    const name = inputElement.getAttribute('name') || '';
    const placeholder = inputElement.getAttribute('placeholder') || '';
    const searchString = `${id} ${name} ${placeholder}`.toLowerCase();

    const isSensitive = this.config.redactKeywords.some(keyword => searchString.includes(keyword));
    if (isSensitive) {
      return '••••••••';
    }

    // If explicitly whitelisted/unmasked
    const isExplicitlyUnmasked = this.config.unmaskedInputClasses.some(cls => inputElement.classList.contains(cls));
    if (isExplicitlyUnmasked) {
      return value;
    }

    // If global input masking is enabled
    if (this.config.maskAllInputs) {
      return value.replace(/./g, '•');
    }

    // If matches masked classes
    const isExplicitlyMasked = this.config.maskedInputClasses.some(cls => inputElement.classList.contains(cls));
    if (isExplicitlyMasked) {
      return value.replace(/./g, '•');
    }

    return value;
  }
}
