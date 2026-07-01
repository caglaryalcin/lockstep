import { useStore, useTask$, $ } from '@builder.io/qwik';

import { useLocalStorage } from '~/hooks/useLocalStorage';

const STORAGE_KEY = 'PSC_THEME';
const defaultTheme = 'dark';

export const useTheme = () => {
  const [theme, saveTheme] = useLocalStorage(STORAGE_KEY, defaultTheme);
  const state = useStore({ theme: theme.value });

  useTask$(({ track }) => {
    const storedTheme = track(() => theme.value) || defaultTheme;
    state.theme = storedTheme;
    if (typeof document !== 'undefined') {
      document.getElementsByTagName('body')[0].setAttribute('data-theme', storedTheme);
    }
  });

  const setTheme = $((newTheme: string) => {
    saveTheme(newTheme);
    state.theme = newTheme;
    document.getElementsByTagName('body')[0].setAttribute('data-theme', newTheme);
  });

  return { theme: state, setTheme };
};
