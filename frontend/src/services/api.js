// CrimeLens Dashboard API Service

export function getActiveDataset() {
  return localStorage.getItem('crimelens_dataset') || 'real';
}


function withDataset(params = {}) {
  const clean = { dataset: getActiveDataset() };
  if (params instanceof URLSearchParams) {
    params.forEach((v, k) => {
      if (v !== undefined && v !== '' && v !== 'undefined' && v !== null) clean[k] = v;
    });
    return clean;
  }
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== 'undefined' && v !== null) {
        clean[k] = v;
      }
    }
  }
  return clean;
}

const BASE_URL = '/api/dashboard';

export async function fetchDashboardSummary(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/summary?${query}`);
  if (!res.ok) throw new Error('Failed to fetch summary KPIs');
  return res.json();
}

export async function fetchDashboardTrends(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/trends?${query}`);
  if (!res.ok) throw new Error('Failed to fetch monthly trends');
  return res.json();
}

export async function fetchDashboardCategories(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/categories?${query}`);
  if (!res.ok) throw new Error('Failed to fetch category distribution');
  return res.json();
}

export async function fetchDashboardAreas(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/areas?${query}`);
  if (!res.ok) throw new Error('Failed to fetch district distribution');
  return res.json();
}

export async function fetchDashboardTimeAnalysis(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/time-analysis?${query}`);
  if (!res.ok) throw new Error('Failed to fetch time analysis');
  return res.json();
}

export async function fetchDashboardArrestStats(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/arrest-stats?${query}`);
  if (!res.ok) throw new Error('Failed to fetch arrest statistics');
  return res.json();
}

export async function fetchDashboardDomesticStats(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/domestic-stats?${query}`);
  if (!res.ok) throw new Error('Failed to fetch domestic statistics');
  return res.json();
}

export async function fetchDashboardFilters(dataset) {
  const activeDs = dataset || getActiveDataset();
  const res = await fetch(`${BASE_URL}/filters?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}

export async function fetchDashboardInsights(filters = {}) {
  const query = new URLSearchParams(withDataset(filters)).toString();
  const res = await fetch(`${BASE_URL}/insights?${query}`);
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

// OLAP Data Cube API Service
const OLAP_BASE_URL = '/api/olap';

export async function fetchOLAPMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${OLAP_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch OLAP metadata');
  return res.json();
}

export async function fetchOLAPRollup(payload = {}) {
  const res = await fetch(`${OLAP_BASE_URL}/rollup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to execute OLAP Rollup/Drilldown query');
  return res.json();
}

export async function fetchOLAPSliceDice(payload = {}) {
  const res = await fetch(`${OLAP_BASE_URL}/slice-dice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to execute OLAP Slice/Dice query');
  return res.json();
}

export async function fetchOLAPPivot(payload = {}) {
  const res = await fetch(`${OLAP_BASE_URL}/pivot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to execute OLAP Pivot matrix query');
  return res.json();
}

// DBSCAN Hotspots API Service
const HOTSPOTS_BASE_URL = '/api/hotspots';

export async function fetchHotspotsSummary() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${HOTSPOTS_BASE_URL}/summary?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch spatial summary');
  return res.json();
}

export async function checkHotspotScope(payload = {}) {
  const res = await fetch(`${HOTSPOTS_BASE_URL}/scope-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to verify spatial scope');
  return res.json();
}

export async function fetchHotspotClusters(payload = {}) {
  const res = await fetch(`${HOTSPOTS_BASE_URL}/clusters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to compute DBSCAN clusters');
  return res.json();
}

export async function fetchHotspotPoints(payload = {}) {
  const res = await fetch(`${HOTSPOTS_BASE_URL}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch spatial points');
  return res.json();
}

export async function fetchClusterDetails(payload = {}) {
  const res = await fetch(`${HOTSPOTS_BASE_URL}/cluster-details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch cluster details');
  return res.json();
}

// Phase 8 Temporal Hotspot Evolution API Service
export async function fetchTimelineMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${HOTSPOTS_BASE_URL}/timeline/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch timeline metadata');
  return res.json();
}

export async function fetchTimelineSingleFrame(yearOrPayload = 2023, month = 1, epsMeters = 300, minSamples = 15, filters = {}) {
  let bodyPayload = {};
  if (typeof yearOrPayload === 'object') {
    bodyPayload = { ...yearOrPayload };
  } else {
    bodyPayload = {
      year: yearOrPayload,
      month,
      eps_meters: epsMeters,
      min_samples: minSamples,
      filters
    };
  }
  const res = await fetch(`${HOTSPOTS_BASE_URL}/timeline/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(bodyPayload))
  });
  if (!res.ok) throw new Error('Failed to fetch single timeline frame');
  return res.json();
}

export async function fetchTimelineFrames(startYearOrPayload = 1, endYear = 24, epsMeters = 300, minSamples = 15, filters = {}) {
  let bodyPayload = {};
  if (typeof startYearOrPayload === 'object') {
    bodyPayload = { ...startYearOrPayload };
  } else {
    bodyPayload = {
      start_frame: startYearOrPayload,
      end_frame: endYear,
      eps_meters: epsMeters,
      min_samples: minSamples,
      filters
    };
  }
  const res = await fetch(`${HOTSPOTS_BASE_URL}/timeline/frames`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(bodyPayload))
  });
  if (!res.ok) throw new Error('Failed to fetch timeline animation frames');
  return res.json();
}

