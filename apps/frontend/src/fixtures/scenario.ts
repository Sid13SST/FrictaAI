/**
 * DEV-ONLY — fixture harness scenario selection.
 *
 *   ?fx=populated   sample data everywhere (default)
 *   ?fx=empty       a brand-new account: every list is empty
 *   ?fx=loading     requests never resolve (skeletons stay on screen)
 *   ?fx=error       every request fails with a database-flavoured 500
 *   ?fx=offline     every request fails at the network layer
 *   ?fxAuth=loading the auth widget never finishes loading
 *
 * The choice is kept in sessionStorage so it survives in-app navigation.
 */
export type FixtureScenario = 'populated' | 'empty' | 'loading' | 'error' | 'offline';
const SCENARIOS: FixtureScenario[] = ['populated', 'empty', 'loading', 'error', 'offline'];

function read(key: string, param: string, fallback: string): string {
  const fromUrl = new URLSearchParams(window.location.search).get(param);
  try {
    if (fromUrl) sessionStorage.setItem(key, fromUrl);
    return fromUrl ?? sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fromUrl ?? fallback;
  }
}

const raw = read('fricta.fx', 'fx', 'populated');
export const scenario: FixtureScenario = (SCENARIOS as string[]).includes(raw) ? (raw as FixtureScenario) : 'populated';
export const authLoading = read('fricta.fxAuth', 'fxAuth', 'ready') === 'loading';
