import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoEvidenceNote, NO_EVIDENCE_LABEL } from '../../components/common/NoEvidenceNote';

describe('NoEvidenceNote', () => {
  it('says "Unavailable: no evidence" and nothing that reads like a result', () => {
    const html = renderToStaticMarkup(<NoEvidenceNote />);
    expect(NO_EVIDENCE_LABEL).toBe('Unavailable: no evidence');
    expect(html).toContain(NO_EVIDENCE_LABEL);
    expect(html).toContain('data-no-evidence');
    expect(html).not.toMatch(/\d+%|Good|No friction findings detected|emerald/);
  });
});