export async function fetchTimelineCompare(periodAOrPayload = {}, periodB = null, epsMeters = 300.0, minSamples = 15, filters = {}) {
  let bodyPayload = {};
  if (periodB !== null || (periodAOrPayload && periodAOrPayload.year !== undefined && !periodAOrPayload.period_a)) {
    // Multi-argument call signature: (periodA, periodB, epsMeters, minSamples, filters)
    bodyPayload = {
      period_a: periodAOrPayload,
      period_b: periodB || { year: 2024, month: 1 },
      eps_meters: epsMeters,
      min_samples: minSamples,
      filters
    };
  } else {
    bodyPayload = { ...periodAOrPayload };
  }
  const res = await fetch(`${HOTSPOTS_BASE_URL}/timeline/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(bodyPayload))
  });
  if (!res.ok) throw new Error('Failed to compare timeline periods');
  return res.json();
}

export async function fetchTimelineTrends(epsOrPayload = 300.0, minSamples = 15, filters = {}) {
  let bodyPayload = {};
  if (typeof epsOrPayload === 'object') {
    bodyPayload = { ...epsOrPayload };
  } else {
    bodyPayload = {
      eps_meters: epsOrPayload,
      min_samples: minSamples,
      filters
    };
  }
  const res = await fetch(`${HOTSPOTS_BASE_URL}/timeline/trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(bodyPayload))
  });
  if (!res.ok) throw new Error('Failed to fetch timeline trends');
  return res.json();
}

// Phase 9 K-Means Area Clustering API Service
const KMEANS_BASE_URL = '/api/kmeans';

export async function fetchKMeansMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${KMEANS_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch K-Means metadata');
  return res.json();
}

