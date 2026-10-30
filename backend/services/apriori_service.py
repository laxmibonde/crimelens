"""
CrimeLens - Apriori Association Rule Mining Service
Extracts transaction itemsets per crime incident from PostgreSQL data warehouse,
encodes transactions, executes Apriori frequent itemset mining via mlxtend,
extracts association rules, computes metrics (Support, Confidence, Lift, Leverage, Conviction),
and filters invalid/trivial rules with strict dataset isolation.
"""

import os
import sys
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import execute_query, get_schema_for_dataset

# Global In-Memory Cache for Apriori Results
APRIORI_CACHE: Dict[str, Any] = {}
CACHE_MAX_SIZE = 100

ALL_AVAILABLE_ATTRIBUTES = {
    "crime_type": "Crime Category (e.g. CrimeType=THEFT)",
    "premise": "Premise Location (e.g. Premise=STREET)",
    "time_period": "Time of Day (e.g. TimePeriod=NIGHT)",
    "weekend": "Weekend Flag (e.g. Weekend=YES)",
    "arrest": "Arrest Flag (e.g. Arrest=YES)",
    "domestic": "Domestic Flag (e.g. Domestic=YES)",
    "district": "Police District (e.g. District=011)"
}

DEFAULT_MINING_ATTRIBUTES = ["crime_type", "premise", "time_period", "weekend", "arrest", "domestic"]


