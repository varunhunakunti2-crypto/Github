'use client';

import React, { createContext, useContext } from 'react';

export interface WikiPageMeta {
  slug: string;
  title: string;
}

export interface WikiContextType {
  pages: WikiPageMeta[];
  loadPages: () => Promise<void>;
  isLoading: boolean;
}

export const WikiContext = createContext<WikiContextType>({
  pages: [],
  loadPages: async () => {},
  isLoading: true
});

export const useWiki = () => useContext(WikiContext);