export async function fetchKMeansAnalyze(payload = {}) {
  const res = await fetch(`${KMEANS_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to run K-Means area analysis');
  return res.json();
}

export async function fetchKMeansEvaluateK(payload = {}) {
  const res = await fetch(`${KMEANS_BASE_URL}/evaluate-k`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to evaluate optimal K curve');
  return res.json();
}

export async function fetchKMeansAreaProfile(areaId, granularity = 'district') {
  const activeDs = getActiveDataset();
  const res = await fetch(`${KMEANS_BASE_URL}/area-profile?area_id=${areaId}&area_granularity=${granularity}&dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch area profile');
  return res.json();
}

export async function fetchKMeansExplanation() {
  const res = await fetch(`${KMEANS_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch K-Means explanation');
  return res.json();
}

// Phase 10 Apriori Association Rule Mining API Service
const APRIORI_BASE_URL = '/api/apriori';

export async function fetchAprioriMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${APRIORI_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Apriori metadata');
  return res.json();
}

export async function fetchAprioriAnalyze(payload = {}) {
  const res = await fetch(`${APRIORI_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to run Apriori rule analysis');
  return res.json();
}

export async function fetchAprioriFrequentItemsets(payload = {}) {
  const res = await fetch(`${APRIORI_BASE_URL}/frequent-itemsets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch frequent itemsets');
  return res.json();
}

export async function fetchAprioriExplanation() {
  const res = await fetch(`${APRIORI_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch Apriori explanation');
  return res.json();
}

// Phase 11 Decision Tree Classification API Service
const DT_BASE_URL = '/api/decision-tree';

export async function fetchDecisionTreeMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DT_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Decision Tree metadata');
  return res.json();
}

export async function fetchDecisionTreeTrain(payload = {}) {
  const res = await fetch(`${DT_BASE_URL}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to train Decision Tree model');
  return res.json();
}

export async function fetchDecisionTreeDepthAnalysis(payload = {}) {
  const res = await fetch(`${DT_BASE_URL}/depth-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to run depth analysis');
  return res.json();
}

export async function fetchDecisionTreeClassifyExample(payload = {}) {
  const res = await fetch(`${DT_BASE_URL}/classify-example`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to classify example incident');
  return res.json();
}

export async function fetchDecisionTreeExplanation() {
  const res = await fetch(`${DT_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch Decision Tree explanation');
  return res.json();
}

// Phase 12 Area Intelligence & Comparison API Service
const AREA_INTEL_BASE_URL = '/api/area-intelligence';

export async function fetchAreaIntelligenceMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${AREA_INTEL_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Area Intelligence metadata');
  return res.json();
}

export async function fetchAreaIntelligenceList(granularity = 'district') {
  const activeDs = getActiveDataset();
  const res = await fetch(`${AREA_INTEL_BASE_URL}/areas?granularity=${granularity}&dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch area list');
  return res.json();
}

export async function fetchAreaIntelligenceProfile(payload = {}) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch area profile');
  return res.json();
}

export async function fetchAreaIntelligenceCompare(payload = {}) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to compare areas');
  return res.json();
}

export async function fetchAreaIntelligenceSimilar(payload = {}) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/similar-areas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch similar areas');
  return res.json();
}

export async function fetchAreaIntelligenceExplanation() {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch Area Intelligence explanation');
  return res.json();
}

export async function fetchDistrictBoundaries() {
  // First try backend API, fallback to public static file
  try {
    const res = await fetch(`${AREA_INTEL_BASE_URL}/boundaries/districts`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('API boundaries fetch failed, trying static fallback', e);
  }
  const staticRes = await fetch('/data/chicago_police_districts.geojson');
  if (!staticRes.ok) throw new Error('Failed to load Chicago Police District boundaries');
  return staticRes.json();
}

export async function fetchDistrictsChoroplethSummary(filters = {}) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/districts-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset({ filters }))
  });
  if (!res.ok) throw new Error('Failed to fetch district choropleth summary');
  return res.json();
}

export async function fetchGeocodedIncidents(filters = {}, limit = 2000, bounds = null) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset({ filters, limit, bounds }))
  });
  if (!res.ok) throw new Error('Failed to fetch geocoded incidents');
  return res.json();
}

export async function fetchDensityHeatmap(filters = {}, limit = 5000) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/heatmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset({ filters, limit }))
  });
  if (!res.ok) throw new Error('Failed to fetch density heatmap points');
  return res.json();
}

export async function fetchDistrictTacticalProfile(districtId, filters = {}) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/district-tactical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset({ district_id: districtId, filters }))
  });
  if (!res.ok) throw new Error('Failed to fetch district tactical profile');
  return res.json();
}