def build_apriori_where_clause(filters: Optional[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
    where_parts = []
    params = {}
    if not filters:
        return "", {}

    for key, val in filters.items():
        if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
            continue

        if key == "year":
            if isinstance(val, list):
                where_parts.append(f"t.year IN ({','.join([f':year_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"year_{i}"] = int(v)
            else:
                where_parts.append("t.year = :year")
                params["year"] = int(val)

        elif key == "month":
            if isinstance(val, list):
                where_parts.append(f"t.month IN ({','.join([f':month_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"month_{i}"] = int(v)
            else:
                where_parts.append("t.month = :month")
                params["month"] = int(val)

        elif key == "district":
            if isinstance(val, list):
                where_parts.append(f"a.district IN ({','.join([f':district_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"district_{i}"] = str(v)
            else:
                where_parts.append("a.district = :district")
                params["district"] = str(val)

        elif key == "primary_type":
            if isinstance(val, list):
                where_parts.append(f"c.primary_type IN ({','.join([f':primary_type_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"primary_type_{i}"] = str(v)
            else:
                where_parts.append("c.primary_type = :primary_type")
                params["primary_type"] = str(val)

    where_sql = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
    return where_sql, params


def extract_incident_transactions(
    dataset: str = "real",
    selected_attributes: Optional[List[str]] = None,
    filters: Optional[Dict[str, Any]] = None
) -> Tuple[List[List[str]], int]:
    """
    Queries PostgreSQL to retrieve 1 transaction itemset per incident record.
    Formats categorical items as Key=Value strings.
    """
    schema = get_schema_for_dataset(dataset)
    attrs = selected_attributes or DEFAULT_MINING_ATTRIBUTES
    attrs = [a for a in attrs if a in ALL_AVAILABLE_ATTRIBUTES]
    if not attrs:
        attrs = DEFAULT_MINING_ATTRIBUTES

    where_sql, params = build_apriori_where_clause(filters)

    sql = f"""
        SELECT 
            f.crime_fact_key,
            c.primary_type,
            p.location_description AS premise,
            t.time_period,
            t.is_weekend,
            s.arrest,
            s.domestic,
            a.district
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_premise p ON f.premise_key = p.premise_key
        {where_sql};
    """

    df = execute_query(sql, params)
    total_incidents = len(df)

    if total_incidents == 0:
        return [], 0

    transactions = []
    for row in df.itertuples(index=False):
        t_items = []
        if "crime_type" in attrs and pd.notna(row.primary_type) and row.primary_type != "UNKNOWN":
            t_items.append(f"CrimeType={str(row.primary_type).strip().upper()}")

        if "premise" in attrs and pd.notna(row.premise) and row.premise != "UNKNOWN":
            prem = str(row.premise).strip().upper()
            # Group specific minor premise categories if needed or preserve main description
            if len(prem) > 30:
                prem = prem[:30]
            t_items.append(f"Premise={prem}")

        if "time_period" in attrs and pd.notna(row.time_period) and str(row.time_period).upper() != "UNKNOWN":
            t_items.append(f"TimePeriod={str(row.time_period).strip().upper()}")

        if "weekend" in attrs and pd.notna(row.is_weekend):
            t_items.append(f"Weekend={'YES' if row.is_weekend else 'NO'}")

        if "arrest" in attrs and pd.notna(row.arrest):
            t_items.append(f"Arrest={'YES' if row.arrest else 'NO'}")

        if "domestic" in attrs and pd.notna(row.domestic):
            t_items.append(f"Domestic={'YES' if row.domestic else 'NO'}")

        if "district" in attrs and pd.notna(row.district) and str(row.district) not in ["UNKNOWN", "0"]:
            dist_str = str(row.district).strip().zfill(3)
            t_items.append(f"District={dist_str}")

        if t_items:
            transactions.append(t_items)

    return transactions, total_incidents


def is_valid_rule(antecedent: set, consequent: set) -> bool:
    """
    Validates that rule items do not contain contradictory values from the same attribute family,
    and that antecedent and consequent do not overlap or represent trivial identical dimensions.
    """
    if not antecedent or not consequent:
        return False
    if antecedent.intersection(consequent):
        return False

    # Check for same attribute family in both sides (e.g., CrimeType=THEFT => CrimeType=BATTERY)
    ant_attr_prefixes = {item.split("=")[0] for item in antecedent if "=" in item}
    cons_attr_prefixes = {item.split("=")[0] for item in consequent if "=" in item}

    # If same attribute family appears in both antecedent and consequent, it's contradictory/trivial
    if ant_attr_prefixes.intersection(cons_attr_prefixes):
        return False

    return True


def format_rule_explanation(ant_str: str, cons_str: str, conf_pct: float, lift_val: float) -> str:
    """
    Generates a clear English explanation of the association rule without making causal claims.
    """
    lift_desc = f"{lift_val:.2f}x higher than random co-occurrence" if lift_val > 1.0 else "neutral/below baseline co-occurrence"
    return f"When an incident features [{ant_str}], there is a {conf_pct:.1f}% probability that [{cons_str}] is also present ({lift_desc})."


def mine_apriori_rules(
    dataset: str = "real",
    min_support: float = 0.05,
    min_confidence: float = 0.30,
    min_lift: float = 1.0,
    max_len: int = 3,
    selected_attributes: Optional[List[str]] = None,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main Apriori pipeline:
    Extracts transactions, encodes boolean matrix, mines frequent itemsets via mlxtend,
    derives association rules, computes metrics, and formats response.
    """
    # Parameter Guardrails
    min_support = max(0.001, min(float(min_support), 0.95))
    min_confidence = max(0.01, min(float(min_confidence), 1.0))
    min_lift = max(0.1, min(float(min_lift), 100.0))
    max_len = max(2, min(int(max_len), 5))

    attrs = selected_attributes or DEFAULT_MINING_ATTRIBUTES
    attrs = [a for a in attrs if a in ALL_AVAILABLE_ATTRIBUTES]
    if not attrs:
        attrs = DEFAULT_MINING_ATTRIBUTES

    filter_str = json.dumps(filters or {}, sort_keys=True)
    attr_str = ",".join(sorted(attrs))
    cache_key = f"ds_{dataset}_sup_{min_support:.4f}_conf_{min_confidence:.4f}_lift_{min_lift:.2f}_len_{max_len}_attrs_{attr_str}_flt_{filter_str}"

    if cache_key in APRIORI_CACHE:
        return APRIORI_CACHE[cache_key]

    transactions, total_incidents = extract_incident_transactions(dataset, attrs, filters)

    if not transactions or total_incidents == 0:
        return {
            "status": "NO_TRANSACTIONS",
            "kpi": {
                "total_transactions": 0,
                "frequent_itemsets_count": 0,
                "rules_generated_count": 0,
                "highest_lift": 0.0,
                "avg_confidence": 0.0
            },
            "frequent_itemsets": [],
            "rules": [],
            "scatter_data": [],
            "top_rules": [],
            "disclaimer": "No transactions found matching the specified filters."
        }

    # One-Hot Encoding via TransactionEncoder
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

    # 1. Mine Frequent Itemsets
    frequent_itemsets = apriori(
        df_encoded,
        min_support=min_support,
        use_colnames=True,
        max_len=max_len
    )

    frequent_count = len(frequent_itemsets)

    if frequent_itemsets.empty:
        result = {
            "status": "NO_FREQUENT_ITEMSETS",
            "kpi": {
                "total_transactions": total_incidents,
                "frequent_itemsets_count": 0,
                "rules_generated_count": 0,
                "highest_lift": 0.0,
                "avg_confidence": 0.0
            },
            "parameters": {
                "min_support": min_support,
                "min_confidence": min_confidence,
                "min_lift": min_lift,
                "max_len": max_len,
                "attributes_used": attrs
            },
            "frequent_itemsets": [],
            "rules": [],
            "scatter_data": [],
            "top_rules": [],
            "disclaimer": f"No itemsets met the min_support threshold of {min_support*100:.1f}%. Try lowering min_support."
        }
        APRIORI_CACHE[cache_key] = result
        return result

    # Format Frequent Itemsets List
    frequent_list = []
    for idx, row in frequent_itemsets.iterrows():
        items_set = list(row["itemsets"])
        sup = float(row["support"])
        freq_count = int(round(sup * total_incidents))
        frequent_list.append({
            "itemset": sorted(items_set),
            "itemset_str": " + ".join(sorted(items_set)),
            "support": round(sup, 4),
            "support_pct": round(sup * 100, 2),
            "frequency": freq_count,
            "size": len(items_set)
        })

    frequent_list.sort(key=lambda x: x["support"], reverse=True)

    # 2. Extract Association Rules
    rules_df = association_rules(
        frequent_itemsets,
        metric="confidence",
        min_threshold=min_confidence
    )

    if rules_df.empty:
        result = {
            "status": "NO_RULES_FOUND",
            "kpi": {
                "total_transactions": total_incidents,
                "frequent_itemsets_count": frequent_count,
                "rules_generated_count": 0,
                "highest_lift": 0.0,
                "avg_confidence": 0.0
            },
            "parameters": {
                "min_support": min_support,
                "min_confidence": min_confidence,
                "min_lift": min_lift,
                "max_len": max_len,
                "attributes_used": attrs
            },
            "frequent_itemsets": frequent_list[:50],
            "rules": [],
            "scatter_data": [],
            "top_rules": [],
            "disclaimer": f"Frequent itemsets were found, but no rules met the min_confidence threshold of {min_confidence*100:.1f}%."
        }
        APRIORI_CACHE[cache_key] = result
        return result

    # Apply Minimum Lift & Rule Quality Pruning
    rules_list = []
    scatter_data = []

    for _, row in rules_df.iterrows():
        ant_set = set(row["antecedents"])
        cons_set = set(row["consequents"])

        if not is_valid_rule(ant_set, cons_set):
            continue

        lift_val = float(row["lift"])
        if lift_val < min_lift:
            continue

        sup_val = float(row["support"])
        conf_val = float(row["confidence"])
        ant_sup = float(row["antecedent support"])
        cons_sup = float(row["consequent support"])

        # Compute Leverage & Conviction safely
        leverage_val = sup_val - (ant_sup * cons_sup)
        if conf_val < 1.0:
            conviction_val = (1.0 - cons_sup) / (1.0 - conf_val) if (1.0 - conf_val) > 1e-6 else 999.0
        else:
            conviction_val = 999.0

        supporting_incidents = int(round(sup_val * total_incidents))
        ant_str = ", ".join(sorted(list(ant_set)))
        cons_str = ", ".join(sorted(list(cons_set)))
        rule_label = f"{{{ant_str}}} ⇒ {{{cons_str}}}"

        rule_obj = {
            "rule_id": len(rules_list) + 1,
            "antecedent": sorted(list(ant_set)),
            "consequent": sorted(list(cons_set)),
            "antecedent_str": ant_str,
            "consequent_str": cons_str,
            "rule_label": rule_label,
            "support": round(sup_val, 4),
            "support_pct": round(sup_val * 100, 2),
            "confidence": round(conf_val, 4),
            "confidence_pct": round(conf_val * 100, 2),
            "lift": round(lift_val, 3),
            "leverage": round(leverage_val, 4),
            "conviction": round(conviction_val, 3) if conviction_val < 900 else 999.0,
            "supporting_incidents": supporting_incidents,
            "explanation": format_rule_explanation(ant_str, cons_str, conf_val * 100, lift_val)
        }

        rules_list.append(rule_obj)
        scatter_data.append({
            "id": rule_obj["rule_id"],
            "support": round(sup_val * 100, 2),
            "confidence": round(conf_val * 100, 2),
            "lift": round(lift_val, 3),
            "rule_label": rule_label
        })

    # Sort Rules by Lift descending
    rules_list.sort(key=lambda r: r["lift"], reverse=True)

    highest_lift = rules_list[0]["lift"] if rules_list else 0.0
    avg_confidence = round(sum(r["confidence_pct"] for r in rules_list) / len(rules_list), 2) if rules_list else 0.0

    top_5_rules = rules_list[:5]

    schema = get_schema_for_dataset(dataset)
    disclaimer = (
        "SIMULATED DATA — Association rules derived from synthetic crime dataset for algorithm demonstration."
        if schema == "synthetic_data"
        else "Historical Chicago crime dataset. Rules reflect statistical co-occurrence probabilities within this sample and DO NOT imply causation or future predictions."
    )

    result = {
        "status": "SUCCESS",
        "parameters": {
            "dataset": dataset,
            "min_support": min_support,
            "min_confidence": min_confidence,
            "min_lift": min_lift,
            "max_len": max_len,
            "attributes_used": attrs
        },
        "kpi": {
            "total_transactions": total_incidents,
            "frequent_itemsets_count": frequent_count,
            "rules_generated_count": len(rules_list),
            "highest_lift": highest_lift,
            "avg_confidence": avg_confidence
        },
        "frequent_itemsets": frequent_list[:50],
        "rules": rules_list[:100],  # Top 100 rules for clean display
        "scatter_data": scatter_data[:100],
        "top_rules": top_5_rules,
        "disclaimer": disclaimer
    }

    if len(APRIORI_CACHE) >= CACHE_MAX_SIZE:
        APRIORI_CACHE.pop(next(iter(APRIORI_CACHE)))
    APRIORI_CACHE[cache_key] = result

    return result


def get_apriori_explanation_metadata() -> Dict[str, Any]:
    """
    Returns educational documentation and formula definitions for Apriori Association Rule Mining.
    """
    return {
        "title": "Apriori Association Rule Mining & Pattern Discovery",
        "concepts": [
            {
                "term": "Transaction",
                "definition": "Each individual crime incident in PostgreSQL serves as a transaction containing categorical item attributes (e.g. CrimeType, Premise, TimePeriod, Arrest status)."
            },
            {
                "term": "Frequent Itemset",
                "definition": "A combination of items that appears together in at least min_support percentage of all analyzed transactions."
            },
            {
                "term": "Apriori Principle",
                "definition": "If an itemset is frequent, all of its subsets must also be frequent. Conversely, if an itemset is infrequent, all of its supersets are pruned immediately, drastically reducing search space."
            },
            {
                "term": "Support",
                "formula": "P(A ∩ B) = Count(A ∪ B) / Total_Transactions",
                "definition": "The proportion of total transactions that contain both itemset A and itemset B."
            },
            {
                "term": "Confidence",
                "formula": "P(B | A) = Support(A ∩ B) / Support(A)",
                "definition": "The conditional probability that itemset B occurs given that itemset A is present."
            },
            {
                "term": "Lift",
                "formula": "Lift(A ⇒ B) = Confidence(A ⇒ B) / Support(B)",
                "definition": "Measures how much more often A and B occur together than would be expected if they were statistically independent. Lift > 1.0 indicates strong positive association."
            },
            {
                "term": "Leverage",
                "formula": "Leverage(A ⇒ B) = Support(A ∩ B) - [Support(A) × Support(B)]",
                "definition": "Measures the difference between the observed frequency of A and B appearing together and the expected frequency if independent."
            },
            {
                "term": "Conviction",
                "formula": "Conviction(A ⇒ B) = [1 - Support(B)] / [1 - Confidence(A ⇒ B)]",
                "definition": "Measures the degree to which rule A ⇒ B mispredicts the occurrence of B if the rule were purely random."
            }
        ],
        "difference_from_kmeans": (
            "While K-Means segments geographic areas into spatial profile clusters based on continuous feature averages, "
            "Apriori mines discrete categorical relationships across individual crime transactions to find specific 'If-Then' rules."
        )
    }
