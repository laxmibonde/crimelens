import React, { createContext, useContext, useState, useEffect } from 'react';

const DatasetContext = createContext();

export const DATASETS = {
  REAL: 'real',
  SYNTHETIC: 'synthetic'
};

export const DATASET_CONFIG = {
  [DATASETS.REAL]: {
    id: 'real',
    name: 'Real Chicago Census — 761,718 incidents',
    shortName: 'Official Real Data',
    recordCount: 761718,
    isSynthetic: false,
    badgeLabel: 'OFFICIAL DATA',
    badgeClass: 'badge-real',
    disclaimer: 'Official Chicago 3-year crime census (2023–2025). 761,718 authentic reported crime incidents independently reconciled with City of Chicago Open Data Portal.'
  },
  [DATASETS.SYNTHETIC]: {
    id: 'synthetic',
    name: 'Synthetic Demo Data — 30,000 incidents',
    shortName: 'Synthetic Demo Data',
    recordCount: 30000,
    isSynthetic: true,
    badgeLabel: 'SYNTHETIC DEMO',
    badgeClass: 'badge-synthetic',
    disclaimer: 'SIMULATED DATA — Generated incidents for algorithm testing and demonstration. Not actual police reports.'
  }
};

export function DatasetProvider({ children }) {
  const [dataset, setDatasetState] = useState(() => {
    const saved = localStorage.getItem('crimelens_dataset');
    return saved && DATASET_CONFIG[saved] ? saved : DATASETS.REAL;
  });

  const changeDataset = (newDataset) => {
    if (DATASET_CONFIG[newDataset]) {
      localStorage.setItem('crimelens_dataset', newDataset);
      setDatasetState(newDataset);
    }
  };

  const currentConfig = DATASET_CONFIG[dataset];

  return (
    <DatasetContext.Provider
      value={{
        dataset,
        setDataset: changeDataset,
        config: currentConfig,
        isSynthetic: currentConfig.isSynthetic,
        disclaimer: currentConfig.disclaimer,
        allConfigs: DATASET_CONFIG
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