export async function fetchAreaHotspotsOverlay(filters = {}, epsMeters = 350, minSamples = 15) {
  const res = await fetch(`${AREA_INTEL_BASE_URL}/hotspots-overlay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset({ filters, eps_meters: epsMeters, min_samples: minSamples }))
  });
  if (!res.ok) throw new Error('Failed to compute hotspots overlay');
  return res.json();
}

// Phase 13 Advanced Crime Trend Analysis API Service
const TRENDS_BASE_URL = '/api/trends';

export async function fetchTrendsMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${TRENDS_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch trend analysis metadata');
  return res.json();
}

export async function fetchTrendsTimeseries(payload = {}) {
  const res = await fetch(`${TRENDS_BASE_URL}/timeseries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch time series analysis');
  return res.json();
}

export async function fetchTrendsComparePeriods(payload = {}) {
  const res = await fetch(`${TRENDS_BASE_URL}/compare-periods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to compare time periods');
  return res.json();
}

export async function fetchTrendsHeatmap(payload = {}) {
  const res = await fetch(`${TRENDS_BASE_URL}/heatmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch day-hour heatmap matrix');
  return res.json();
}

export async function fetchCategoryTrends(payload = {}) {
  const res = await fetch(`${TRENDS_BASE_URL}/category-trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch category trends');
  return res.json();
}

export async function fetchTrendsSeasonality(payload = {}) {
  const res = await fetch(`${TRENDS_BASE_URL}/seasonality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch seasonality analysis');
  return res.json();
}

export async function fetchTrendsInsights(payload = {}) {
  const activeDs = getActiveDataset();
  const distParam = payload.district ? `&district=${payload.district}` : '';
  const res = await fetch(`${TRENDS_BASE_URL}/insights?dataset=${activeDs}${distParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch temporal insights');
  return res.json();
}

export async function fetchTrendsExplanation() {
  const res = await fetch(`${TRENDS_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch trend analysis explanation');
  return res.json();
}

// Phase 14 What Changed? Multi-Dimensional Comparison API Service
const CHANGES_BASE_URL = '/api/changes';

export async function fetchChangesMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${CHANGES_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch comparison metadata');
  return res.json();
}

export async function fetchChangesOverview(payload = {}) {
  const res = await fetch(`${CHANGES_BASE_URL}/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch comparison overview');
  return res.json();
}

export async function fetchChangesCategories(payload = {}) {
  const res = await fetch(`${CHANGES_BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch category changes');
  return res.json();
}

export async function fetchChangesAreas(payload = {}) {
  const res = await fetch(`${CHANGES_BASE_URL}/areas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch geographic area changes');
  return res.json();
}

export async function fetchChangesTemporal(payload = {}) {
  const res = await fetch(`${CHANGES_BASE_URL}/temporal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch temporal pattern changes');
  return res.json();
}

export async function fetchChangesHotspots(payload = {}) {
  const res = await fetch(`${CHANGES_BASE_URL}/hotspots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch spatial hotspot comparison');
  return res.json();
}

export async function fetchChangesInsights() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${CHANGES_BASE_URL}/insights?dataset=${activeDs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch comparison insights');
  return res.json();
}

export async function fetchChangesExplanation() {
  const res = await fetch(`${CHANGES_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch comparison explanation');
  return res.json();
}

// Phase 15 Automated Data-Driven Insights API Service
const INSIGHTS_BASE_URL = '/api/insights';

export async function fetchInsightsMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${INSIGHTS_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch insights metadata');
  return res.json();
}

export async function fetchGeneratedInsights(payload = {}) {
  const res = await fetch(`${INSIGHTS_BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to generate automated insights');
  return res.json();
}

export async function fetchInsightsExecutiveSummary(payload = {}) {
  const res = await fetch(`${INSIGHTS_BASE_URL}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch executive summary narrative');
  return res.json();
}

export async function fetchInsightsByCategory(payload = {}) {
  const res = await fetch(`${INSIGHTS_BASE_URL}/by-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataset(payload))
  });
  if (!res.ok) throw new Error('Failed to fetch insights by category');
  return res.json();
}

export async function fetchInsightsExplanation() {
  const res = await fetch(`${INSIGHTS_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch insights engine explanation');
  return res.json();
}

// Phase 16 ETL Monitoring, Pipeline Observability & Data Lineage API Service
const ETL_BASE_URL = '/api/etl';

export async function fetchETLMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${ETL_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch ETL metadata');
  return res.json();
}

export async function fetchETLPipelineStages() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${ETL_BASE_URL}/pipeline-stages?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch ETL pipeline stages');
  return res.json();
}

export async function fetchETLHealthCheck() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${ETL_BASE_URL}/health-check?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch warehouse health check');
  return res.json();
}

export async function fetchETLReconciliation() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${ETL_BASE_URL}/reconciliation?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch source-to-warehouse reconciliation');
  return res.json();
}

export async function fetchETLLineage() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${ETL_BASE_URL}/lineage?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch data lineage graph');
  return res.json();
}

export async function fetchETLExplanation() {
  const res = await fetch(`${ETL_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch ETL monitoring explanation');
  return res.json();
}

// Phase 17 Data Quality Intelligence & Warehouse Visualization API Service
const DQ_BASE_URL = '/api/data-quality';

export async function fetchDQMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Data Quality metadata');
  return res.json();
}

export async function fetchDQOverview() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/overview?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Data Quality overview');
  return res.json();
}

export async function fetchDQValidation(statusFilter = null) {
  const activeDs = getActiveDataset();
  const filterQuery = statusFilter ? `&status_filter=${statusFilter}` : '';
  const res = await fetch(`${DQ_BASE_URL}/validation?dataset=${activeDs}${filterQuery}`);
  if (!res.ok) throw new Error('Failed to fetch Data Quality validation rules');
  return res.json();
}

export async function fetchDQCompleteness() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/completeness?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch completeness profile');
  return res.json();
}

export async function fetchDQCoverage() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/coverage?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch coverage profile');
  return res.json();
}

export async function fetchDQSchema() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/schema?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch schema explorer metadata');
  return res.json();
}

export async function fetchDQColumnProfile(tableName = 'fact_crime', columnName = 'source_crime_id') {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/profile?dataset=${activeDs}&table_name=${tableName}&column_name=${columnName}`);
  if (!res.ok) throw new Error('Failed to profile column');
  return res.json();
}

export async function fetchDQComparison() {
  const res = await fetch(`${DQ_BASE_URL}/comparison`);
  if (!res.ok) throw new Error('Failed to fetch dataset quality comparison');
  return res.json();
}

export async function fetchDQIssues() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${DQ_BASE_URL}/issues?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch data quality issues');
  return res.json();
}

export async function fetchDQExplanation() {
  const res = await fetch(`${DQ_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch Data Quality explanation');
  return res.json();
}

// Phase 18 Report Generation & Analytics Exports API Service
const REPORTS_BASE_URL = '/api/reports';

export async function fetchReportsMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${REPORTS_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Report Center metadata');
  return res.json();
}

export async function fetchReportPreview(reportType = 'comprehensive', filters = {}) {
  const payload = withDataset({ report_type: reportType, filters });
  const res = await fetch(`${REPORTS_BASE_URL}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate report preview');
  return res.json();
}

export async function downloadReportFile(reportType = 'comprehensive', format = 'pdf', filters = {}) {
  const payload = withDataset({ report_type: reportType, filters });
  const endpoint = `${REPORTS_BASE_URL}/export/${format.toLowerCase()}`;
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error(`Failed to generate ${format.toUpperCase()} report download`);
  
  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = `CrimeLens_${reportType}_${getActiveDataset()}.${format.toLowerCase()}`;
  if (contentDisposition && contentDisposition.includes('filename=')) {
    filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchReportsExplanation() {
  const res = await fetch(`${REPORTS_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch report generation explanation');
  return res.json();
}

// Power BI Integration & Semantic Model API Service
const POWERBI_BASE_URL = '/api/powerbi';

export async function fetchPBIMetadata() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${POWERBI_BASE_URL}/metadata?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Power BI metadata');
  return res.json();
}

export async function fetchPBIModel() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${POWERBI_BASE_URL}/model?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Power BI semantic model');
  return res.json();
}

export async function fetchPBIMeasures() {
  const res = await fetch(`${POWERBI_BASE_URL}/measures`);
  if (!res.ok) throw new Error('Failed to fetch DAX measure library');
  return res.json();
}

export async function fetchPBISetup() {
  const res = await fetch(`${POWERBI_BASE_URL}/setup`);
  if (!res.ok) throw new Error('Failed to fetch Power BI setup guide');
  return res.json();
}

export async function fetchPBIStatus() {
  const activeDs = getActiveDataset();
  const res = await fetch(`${POWERBI_BASE_URL}/status?dataset=${activeDs}`);
  if (!res.ok) throw new Error('Failed to fetch Power BI artifact status');
  return res.json();
}

export async function fetchPBIExplanation() {
  const res = await fetch(`${POWERBI_BASE_URL}/explain`);
  if (!res.ok) throw new Error('Failed to fetch BI concepts explanation');
  return res.json();
}








