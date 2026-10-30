"""
CrimeLens - Decision Tree Classification & Explainable Machine Learning Service
Extracts features and target labels from PostgreSQL data warehouse, enforces strict zero-leakage
preprocessing pipelines (fitted on training data only), trains DecisionTreeClassifier, evaluates
classification metrics (Accuracy, Precision, Recall, F1, Balanced Accuracy, ROC-AUC, Confusion Matrix, Baseline),
analyzes depth-versus-performance curves (overfitting), and extracts tree rules & feature importances.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    balanced_accuracy_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import execute_query, get_schema_for_dataset

# Global In-Memory Cache for Decision Tree Models & Evaluation
DECISION_TREE_CACHE: Dict[str, Any] = {}
CACHE_MAX_SIZE = 50

CATEGORICAL_FEATURES = ["primary_type", "premise", "district", "community_area", "day_of_week"]
NUMERIC_FEATURES = ["hour", "month", "is_weekend", "is_domestic"]
ALL_INPUT_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def build_dt_where_clause(filters: Optional[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
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


def extract_classification_dataset(
    dataset: str = "real",
    filters: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """
    Extracts incident features and binary label ('is_arrest') from PostgreSQL.
    Guarantees strict zero target leakage by omitting status_key and post-incident fields.
    """
    schema = get_schema_for_dataset(dataset)
    where_sql, params = build_dt_where_clause(filters)

    limit_clause = "LIMIT 35000" if (not where_sql) else "LIMIT 50000"
    sql = f"""
        SELECT 
            c.primary_type,
            COALESCE(p.location_description, 'UNKNOWN') AS premise,
            COALESCE(a.district, '000') AS district,
            COALESCE(a.community_area, '0') AS community_area,
            COALESCE(t.hour, 12) AS hour,
            COALESCE(t.day_name, 'Monday') AS day_of_week,
            COALESCE(t.month, 1) AS month,
            CASE WHEN t.is_weekend = TRUE THEN 1 ELSE 0 END AS is_weekend,
            CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END AS is_domestic,
            CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END AS is_arrest
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_premise p ON f.premise_key = p.premise_key
        {where_sql}
        ORDER BY f.crime_fact_key DESC
        {limit_clause};
    """

    df = execute_query(sql, params)
    return df


def get_dataset_metadata(dataset: str = "real") -> Dict[str, Any]:
    """
    Returns class distribution, total eligible records, and feature options for the dataset using direct SQL.
    """
    schema = get_schema_for_dataset(dataset)
    arrest_sql = f"""
        SELECT s.arrest, COUNT(*) as cnt
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        GROUP BY s.arrest;
    """
    df_arr = execute_query(arrest_sql)
    arrest_yes = int(df_arr[df_arr["arrest"] == True]["cnt"].sum()) if not df_arr.empty and True in df_arr["arrest"].values else 0
    arrest_no = int(df_arr[df_arr["arrest"] == False]["cnt"].sum()) if not df_arr.empty and False in df_arr["arrest"].values else 0
    total_records = arrest_yes + arrest_no
    if total_records == 0:
        return {
            "total_records": 0,
            "arrest_yes_count": 0,
            "arrest_yes_pct": 0.0,
            "arrest_no_count": 0,
            "arrest_no_pct": 0.0,
            "majority_baseline_pct": 0.0
        }

    arrest_yes_pct = round((arrest_yes / total_records) * 100, 2)
    arrest_no_pct = round((arrest_no / total_records) * 100, 2)
    majority_baseline = max(arrest_yes_pct, arrest_no_pct)

    opts_sql = f"""
        SELECT 
            (SELECT json_agg(DISTINCT primary_type) FROM {schema}.dim_crime WHERE primary_type IS NOT NULL) as primary_types,
            (SELECT json_agg(DISTINCT location_description) FROM (SELECT DISTINCT location_description FROM {schema}.dim_premise WHERE location_description IS NOT NULL ORDER BY location_description LIMIT 50) p) as premises,
            (SELECT json_agg(DISTINCT district) FROM {schema}.dim_area WHERE district IS NOT NULL AND district != '000') as districts;
    """
    df_opts = execute_query(opts_sql)
    row = df_opts.iloc[0] if not df_opts.empty else {}
    primary_types = sorted(row.get("primary_types") or [])
    premises = sorted(row.get("premises") or [])
    districts = sorted(row.get("districts") or [])

    return {
        "dataset": dataset,
        "total_records": total_records,
        "arrest_yes_count": arrest_yes,
        "arrest_yes_pct": arrest_yes_pct,
        "arrest_no_count": arrest_no,
        "arrest_no_pct": arrest_no_pct,
        "majority_baseline_pct": majority_baseline,
        "feature_options": {
            "primary_types": primary_types,
            "premises": premises,
            "districts": districts,
            "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        }
    }


def parse_tree_node(tree, feature_names, node_id=0, depth=0, max_render_depth=4) -> Dict[str, Any]:
    """
    Recursively builds a clean JSON structure of the decision tree up to max_render_depth.
    """
    left_child = int(tree.children_left[node_id])
    right_child = int(tree.children_right[node_id])
    is_leaf = bool(left_child == right_child)


    values = tree.value[node_id][0]
    total_samples = int(tree.n_node_samples[node_id])
    no_count = int(values[0]) if len(values) > 0 else 0
    yes_count = int(values[1]) if len(values) > 1 else 0
    predicted_class = "Arrest = YES" if yes_count > no_count else "Arrest = NO"
    prob_yes = round((yes_count / total_samples) * 100, 1) if total_samples > 0 else 0.0

    node_data = {
        "id": int(node_id),
        "depth": depth,
        "is_leaf": is_leaf,
        "samples": total_samples,
        "no_count": no_count,
        "yes_count": yes_count,
        "prob_yes": prob_yes,
        "predicted_class": predicted_class,
        "impurity": round(float(tree.impurity[node_id]), 4)
    }

    if not is_leaf:
        feat_idx = tree.feature[node_id]
        feat_name = feature_names[feat_idx] if feat_idx < len(feature_names) else f"feature_{feat_idx}"
        threshold = round(float(tree.threshold[node_id]), 2)

        # Format threshold text cleanly for binary/categorical features
        condition_str = f"{feat_name} <= {threshold}"
        node_data["feature"] = feat_name
        node_data["threshold"] = threshold
        node_data["condition"] = condition_str

        if depth < max_render_depth:
            node_data["left"] = parse_tree_node(tree, feature_names, left_child, depth + 1, max_render_depth)
            node_data["right"] = parse_tree_node(tree, feature_names, right_child, depth + 1, max_render_depth)
        else:
            node_data["children_truncated"] = True

    return node_data


def train_and_evaluate_tree(
    dataset: str = "real",
    max_depth: Optional[int] = 5,
    min_samples_split: int = 20,
    min_samples_leaf: int = 10,
    criterion: str = "gini",
    class_weight: Optional[str] = None,
    test_size: float = 0.20,
    random_state: int = 42,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main Decision Tree Training & Evaluation Pipeline:
    1. Extracts dataset from PostgreSQL.
    2. Performs stratified train/test split.
    3. Fits ColumnTransformer + OneHotEncoder ONLY on train set.
    4. Trains DecisionTreeClassifier.
    5. Computes complete suite of evaluation metrics & confusion matrix.
    6. Extracts feature importances and tree structure.
    """
    # Parameter Guardrails
    max_depth = None if (max_depth is None or max_depth <= 0) else max(1, min(int(max_depth), 20))
    min_samples_split = max(2, min(int(min_samples_split), 1000))
    min_samples_leaf = max(1, min(int(min_samples_leaf), 500))
    criterion = criterion if criterion in ["gini", "entropy", "log_loss"] else "gini"
    class_weight = "balanced" if class_weight == "balanced" else None

    filter_str = json.dumps(filters or {}, sort_keys=True)
    cache_key = f"ds_{dataset}_md_{max_depth}_mss_{min_samples_split}_msl_{min_samples_leaf}_crit_{criterion}_cw_{class_weight}_flt_{filter_str}"

    if cache_key in DECISION_TREE_CACHE:
        return DECISION_TREE_CACHE[cache_key]

    df = extract_classification_dataset(dataset, filters)
    total_records = len(df)

    if total_records < 50:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": f"Only {total_records} records found. At least 50 records required for Decision Tree training."
        }

    X = df[ALL_INPUT_FEATURES]
    y = df["is_arrest"]

    # 1. Stratified Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )

    # 2. Strict Preprocessing Pipeline (Fitted ON TRAIN DATA ONLY)
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
        ],
        remainder="passthrough"
    )

    X_train_encoded = preprocessor.fit_transform(X_train)
    X_test_encoded = preprocessor.transform(X_test)

    # Reconstruct Feature Names from Encoder
    cat_feature_names = preprocessor.named_transformers_["cat"].get_feature_names_out(CATEGORICAL_FEATURES)
    all_feature_names = list(cat_feature_names) + NUMERIC_FEATURES

    # 3. Fit DecisionTreeClassifier
    dt = DecisionTreeClassifier(
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        min_samples_leaf=min_samples_leaf,
        criterion=criterion,
        class_weight=class_weight,
        random_state=random_state
    )
    dt.fit(X_train_encoded, y_train)

    # 4. Model Predictions
    y_pred_test = dt.predict(X_test_encoded)
    y_pred_train = dt.predict(X_train_encoded)

    try:
        y_prob_test = dt.predict_proba(X_test_encoded)[:, 1]
        roc_auc_val = round(float(roc_auc_score(y_test, y_prob_test)), 4)
    except Exception:
        roc_auc_val = 0.50

    # 5. Calculate Metrics
    acc_test = round(float(accuracy_score(y_test, y_pred_test)) * 100, 2)
    acc_train = round(float(accuracy_score(y_train, y_pred_train)) * 100, 2)

    prec = round(float(precision_score(y_test, y_pred_test, zero_division=0)) * 100, 2)
    rec = round(float(recall_score(y_test, y_pred_test, zero_division=0)) * 100, 2)
    f1 = round(float(f1_score(y_test, y_pred_test, zero_division=0)) * 100, 2)
    bal_acc = round(float(balanced_accuracy_score(y_test, y_pred_test)) * 100, 2)

    # Confusion Matrix calculation: [[TN, FP], [FN, TP]]
    cm = confusion_matrix(y_test, y_pred_test)
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    # Class-specific prevalence & Baseline
    test_total = len(y_test)
    no_count = int((y_test == 0).sum())
    yes_count = int((y_test == 1).sum())
    majority_baseline_acc = round(max(no_count, yes_count) / test_total * 100, 2)

    # Sensitivity & Specificity
    sensitivity = rec
    specificity = round((tn / (tn + fp) * 100), 2) if (tn + fp) > 0 else 0.0

    # 6. Feature Importances
    importances = dt.feature_importances_
    feat_imp_list = []
    for idx, imp in enumerate(importances):
        if imp > 0.0001:
            raw_name = all_feature_names[idx]
            # Clean human readable names
            clean_name = raw_name.replace("_", " ").title()
            feat_imp_list.append({
                "feature": raw_name,
                "clean_label": clean_name,
                "importance": round(float(imp), 4),
                "importance_pct": round(float(imp * 100), 2)
            })

    feat_imp_list.sort(key=lambda x: x["importance"], reverse=True)

    # 7. Extract Decision Tree Node Visualization Structure
    tree_struct = parse_tree_node(dt.tree_, all_feature_names, node_id=0, depth=0, max_render_depth=4)

    # 8. Human Readable Rules (Top 5 Branches)
    rules_text = export_text(dt, feature_names=all_feature_names, max_depth=3)

    schema = get_schema_for_dataset(dataset)
    disclaimer = (
        "SIMULATED DATA — Decision Tree trained on synthetic crime dataset for demonstration."
        if schema == "synthetic_data"
        else "Historical Chicago crime dataset sample. Model predictions demonstrate retrospective statistical classification and MUST NOT be used for law enforcement action or predictive profiling."
    )

    result = {
        "status": "SUCCESS",
        "parameters": {
            "dataset": dataset,
            "max_depth": max_depth,
            "min_samples_split": min_samples_split,
            "min_samples_leaf": min_samples_leaf,
            "criterion": criterion,
            "class_weight": class_weight,
            "random_state": random_state
        },
        "dataset_summary": {
            "total_records": total_records,
            "train_size": len(X_train),
            "test_size": test_total,
            "test_arrest_yes": yes_count,
            "test_arrest_no": no_count,
            "majority_baseline_acc": majority_baseline_acc
        },
        "metrics": {
            "test_accuracy": acc_test,
            "train_accuracy": acc_train,
            "overfitting_gap": round(acc_train - acc_test, 2),
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "balanced_accuracy": bal_acc,
            "roc_auc": roc_auc_val,
            "sensitivity": sensitivity,
            "specificity": specificity
        },
        "confusion_matrix": {
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp,
            "total": test_total,
            "tn_pct": round(tn / test_total * 100, 1),
            "fp_pct": round(fp / test_total * 100, 1),
            "fn_pct": round(fn / test_total * 100, 1),
            "tp_pct": round(tp / test_total * 100, 1)
        },
        "feature_importances": feat_imp_list[:15],
        "tree_structure": tree_struct,
        "tree_summary": {
            "depth": int(dt.get_depth()),
            "leaf_count": int(dt.get_n_leaves()),
            "total_nodes": int(dt.tree_.node_count)
        },
        "tree_rules_text": rules_text,
        "disclaimer": disclaimer
    }

    if len(DECISION_TREE_CACHE) >= CACHE_MAX_SIZE:
        DECISION_TREE_CACHE.pop(next(iter(DECISION_TREE_CACHE)))
    DECISION_TREE_CACHE[cache_key] = result

    return result


