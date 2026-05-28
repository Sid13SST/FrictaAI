export interface GeneralRemediation {
  category: 'ACCESSIBILITY' | 'FRICTION_REDUCTION' | 'RETENTION';
  title: string;
  description: string;
  effortEstimate: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function compileGeneralRemediations(): GeneralRemediation[] {
  return [
    {
      category: 'ACCESSIBILITY',
      title: 'Ensure 4.5:1 Contrast on Dashboard Titles',
      description: 'The title text colors blend slightly with the obsidian surface. Increase contrast of text elements.',
      effortEstimate: 'LOW'
    },
    {
      category: 'FRICTION_REDUCTION',
      title: 'Auto-Focus First Input Field in Forms',
      description: 'Focusing manually on input fields increases task duration. Auto-focus fields on view mount.',
      effortEstimate: 'LOW'
    },
    {
      category: 'RETENTION',
      title: 'Verify Saved Progress Visual Banner',
      description: 'Provide immediate visual confirmation when form state is auto-saved to reduce anxiety dropouts.',
      effortEstimate: 'MEDIUM'
    }
  ];
}
