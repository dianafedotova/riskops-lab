export type CountryOption = {
  code: string;
  name: string;
};

import { getData } from "country-list";

export const COUNTRY_OPTIONS: CountryOption[] = getData()
  .map((country) => ({ code: country.code, name: country.name }))
  .sort((a, b) => a.name.localeCompare(b.name));