def analyze_tree_depth_curve(
    dataset: str = "real",
    min_samples_split: int = 20,
    min_samples_leaf: int = 10,
    criterion: str = "gini",
    class_weight: Optional[str] = None,
    max_depth_limit: int = 15
) -> Dict[str, Any]:
    """
    Evaluates Training Accuracy vs Testing Accuracy across max_depth values from 1 to max_depth_limit
    to illustrate underfitting, optimal generalization depth, and overfitting.
    """
    curve_data = []

    for depth in range(1, max_depth_limit + 1):
        res = train_and_evaluate_tree(
            dataset=dataset,
            max_depth=depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            criterion=criterion,
            class_weight=class_weight
        )
        if res.get("status") == "SUCCESS":
            m = res["metrics"]
            curve_data.append({
                "depth": depth,
                "train_accuracy": m["train_accuracy"],
                "test_accuracy": m["test_accuracy"],
                "f1_score": m["f1_score"],
                "gap": m["overfitting_gap"]
            })

    # Find optimal depth (highest test accuracy or F1)
    optimal_depth = max(curve_data, key=lambda x: x["test_accuracy"])["depth"] if curve_data else 5

    return {
        "dataset": dataset,
        "max_depth_limit": max_depth_limit,
        "optimal_depth": optimal_depth,
        "curve": curve_data,
        "explanation": (
            f"Depth {optimal_depth} achieves optimal generalization score. As max_depth increases beyond this, "
            "training accuracy continues rising toward 100% while testing accuracy plateaus or drops, demonstrating overfitting."
        )
    }


