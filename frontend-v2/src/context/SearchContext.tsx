import * as React from "react";

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  focusSearch: () => void;
}

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function useSearch(): SearchContextValue {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider>");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const focusSearch = React.useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <SearchContext.Provider value={{ query, setQuery, inputRef, focusSearch }}>
      {children}
    </SearchContext.Provider>
  );
}
