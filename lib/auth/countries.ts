export type CountryOption = {
  code: string;
  name: string;
};

import { getData } from "country-list";

export const COUNTRY_OPTIONS: CountryOption[] = getData()
  .map((country) => ({ code: country.code, name: country.name }))
  // Keep ordering deterministic between server and browser render.
  .sort((a, b) => {
    const left = a.name.toUpperCase();
    const right = b.name.toUpperCase();
    if (left < right) return -1;
    if (left > right) return 1;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