def classify_single_incident(
    dataset: str = "real",
    primary_type: str = "THEFT",
    premise: str = "STREET",
    district: str = "001",
    community_area: str = "32",
    hour: int = 14,
    day_of_week: str = "Friday",
    month: int = 6,
    is_weekend: bool = False,
    is_domestic: bool = False,
    max_depth: int = 5
) -> Dict[str, Any]:
    """
    Performs interactive inference on a user-defined incident vector.
    Returns predicted Arrest status, probability distribution, and active decision path rules.
    """
    df = extract_classification_dataset(dataset)
    X = df[ALL_INPUT_FEATURES]
    y = df["is_arrest"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
        ],
        remainder="passthrough"
    )
    X_train_encoded = preprocessor.fit_transform(X_train)

    dt = DecisionTreeClassifier(
        max_depth=max_depth,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42
    )
    dt.fit(X_train_encoded, y_train)

    input_df = pd.DataFrame([{
        "primary_type": str(primary_type).upper(),
        "premise": str(premise).upper(),
        "district": str(district).zfill(3),
        "community_area": str(community_area),
        "hour": int(hour),
        "day_of_week": str(day_of_week).title(),
        "month": int(month),
        "is_weekend": 1 if is_weekend else 0,
        "is_domestic": 1 if is_domestic else 0
    }])

    input_encoded = preprocessor.transform(input_df)

    pred_class_id = int(dt.predict(input_encoded)[0])
    probs = dt.predict_proba(input_encoded)[0]

    predicted_label = "ARREST MADE (YES)" if pred_class_id == 1 else "NO ARREST (NO)"
    prob_no = round(float(probs[0] * 100), 1)
    prob_yes = round(float(probs[1] * 100), 1)

    schema = get_schema_for_dataset(dataset)
    disclaimer = (
        "EDUCATIONAL MODEL ESTIMATE — This estimate is produced by an academic Decision Tree classifier trained on historical warehouse data. "
        "It DOES NOT predict real-world outcomes or authorize law enforcement action."
    )

    return {
        "status": "SUCCESS",
        "input": input_df.to_dict(orient="records")[0],
        "prediction": {
            "predicted_class_id": pred_class_id,
            "predicted_label": predicted_label,
            "prob_arrest_no": prob_no,
            "prob_arrest_yes": prob_yes,
            "confidence": max(prob_no, prob_yes)
        },
        "disclaimer": disclaimer
    }


