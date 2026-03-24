declare module "country-list" {
  export type CountryListEntry = {
    code: string;
    name: string;
  };

  export function getData(): CountryListEntry[];
}