def get_decision_tree_explanation_metadata() -> Dict[str, Any]:
    """
    Returns educational theory documentation for Decision Tree Machine Learning.
    """
    return {
        "title": "Decision Tree Classification & Supervised Machine Learning",
        "concepts": [
            {
                "term": "Decision Tree Classifier",
                "definition": "A supervised machine learning model that recursively partitions input space into orthogonal hyperplanes based on decision rules to optimize target class purity."
            },
            {
                "term": "Gini Impurity",
                "formula": "Gini = 1 - \\sum_{i=1}^{C} p_i^2",
                "definition": "Measures the probability of misclassifying a randomly chosen element if it were randomly labeled according to the distribution of targets in a node."
            },
            {
                "term": "Entropy & Information Gain",
                "formula": "Entropy = -\\sum_{i=1}^{C} p_i \\log_2(p_i)",
                "definition": "Information Gain measures the reduction in entropy achieved by splitting dataset $D$ on feature $A$."
            },
            {
                "term": "Overfitting & Pruning",
                "definition": "When a tree grows excessively deep, it memorizes noise in the training set, causing training accuracy to approach 100% while testing accuracy degrades. Controlling max_depth prunes the tree for optimal generalization."
            },
            {
                "term": "Precision vs. Recall vs. F1-Score",
                "definition": "Precision = TP / (TP + FP) measures exactness. Recall = TP / (TP + FN) measures completeness. F1-Score is the harmonic mean balancing both."
            },
            {
                "term": "Confusion Matrix",
                "definition": "A 2x2 contingency table tabulating True Negatives (TN), False Positives (FP), False Negatives (FN), and True Positives (TP) against ground-truth test labels."
            }
        ],
        "comparison_with_other_phases": (
            "Phase 7/8 DBSCAN performs unsupervised spatial density clustering on lat/long coordinates. "
            "Phase 9 K-Means clusters geographic areas using continuous feature vectors. "
            "Phase 10 Apriori extracts frequent categorical co-occurrence rules. "
            "Phase 11 Decision Tree trains a supervised predictive model to classify a target variable (Arrest) using non-leaking features."
        )
    }
